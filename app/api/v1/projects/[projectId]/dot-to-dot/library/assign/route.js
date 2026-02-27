import { saveDotToDotAssignments } from "@/app/api/v1/_runtime/line-art-store.js";

export const runtime = "nodejs";

export async function POST(request, { params }) {
  const resolvedParams = await params;
  const projectId = String(resolvedParams?.projectId || "").trim();
  if (!projectId) {
    return Response.json({ code: "invalid_project_id", message: "projectId is required." }, { status: 400 });
  }

  try {
    const body = await request.json();
    const assignments = Array.isArray(body?.assignments) ? body.assignments : [];
    if (!assignments.length) {
      return Response.json(
        { code: "invalid_payload", message: "assignments must be a non-empty array." },
        { status: 400 }
      );
    }
    const result = await saveDotToDotAssignments(projectId, assignments, body?.strict);
    return Response.json({
      message: `Applied ${result.count} dot-to-dot library assignment(s).`
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      {
        code: "dot_to_dot_assign_failed",
        message
      },
      { status: message.includes("must be a valid UUID") ? 400 : 500 }
    );
  }
}
