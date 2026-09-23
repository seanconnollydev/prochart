import { buildFillFromTranscriptQuestions } from "@/lib/assessments/fill-from-transcript/build-questions";
import {
  mapAnswersToResponses,
  type FillFromTranscriptAnswerMap,
} from "@/lib/assessments/fill-from-transcript/map-answers";
import type { AssessmentTemplate } from "@/lib/types/assessment-template";
import type { AssessmentItemResponse } from "@/lib/types/assessment-submission";
import {
  TypeSafeClient,
  type Questions,
} from "@typesafe-ai/sdk";

/** Stay under Jev's per-request question budget with room for long criteria. */
const QUESTION_BATCH_SIZE = 100;

export class FillFromTranscriptError extends Error {
  readonly status: number;

  constructor(message: string, status = 500) {
    super(message);
    this.name = "FillFromTranscriptError";
    this.status = status;
  }
}

function chunkQuestions(questions: Questions): Questions[] {
  const entries = Object.entries(questions);
  if (entries.length === 0) {
    return [];
  }
  const batches: Questions[] = [];
  for (let i = 0; i < entries.length; i += QUESTION_BATCH_SIZE) {
    const slice = entries.slice(i, i + QUESTION_BATCH_SIZE);
    batches.push(Object.fromEntries(slice) as Questions);
  }
  return batches;
}

function requireApiKey(): string {
  const key = process.env.TYPESAFE_API_KEY?.trim();
  if (!key) {
    throw new FillFromTranscriptError(
      "TYPESAFE_API_KEY is not configured. Add it to .env.local to enable transcript fill.",
      503,
    );
  }
  return key;
}

/**
 * Ask Jev about the transcript and map judgments onto assessment responses.
 */
export async function fillAssessmentFromTranscript(options: {
  template: AssessmentTemplate;
  transcript: string;
}): Promise<Record<string, AssessmentItemResponse>> {
  const transcript = options.transcript.trim();
  if (!transcript) {
    throw new FillFromTranscriptError("Transcript text is required.", 400);
  }

  const apiKey = requireApiKey();
  const questions = buildFillFromTranscriptQuestions(options.template);
  const batches = chunkQuestions(questions);
  if (batches.length === 0) {
    return {};
  }

  const client = new TypeSafeClient({ apiKey });
  const state = {
    assessmentTitle: options.template.title,
    transcript,
  };

  const mergedAnswers: FillFromTranscriptAnswerMap = {};

  try {
    for (const batch of batches) {
      const result = await client.systemOne({
        state,
        questions: batch,
        model: "jev-latest",
      });
      for (const [id, answer] of Object.entries(result.answers)) {
        mergedAnswers[id] = answer;
      }
    }
  } catch (err) {
    if (err instanceof FillFromTranscriptError) {
      throw err;
    }
    const message =
      err instanceof Error && err.message.trim()
        ? err.message
        : "TypeSafe request failed.";
    throw new FillFromTranscriptError(message, 502);
  }

  return mapAnswersToResponses(options.template, mergedAnswers);
}
