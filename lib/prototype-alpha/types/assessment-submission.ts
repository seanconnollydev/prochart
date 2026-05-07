export const ASSESSMENT_SUBMISSION_SCHEMA_VERSION = "assessmentSubmission@0.1" as const;

export type AssessmentSubmissionStatus = "in_progress" | "submitted";

export type AssessmentResponseValue =
  | boolean
  | string
  | string[]
  | number
  | null
  | undefined;

export type AssessmentItemResponse = {
  value?: AssessmentResponseValue;
  /** Optional student note on this item (flowsheet info panel); one per item. */
  x_comment?: string;
  [key: string]: unknown;
};

export type AssessmentSubmission = {
  schemaVersion: typeof ASSESSMENT_SUBMISSION_SCHEMA_VERSION;
  id: string;
  caseStudyId: string;
  templateId: string;
  student?: {
    actorType: string;
    actorId?: string;
    displayName?: string;
    [key: string]: unknown;
  };
  startedAt: string;
  updatedAt: string;
  submittedAt: string | null;
  status: AssessmentSubmissionStatus;
  responses: Record<string, AssessmentItemResponse>;
  x_extensions?: Record<string, unknown>;
  [key: string]: unknown;
};

export function emptyAssessmentSubmission(
  id: string,
  caseStudyId: string,
  templateId: string,
  studentActorId: string,
): AssessmentSubmission {
  const t = new Date().toISOString();
  return {
    schemaVersion: ASSESSMENT_SUBMISSION_SCHEMA_VERSION,
    id,
    caseStudyId,
    templateId,
    student: {
      actorType: "student",
      actorId: studentActorId,
      displayName: "Student",
    },
    startedAt: t,
    updatedAt: t,
    submittedAt: null,
    status: "in_progress",
    responses: {},
    x_extensions: {},
  };
}
