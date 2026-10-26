
import { db } from "../config/db";

type Direction = "NORTHBOUND" | "SOUTHBOUND";

interface CreateRouteTemplateInput {
  name: string;
  direction: Direction;
  checkpoints: string[];
}

interface UpdateRouteTemplateInput {
  name?: string;
  checkpoints?: string[];
  is_active?: boolean;
}

function normalizeCheckpoints(checkpoints: string[]): string[] {
  if (!Array.isArray(checkpoints)) {
    throw new Error("Route checkpoints must be provided as a list");
  }

  const cleaned = checkpoints.map((checkpoint) =>
    typeof checkpoint === "string"
      ? checkpoint.trim().replace(/\s+/g, " ")
      : ""
  );

  if (cleaned.some((checkpoint) => checkpoint.length < 2)) {
    throw new Error(
      "Each checkpoint must contain at least two characters"
    );
  }

  if (cleaned.length < 2) {
    throw new Error("A route must have at least two checkpoints");
  }

  const normalized = cleaned.map((checkpoint) =>
    checkpoint.toLocaleLowerCase()
  );

  if (new Set(normalized).size !== normalized.length) {
    throw new Error(
      "A route cannot contain duplicate checkpoints"
    );
  }

  return cleaned;
}

function normalizeName(name: string): string {
  const cleaned = name.trim().replace(/\s+/g, " ");

  if (cleaned.length < 2) {
    throw new Error(
      "Route template name must contain at least two characters"
    );
  }

  return cleaned;
}

export async function listRouteTemplates(tenantId: string) {
  const result = await db.query(
    `
    SELECT
      id,
      name,
      direction,
      checkpoints,
      is_active,
      created_at,
      updated_at
    FROM public.route_templates
    WHERE tenant_id = $1::uuid
    ORDER BY direction, name
    `,
    [tenantId]
  );

  return result.rows;
}

export async function createRouteTemplate(
  tenantId: string,
  input: CreateRouteTemplateInput
) {
  const name = normalizeName(input.name);
  const checkpoints = normalizeCheckpoints(input.checkpoints);

  if (
    input.direction !== "NORTHBOUND" &&
    input.direction !== "SOUTHBOUND"
  ) {
    throw new Error("Invalid route direction");
  }

  const result = await db.query(
    `
    INSERT INTO public.route_templates (
      tenant_id,
      name,
      direction,
      checkpoints
    )
    VALUES ($1::uuid, $2, $3, $4::jsonb)
    RETURNING
      id,
      name,
      direction,
      checkpoints,
      is_active,
      created_at,
      updated_at
    `,
    [
      tenantId,
      name,
      input.direction,
      JSON.stringify(checkpoints)
    ]
  );

  return result.rows[0];
}

export async function updateRouteTemplate(
  tenantId: string,
  templateId: string,
  input: UpdateRouteTemplateInput
) {
  if (
    input.name === undefined &&
    input.checkpoints === undefined &&
    input.is_active === undefined
  ) {
    throw new Error(
      "Provide at least one field to update"
    );
  }

  const name =
    input.name !== undefined
      ? normalizeName(input.name)
      : null;

  const checkpoints =
    input.checkpoints !== undefined
      ? JSON.stringify(
          normalizeCheckpoints(input.checkpoints)
        )
      : null;

  const result = await db.query(
    `
    UPDATE public.route_templates
    SET
      name = COALESCE($3, name),
      checkpoints = COALESCE($4::jsonb, checkpoints),
      is_active = COALESCE($5, is_active),
      updated_at = NOW()
    WHERE id = $1::uuid
      AND tenant_id = $2::uuid
    RETURNING
      id,
      name,
      direction,
      checkpoints,
      is_active,
      created_at,
      updated_at
    `,
    [
      templateId,
      tenantId,
      name,
      checkpoints,
      input.is_active ?? null
    ]
  );

  if (!result.rows[0]) {
    throw new Error("Route template not found");
  }

  // Updating a template does not update existing batches.
  // Their saved checkpoint_snapshot remains the source of
  // truth for the journeys already assigned to those batches.
  return result.rows[0];
}

export async function archiveRouteTemplate(
  tenantId: string,
  templateId: string
) {
  const result = await db.query(
    `
    UPDATE public.route_templates
    SET
      is_active = FALSE,
      updated_at = NOW()
    WHERE id = $1::uuid
      AND tenant_id = $2::uuid
    RETURNING
      id,
      name,
      direction,
      checkpoints,
      is_active
    `,
    [templateId, tenantId]
  );

  if (!result.rows[0]) {
    throw new Error("Route template not found");
  }

  return result.rows[0];
}
