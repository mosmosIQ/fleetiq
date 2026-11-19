import { db } from "../config/db";

export const TRUCK_DOCUMENT_TYPES = ["TRUCK_INSURANCE"] as const;

const FILE_PATTERN =
  /^data:(image\/(?:jpeg|jpg|png|webp)|application\/pdf);base64,/i;

export async function listTruckDocuments(tenantId: string) {
  const result = await db.query(
    `
    SELECT
      tr.id,
      tr.plate_number,
      tr.truck_type,
      tr.status,
      tr.insurance_number,
      tr.insurance_expiry_date,
      COALESCE(docs.documents, '[]'::json) AS documents
    FROM trucks tr
    LEFT JOIN LATERAL (
      SELECT json_agg(x) AS documents
      FROM (
        SELECT DISTINCT ON (doc.document_type)
          doc.id,
          doc.document_type,
          doc.file_name,
          doc.created_at,
          SUBSTRING(doc.file_url FROM '^data:([^;]+);') AS mime_type
        FROM documents doc
        WHERE doc.truck_id = tr.id
          AND doc.tenant_id = tr.tenant_id
          AND doc.document_type = ANY($2::text[])
          AND doc.file_url IS NOT NULL
        ORDER BY doc.document_type, doc.created_at DESC
      ) x
    ) docs ON true
    WHERE tr.tenant_id = $1::uuid
    ORDER BY tr.plate_number ASC
    `,
    [tenantId, TRUCK_DOCUMENT_TYPES as unknown as string[]]
  );

  return result.rows;
}

export async function updateTruckInsuranceDetails(
  tenantId: string,
  truckId: string,
  input: { insurance_number?: string; insurance_expiry_date?: string }
) {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const result = await client.query(
      `
      UPDATE trucks
      SET
        insurance_number = CASE WHEN $3::boolean THEN $4 ELSE insurance_number END,
        insurance_expiry_date = CASE WHEN $5::boolean THEN $6::date ELSE insurance_expiry_date END,
        updated_at = NOW()
      WHERE id = $1::uuid
        AND tenant_id = $2::uuid
      RETURNING id, insurance_number, insurance_expiry_date
      `,
      [
        truckId,
        tenantId,
        input.insurance_number !== undefined,
        input.insurance_number?.trim() || null,
        input.insurance_expiry_date !== undefined,
        input.insurance_expiry_date || null
      ]
    );

    if (!result.rows[0]) {
      throw new Error("Truck not found.");
    }

    // Keep the stored copy's expiry date in step with the truck's.
    if (input.insurance_expiry_date !== undefined) {
      await client.query(
        `
        UPDATE documents
        SET expiry_date = $3::date
        WHERE truck_id = $1::uuid
          AND tenant_id = $2::uuid
          AND document_type = 'TRUCK_INSURANCE'
        `,
        [truckId, tenantId, input.insurance_expiry_date || null]
      );
    }

    await client.query("COMMIT");

    return result.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function uploadTruckDocument(
  tenantId: string,
  truckId: string,
  documentType: string,
  input: { file_data: string; file_name?: string }
) {
  if (!TRUCK_DOCUMENT_TYPES.includes(documentType as "TRUCK_INSURANCE")) {
    throw new Error("Invalid document type.");
  }

  if (!FILE_PATTERN.test(input.file_data)) {
    throw new Error("Upload a JPG, PNG, WEBP image or a PDF file.");
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const truckResult = await client.query(
      `
      SELECT insurance_expiry_date
      FROM trucks
      WHERE id = $1::uuid
        AND tenant_id = $2::uuid
      LIMIT 1
      `,
      [truckId, tenantId]
    );

    const truck = truckResult.rows[0];

    if (!truck) {
      throw new Error("Truck not found.");
    }

    const inserted = await client.query(
      `
      INSERT INTO documents (
        tenant_id,
        truck_id,
        document_type,
        file_url,
        file_name,
        expiry_date
      )
      VALUES ($1::uuid, $2::uuid, $3, $4, $5, $6)
      RETURNING id
      `,
      [
        tenantId,
        truckId,
        documentType,
        input.file_data,
        input.file_name?.trim().slice(0, 255) || null,
        truck.insurance_expiry_date
      ]
    );

    await client.query(
      `
      DELETE FROM documents
      WHERE truck_id = $1::uuid
        AND tenant_id = $2::uuid
        AND document_type = $3
        AND id <> $4::uuid
      `,
      [truckId, tenantId, documentType, inserted.rows[0].id]
    );

    await client.query("COMMIT");

    return { id: inserted.rows[0].id };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function getTruckDocumentFile(
  tenantId: string,
  documentId: string
) {
  const result = await db.query(
    `
    SELECT id, document_type, file_name, file_url
    FROM documents
    WHERE id = $1::uuid
      AND tenant_id = $2::uuid
      AND truck_id IS NOT NULL
      AND document_type = ANY($3::text[])
    LIMIT 1
    `,
    [documentId, tenantId, TRUCK_DOCUMENT_TYPES as unknown as string[]]
  );

  if (!result.rows[0]) {
    throw new Error("Document not found.");
  }

  return result.rows[0];
}

export async function deleteTruckDocument(
  tenantId: string,
  documentId: string
) {
  const result = await db.query(
    `
    DELETE FROM documents
    WHERE id = $1::uuid
      AND tenant_id = $2::uuid
      AND truck_id IS NOT NULL
      AND document_type = ANY($3::text[])
    RETURNING id
    `,
    [documentId, tenantId, TRUCK_DOCUMENT_TYPES as unknown as string[]]
  );

  if (!result.rows[0]) {
    throw new Error("Document not found.");
  }
}
