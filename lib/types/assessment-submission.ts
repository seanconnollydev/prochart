export const ASSESSMENT_SUBMISSION_SCHEMA_VERSION = "assessmentSubmission@0.1" as const;

export type AssessmentSubmissionStatus = "in_progress" | "submitted";

/** One selected location with nested field multiselect values (choice ids). */
export type LocationScopedFindingEntry = {
  locationId: string;
  fields: Record<string, string[]>;
};

/** Ordered list of location entries for a `locationScoped` template item. */
export type LocationScopedFindingValue = LocationScopedFindingEntry[];

export type AssessmentResponseValue =
  | boolean
  | string
  | string[]
  | number
  | LocationScopedFindingValue
  | null
  | undefined;

export type AssessmentItemResponse = {
  value?: AssessmentResponseValue;
  /** Optional student note on this item (flowsheet info panel); one per item. */
  comment?: string;
};

export type AssessmentSubmission = {
  schemaVersion: typeof ASSESSMENT_SUBMISSION_SCHEMA_VERSION;
  id: string;
  templateId: string;
  student?: {
    actorType: string;
    actorId?: string;
    displayName?: string;
  };
  startedAt: string;
  updatedAt: string;
  submittedAt: string | null;
  status: AssessmentSubmissionStatus;
  responses: Record<string, AssessmentItemResponse>;
};

export function emptyAssessmentSubmission(
  id: string,
  templateId: string,
  studentActorId: string,
): AssessmentSubmission {
  const t = new Date().toISOString();
  return {
    schemaVersion: ASSESSMENT_SUBMISSION_SCHEMA_VERSION,
    id,
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
  };
}
