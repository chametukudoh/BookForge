const DEFAULT_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "/api/v1";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DEFAULT_PROJECT_ID = "00000000-0000-4000-8000-000000000001";
const DEFAULT_WORDSEARCH_PAGE_ID = "00000000-0000-4000-8000-000000000101";
const DEFAULT_MAZE_PAGE_ID = "00000000-0000-4000-8000-000000000201";

function resolveUuidOrFallback(value, fallback) {
  const normalized = String(value || "").trim();
  return UUID_PATTERN.test(normalized) ? normalized : fallback;
}

const defaultContext = {
  projectId: resolveUuidOrFallback(process.env.NEXT_PUBLIC_PROJECT_ID, DEFAULT_PROJECT_ID),
  wordSearchPageId:
    resolveUuidOrFallback(process.env.NEXT_PUBLIC_WORDSEARCH_PAGE_ID, DEFAULT_WORDSEARCH_PAGE_ID),
  mazePageId: resolveUuidOrFallback(process.env.NEXT_PUBLIC_MAZE_PAGE_ID, DEFAULT_MAZE_PAGE_ID)
};

function buildHeaders(extraHeaders = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...extraHeaders
  };
  const token = process.env.NEXT_PUBLIC_API_BEARER_TOKEN;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function normalizePath(baseUrl, path) {
  const normalizedBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  return `${normalizedBase}${path}`;
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }
  const text = await response.text();
  return text ? { message: text } : null;
}

async function request(baseUrl, path, { method = "GET", body } = {}) {
  try {
    const response = await fetch(normalizePath(baseUrl, path), {
      method,
      headers: buildHeaders(),
      body: body ? JSON.stringify(body) : undefined
    });
    const data = await parseResponse(response);
    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        data: null,
        error: data?.message || `HTTP ${response.status}`
      };
    }
    return { ok: true, status: response.status, data, error: null };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      data: null,
      error: error instanceof Error ? error.message : "Network error"
    };
  }
}

export function createBookforgeApi(customContext = {}) {
  const context = {
    ...defaultContext,
    ...customContext,
    projectId: resolveUuidOrFallback(customContext.projectId, defaultContext.projectId),
    wordSearchPageId: resolveUuidOrFallback(customContext.wordSearchPageId, defaultContext.wordSearchPageId),
    mazePageId: resolveUuidOrFallback(customContext.mazePageId, defaultContext.mazePageId)
  };
  const baseUrl = DEFAULT_API_BASE_URL;

  return {
    context,
    get projectId() {
      return context.projectId;
    },
    async generateWordSearch(payload) {
      return request(baseUrl, `/projects/${context.projectId}/pages/${context.wordSearchPageId}/word-search/generate`, {
        method: "POST",
        body: payload
      });
    },
    async patchWordSearchCells(payload) {
      return request(baseUrl, `/projects/${context.projectId}/pages/${context.wordSearchPageId}/word-search/cells`, {
        method: "PATCH",
        body: payload
      });
    },
    async addWordSearchWord(payload) {
      return request(baseUrl, `/projects/${context.projectId}/pages/${context.wordSearchPageId}/word-search/words`, {
        method: "POST",
        body: payload
      });
    },
    async validateWordSearch() {
      return request(baseUrl, `/projects/${context.projectId}/pages/${context.wordSearchPageId}/word-search/validate`, {
        method: "POST"
      });
    },
    async generateMaze(payload) {
      return request(baseUrl, `/projects/${context.projectId}/pages/${context.mazePageId}/maze/generate`, {
        method: "POST",
        body: payload
      });
    },
    async patchMazeWalls(payload) {
      return request(baseUrl, `/projects/${context.projectId}/pages/${context.mazePageId}/maze/walls`, {
        method: "PATCH",
        body: payload
      });
    },
    async patchMazeTerminals(payload) {
      return request(baseUrl, `/projects/${context.projectId}/pages/${context.mazePageId}/maze/terminals`, {
        method: "PATCH",
        body: payload
      });
    },
    async solveMaze() {
      return request(baseUrl, `/projects/${context.projectId}/pages/${context.mazePageId}/maze/solve`, {
        method: "POST"
      });
    },
    async validateMaze() {
      return request(baseUrl, `/projects/${context.projectId}/pages/${context.mazePageId}/maze/validate`, {
        method: "POST"
      });
    },
    async planDotMarkerSuite(payload) {
      return request(baseUrl, `/projects/${context.projectId}/pages/plan`, {
        method: "POST",
        body: payload
      });
    },
    async bulkUploadLineArt(payload) {
      return request(baseUrl, `/projects/${context.projectId}/line-art/bulk-upload`, {
        method: "POST",
        body: payload
      });
    },
    async listLineArt(params = {}) {
      const query = new URLSearchParams();
      if (params.status) query.set("status", String(params.status));
      if (params.collectionId) query.set("collection_id", String(params.collectionId));
      if (params.tag) query.set("tag", String(params.tag));
      if (typeof params.limit === "number") query.set("limit", String(params.limit));
      if (params.cursor) query.set("cursor", String(params.cursor));
      const suffix = query.toString() ? `?${query.toString()}` : "";
      return request(baseUrl, `/projects/${context.projectId}/line-art${suffix}`, { method: "GET" });
    },
    async reprocessLineArt(assetId, payload = {}) {
      return request(baseUrl, `/projects/${context.projectId}/line-art/${assetId}/reprocess`, {
        method: "POST",
        body: payload
      });
    },
    async generateDotToDotSuite(payload) {
      return request(baseUrl, `/projects/${context.projectId}/dot-to-dot/generate`, {
        method: "POST",
        body: payload
      });
    },
    async assignDotToDotLibrary(payload) {
      return request(baseUrl, `/projects/${context.projectId}/dot-to-dot/library/assign`, {
        method: "POST",
        body: payload
      });
    },
    async runProjectQc() {
      return request(baseUrl, `/projects/${context.projectId}/qc/run`, { method: "POST" });
    },
    async listProjectQc() {
      return request(baseUrl, `/projects/${context.projectId}/qc`, { method: "GET" });
    },
    async createExport(payload) {
      return request(baseUrl, `/projects/${context.projectId}/exports`, {
        method: "POST",
        body: payload
      });
    }
  };
}
