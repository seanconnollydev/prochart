import { getBuiltinAssessmentTemplate } from "@/lib/assessments/builtin";
import {
  FillFromTranscriptError,
  fillAssessmentFromTranscript,
} from "@/lib/assessments/fill-from-transcript";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

type Body = {
  templateId?: unknown;
  transcript?: unknown;
};

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const templateId =
    typeof body.templateId === "string" ? body.templateId.trim() : "";
  const transcript =
    typeof body.transcript === "string" ? body.transcript : "";

  if (!templateId) {
    return NextResponse.json(
      { error: "templateId is required." },
      { status: 400 },
    );
  }
  if (!transcript.trim()) {
    return NextResponse.json(
      { error: "transcript is required." },
      { status: 400 },
    );
  }

  const template = getBuiltinAssessmentTemplate(templateId);
  if (!template) {
    return NextResponse.json(
      { error: "Assessment template not found." },
      { status: 404 },
    );
  }

  try {
    const responses = await fillAssessmentFromTranscript({
      template,
      transcript,
    });
    return NextResponse.json({ responses });
  } catch (err) {
    if (err instanceof FillFromTranscriptError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status },
      );
    }
    return NextResponse.json(
      { error: "Could not fill assessment from transcript." },
      { status: 500 },
    );
  }
}
