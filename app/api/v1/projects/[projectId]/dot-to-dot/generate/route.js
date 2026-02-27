import { queueDotToDotGenerate } from "@/app/api/v1/_runtime/line-art-store.js";

export const runtime = "nodejs";

export async function POST(request, { params }) {
  const resolvedParams = await params;
  const projectId = String(resolvedParams?.projectId || "").trim();
  if (!projectId) {
    return Response.json({ code: "invalid_project_id", message: "projectId is required." }, { status: 400 });
  }

  try {
    const body = await request.json();
    const pageCount = Number(body?.page_count);
    const sourceMode = String(body?.source_mode || "").trim();
    const difficulty = String(body?.difficulty || "").trim();
    const trimId = String(body?.trim_id || "").trim();
    if (!sourceMode || !difficulty || !trimId || !Number.isFinite(pageCount) || pageCount < 1) {
      return Response.json(
        {
          code: "invalid_payload",
          message: "source_mode, page_count, difficulty and trim_id are required."
        },
        { status: 400 }
      );
    }
    const job = await queueDotToDotGenerate(projectId, body);
    return Response.json(job, { status: 202 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      {
        code: "dot_to_dot_generate_failed",
        message
      },
      { status: message.includes("must be a valid UUID") ? 400 : 500 }
    );
  }
}
