import { bulkCreateLineArtAssets } from "@/app/api/v1/_runtime/line-art-store.js";

export const runtime = "nodejs";

export async function POST(request, { params }) {
  const projectId = String(params?.projectId || "").trim();
  if (!projectId) {
    return Response.json({ code: "invalid_project_id", message: "projectId is required." }, { status: 400 });
  }

  try {
    const body = await request.json();
    const files = Array.isArray(body?.files) ? body.files : [];
    if (!files.length) {
      return Response.json({ code: "invalid_payload", message: "files is required and must be non-empty." }, { status: 400 });
    }

    const result = await bulkCreateLineArtAssets(projectId, files);
    return Response.json(
      {
        accepted: result.accepted.length,
        rejected: result.errors.length,
        items: result.accepted,
        errors: result.errors,
        job: result.job
      },
      { status: 202 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      {
        code: "bulk_upload_failed",
        message
      },
      { status: message.includes("must be a valid UUID") ? 400 : 500 }
    );
  }
}
