import { db } from "../config/db";

export const DRIVER_DOCUMENT_TYPES = [
  "PASSPORT",
  "LICENSE",
  "CHEMICAL_CERTIFICATE",
  "DRIVER_CERTIFICATE"
] as const;

export type DriverDocumentType = (typeof DRIVER_DOCUMENT_TYPES)[number];

const FILE_PATTERN =
  /^data:(image\/(?:jpeg|jpg|png|webp)|application\/pdf);base64,/i;

export async function listDriverDocuments(tenantId: string) {
  const result = await db.query(
    `
    SELECT
      d.id,
      d.full_name,
      d.phone_number,
      d.is_active,
      d.passport_number,
      d.license_number,
      d.license_expiry_date,
      d.chemical_certificate_number,
      d.chemical_certificate_expiry_date,
      COALESCE(docs.documents, '[]'::json) AS documents
    FROM drivers d
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
        WHERE doc.driver_id = d.id
          AND doc.tenant_id = d.tenant_id
          AND doc.document_type = ANY($2::text[])
          AND doc.file_url IS NOT NULL
        ORDER BY doc.document_type, doc.created_at DESC
      ) x
    ) docs ON true
    WHERE d.tenant_id = $1::uuid
    ORDER BY d.full_name ASC
    `,
    [tenantId, DRIVER_DOCUMENT_TYPES as unknown as string[]]
  );

  return result.rows;
}

export async function uploadDriverDocument(
  tenantId: string,
  driverId: string,
  documentType: string,
  input: { file_data: string; file_name?: string }
) {
  if (!DRIVER_DOCUMENT_TYPES.includes(documentType as DriverDocumentType)) {
    throw new Error("Invalid document type.");
  }

  if (!FILE_PATTERN.test(input.file_data)) {
    throw new Error("Upload a JPG, PNG, WEBP image or a PDF file.");
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const driverResult = await client.query(
      `
      SELECT
        license_expiry_date,
        chemical_certificate_expiry_date
      FROM drivers
      WHERE id = $1::uuid
        AND tenant_id = $2::uuid
      LIMIT 1
      `,
      [driverId, tenantId]
    );

    const driver = driverResult.rows[0];

    if (!driver) {
      throw new Error("Driver not found.");
    }

    const expiry =
      documentType === "LICENSE"
        ? driver.license_expiry_date
        : documentType === "CHEMICAL_CERTIFICATE"
        ? driver.chemical_certificate_expiry_date
        : null;

    const inserted = await client.query(
      `
      INSERT INTO documents (
        tenant_id,
        driver_id,
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
        driverId,
        documentType,
        input.file_data,
        input.file_name?.trim().slice(0, 255) || null,
        expiry
      ]
    );

    // Keep only the latest file of each type for a driver.
    await client.query(
      `
      DELETE FROM documents
      WHERE driver_id = $1::uuid
        AND tenant_id = $2::uuid
        AND document_type = $3
        AND id <> $4::uuid
      `,
      [driverId, tenantId, documentType, inserted.rows[0].id]
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

export async function getDriverDocumentFile(
  tenantId: string,
  documentId: string
) {
  const result = await db.query(
    `
    SELECT id, document_type, file_name, file_url
    FROM documents
    WHERE id = $1::uuid
      AND tenant_id = $2::uuid
      AND driver_id IS NOT NULL
      AND document_type = ANY($3::text[])
    LIMIT 1
    `,
    [documentId, tenantId, DRIVER_DOCUMENT_TYPES as unknown as string[]]
  );

  if (!result.rows[0]) {
    throw new Error("Document not found.");
  }

  return result.rows[0];
}

export async function deleteDriverDocument(
  tenantId: string,
  documentId: string
) {
  const result = await db.query(
    `
    DELETE FROM documents
    WHERE id = $1::uuid
      AND tenant_id = $2::uuid
      AND driver_id IS NOT NULL
      AND document_type = ANY($3::text[])
    RETURNING id
    `,
    [documentId, tenantId, DRIVER_DOCUMENT_TYPES as unknown as string[]]
  );

  if (!result.rows[0]) {
    throw new Error("Document not found.");
  }
}
