import { listLineArtAssets } from "@/app/api/v1/_runtime/line-art-store.js";

export const runtime = "nodejs";

export async function GET(request, { params }) {
  const resolvedParams = await params;
  const projectId = String(resolvedParams?.projectId || "").trim();
  if (!projectId) {
    return Response.json({ code: "invalid_project_id", message: "projectId is required." }, { status: 400 });
  }

  try {
    const url = new URL(request.url);
    const result = await listLineArtAssets(projectId, {
      status: url.searchParams.get("status") || "",
      collection_id: url.searchParams.get("collection_id") || "",
      tag: url.searchParams.get("tag") || "",
      limit: Number(url.searchParams.get("limit") || 50)
    });
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      {
        code: "line_art_list_failed",
        message
      },
      { status: message.includes("must be a valid UUID") ? 400 : 500 }
    );
  }
}
