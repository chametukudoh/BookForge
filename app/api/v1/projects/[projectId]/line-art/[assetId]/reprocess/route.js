import { reprocessLineArtAsset } from "@/app/api/v1/_runtime/line-art-store.js";

export const runtime = "nodejs";

export async function POST(request, { params }) {
  const resolvedParams = await params;
  const projectId = String(resolvedParams?.projectId || "").trim();
  const assetId = String(resolvedParams?.assetId || "").trim();
  if (!projectId || !assetId) {
    return Response.json({ code: "invalid_path_params", message: "projectId and assetId are required." }, { status: 400 });
  }

  try {
    const payload = await request.json().catch(() => ({}));
    const job = await reprocessLineArtAsset(projectId, assetId, payload);
    if (!job) {
      return Response.json({ code: "asset_not_found", message: "Line-art asset not found." }, { status: 404 });
    }
    return Response.json(job, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      {
        code: "line_art_reprocess_failed",
        message
      },
      { status: message.includes("must be a valid UUID") ? 400 : 500 }
    );
  }
}
