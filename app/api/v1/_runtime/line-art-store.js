const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const SUPABASE_URL =
  process.env.SUPABASE_PROJECT_URL ||
  process.env.SUPABASE_Project_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "";

const SYSTEM_USER_ID =
  process.env.SUPABASE_SYSTEM_USER_ID || "00000000-0000-4000-8000-000000000001";

function nowIso() {
  return new Date().toISOString();
}

function assertSupabaseConfigured() {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error(
      "Supabase config missing. Set SUPABASE_PROJECT_URL/SUPABASE_Project_URL and SUPABASE_SERVICE_ROLE_KEY."
    );
  }
}

function assertUuid(value, fieldName) {
  if (!UUID_PATTERN.test(String(value || ""))) {
    throw new Error(`${fieldName} must be a valid UUID.`);
  }
}

function makeRestUrl(table, query = {}) {
  const normalized = SUPABASE_URL.endsWith("/")
    ? SUPABASE_URL.slice(0, -1)
    : SUPABASE_URL;
  const url = new URL(`${normalized}/rest/v1/${table}`);
  Object.entries(query).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    url.searchParams.set(key, String(value));
  });
  return url;
}

async function restRequest(table, { method = "GET", query, body, prefer } = {}) {
  assertSupabaseConfigured();
  const url = makeRestUrl(table, query);
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    "Content-Type": "application/json"
  };
  if (prefer) headers.Prefer = prefer;

  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    cache: "no-store"
  });
  const raw = await response.text();
  let parsed = null;
  try {
    parsed = raw ? JSON.parse(raw) : null;
  } catch {
    parsed = raw || null;
  }

  if (!response.ok) {
    const detail =
      parsed?.message ||
      parsed?.error_description ||
      parsed?.error ||
      raw ||
      `Supabase request failed (${response.status})`;
    throw new Error(detail);
  }
  return parsed;
}

async function ensureProject(projectId) {
  assertUuid(projectId, "projectId");
  assertUuid(SYSTEM_USER_ID, "SUPABASE_SYSTEM_USER_ID");

  const ownerEmail = `system+${SYSTEM_USER_ID.slice(0, 8)}@bookforge.local`;
  await restRequest("users", {
    method: "POST",
    query: { on_conflict: "id", select: "id,email" },
    body: [{ id: SYSTEM_USER_ID, email: ownerEmail }],
    prefer: "resolution=merge-duplicates,return=representation"
  });

  await restRequest("projects", {
    method: "POST",
    query: { on_conflict: "id", select: "id,title,owner_id" },
    body: [
      {
        id: projectId,
        owner_id: SYSTEM_USER_ID,
        title: `Project ${projectId.slice(0, 8)}`,
        status: "draft",
        style_mode: "GLOBAL",
        settings_json: {}
      }
    ],
    prefer: "resolution=merge-duplicates,return=representation"
  });
}

async function insertJob(projectId, payload, type = "generate") {
  const rows = await restRequest("jobs", {
    method: "POST",
    query: { select: "*" },
    body: [
      {
        id: crypto.randomUUID(),
        project_id: projectId,
        type,
        status: "queued",
        payload_json: payload || {}
      }
    ],
    prefer: "return=representation"
  });
  return Array.isArray(rows) ? rows[0] : null;
}

async function ensureDotToDotPage(projectId, assignment) {
  if (assignment?.page_id) {
    assertUuid(assignment.page_id, "page_id");
    const rows = await restRequest("pages", {
      method: "GET",
      query: {
        id: `eq.${assignment.page_id}`,
        project_id: `eq.${projectId}`,
        select: "id,page_number,type",
        limit: 1
      }
    });
    return Array.isArray(rows) && rows.length ? rows[0] : null;
  }

  const pageNumber = Number(assignment?.page_number);
  if (!Number.isFinite(pageNumber) || pageNumber <= 0) return null;

  const existing = await restRequest("pages", {
    method: "GET",
    query: {
      project_id: `eq.${projectId}`,
      page_number: `eq.${pageNumber}`,
      type: "eq.dot_to_dot",
      select: "id,page_number,type",
      limit: 1
    }
  });
  if (Array.isArray(existing) && existing.length) return existing[0];

  const inserted = await restRequest("pages", {
    method: "POST",
    query: { select: "id,page_number,type" },
    body: [
      {
        id: crypto.randomUUID(),
        project_id: projectId,
        page_number: pageNumber,
        type: "dot_to_dot",
        config_json: {},
        qc_state: "pending"
      }
    ],
    prefer: "return=representation"
  });
  return Array.isArray(inserted) ? inserted[0] : null;
}

export async function bulkCreateLineArtAssets(projectId, files = []) {
  await ensureProject(projectId);

  const acceptedRows = [];
  const errors = [];
  files.forEach((file, index) => {
    const filename = String(file?.filename || "").trim();
    const mimeType = String(file?.mime_type || "").trim().toLowerCase();
    const sizeBytes = Number(file?.size_bytes) || 0;
    if (!filename || !mimeType || sizeBytes <= 0) {
      errors.push({ index, filename: filename || `file-${index + 1}`, reason: "invalid_file_metadata" });
      return;
    }
    if (!mimeType.startsWith("image/")) {
      errors.push({ index, filename, reason: "unsupported_mime_type" });
      return;
    }
    acceptedRows.push({
      id: crypto.randomUUID(),
      project_id: projectId,
      collection_id: file?.collection_id || null,
      source_filename: filename,
      mime_type: mimeType,
      tags: Array.isArray(file?.tags) ? file.tags.map((tag) => String(tag)) : [],
      status: "uploaded",
      metadata_json: { size_bytes: sizeBytes },
      diagnostics_json: {}
    });
  });

  let insertedAssets = [];
  if (acceptedRows.length) {
    insertedAssets = await restRequest("line_art_assets", {
      method: "POST",
      query: { select: "*" },
      body: acceptedRows,
      prefer: "return=representation"
    });
    const processingRows = insertedAssets.map((asset) => ({
      id: crypto.randomUUID(),
      project_id: projectId,
      line_art_asset_id: asset.id,
      status: "queued",
      stage: "ingest",
      attempt: 1
    }));
    await restRequest("line_art_processing", {
      method: "POST",
      query: { select: "id" },
      body: processingRows,
      prefer: "return=representation"
    });
  }

  const job = acceptedRows.length
    ? await insertJob(projectId, {
        mode: "line_art_bulk_ingest",
        asset_ids: insertedAssets.map((asset) => asset.id)
      })
    : null;

  return {
    accepted: insertedAssets,
    errors,
    job
  };
}

export async function listLineArtAssets(projectId, filters = {}) {
  await ensureProject(projectId);

  const limit = Math.max(1, Math.min(500, Number(filters.limit) || 50));
  const query = {
    project_id: `eq.${projectId}`,
    order: "created_at.desc",
    limit,
    select: "*"
  };
  if (filters.status) query.status = `eq.${filters.status}`;
  if (filters.collection_id) query.collection_id = `eq.${filters.collection_id}`;
  if (filters.tag) query.tags = `cs.{${String(filters.tag)}}`;

  const items = await restRequest("line_art_assets", { method: "GET", query });
  return {
    items: Array.isArray(items) ? items : [],
    next_cursor: null
  };
}

export async function reprocessLineArtAsset(projectId, assetId, payload = {}) {
  await ensureProject(projectId);
  assertUuid(assetId, "assetId");

  const rows = await restRequest("line_art_assets", {
    method: "PATCH",
    query: {
      id: `eq.${assetId}`,
      project_id: `eq.${projectId}`,
      select: "*"
    },
    body: {
      status: "processing"
    },
    prefer: "return=representation"
  });
  if (!Array.isArray(rows) || !rows.length) return null;

  await restRequest("line_art_processing", {
    method: "POST",
    query: { select: "id" },
    body: [
      {
        id: crypto.randomUUID(),
        project_id: projectId,
        line_art_asset_id: assetId,
        status: "queued",
        stage: payload?.stage || "ingest",
        attempt: 1
      }
    ],
    prefer: "return=representation"
  });

  return insertJob(projectId, {
    mode: "line_art_reprocess",
    asset_id: assetId,
    force: Boolean(payload?.force),
    stage: payload?.stage || "ingest"
  });
}

export async function queueDotToDotGenerate(projectId, payload = {}) {
  await ensureProject(projectId);
  return insertJob(
    projectId,
    {
      mode: "dot_to_dot_generate",
      ...payload
    },
    "generate"
  );
}

export async function saveDotToDotAssignments(projectId, assignments = [], strict = false) {
  await ensureProject(projectId);
  let count = 0;

  for (const assignment of assignments) {
    const sourceAssetId = String(assignment?.source_asset_id || "");
    if (!UUID_PATTERN.test(sourceAssetId)) continue;

    const sourceAssetRows = await restRequest("line_art_assets", {
      method: "GET",
      query: {
        id: `eq.${sourceAssetId}`,
        project_id: `eq.${projectId}`,
        select: "id,status",
        limit: 1
      }
    });
    if (!Array.isArray(sourceAssetRows) || !sourceAssetRows.length) continue;

    const page = await ensureDotToDotPage(projectId, assignment);
    if (!page?.id) continue;

    await restRequest("pages", {
      method: "PATCH",
      query: {
        id: `eq.${page.id}`,
        project_id: `eq.${projectId}`,
        select: "id"
      },
      body: {
        source_mode: "bulk_library",
        source_asset_id: sourceAssetId,
        recipe_json: {
          assignment_source: "library",
          strict: Boolean(strict),
          assigned_at: nowIso()
        }
      },
      prefer: "return=representation"
    });

    await restRequest("dot_to_dot_page_state", {
      method: "POST",
      query: {
        on_conflict: "page_id",
        select: "page_id"
      },
      body: [
        {
          page_id: page.id,
          source_mode: "bulk_library",
          source_asset_id: sourceAssetId,
          recipe_json: {
            assignment_source: "library",
            strict: Boolean(strict),
            assigned_at: nowIso()
          }
        }
      ],
      prefer: "resolution=merge-duplicates,return=representation"
    });

    count += 1;
  }

  return { count };
}
