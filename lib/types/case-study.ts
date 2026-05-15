export const CASE_STUDY_SCHEMA_VERSION = "caseStudy@0.1" as const;

export type CaseStudyStatus = "draft" | "published";

export type CaseStudyContact = {
  phone?: string;
  email?: string;
};

export type CaseStudyAddress = {
  line1?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

export type CaseStudyPatient = {
  displayName?: string;
  dateOfBirth?: string;
  sexAtBirth?: string;
  genderIdentity?: string;
  preferredPronouns?: string;
  race?: string;
  ethnicity?: string;
  language?: string;
  contact?: CaseStudyContact;
  address?: CaseStudyAddress;
  identifiers?: {
    mrn?: string;
    x_externalIds?: unknown[];
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

export type CaseStudyContext = {
  careSetting?: string;
  organizationName?: string;
  unit?: string;
  [key: string]: unknown;
};

export type CaseStudySummary = {
  chiefComplaint?: string;
  hpi?: string;
  pmh?: string[];
  psh?: string[];
  allergies?: string[];
  homeMeds?: Array<{
    name?: string;
    sig?: string;
    route?: string;
    [key: string]: unknown;
  }>;
  [key: string]: unknown;
};

export type TimelineEntryType =
  | "encounter"
  | "note"
  | "lab"
  | "medication"
  | "vitals"
  | "imaging"
  | "procedure"
  | "assessment"
  | "other";

export type CaseStudyTimelineEntry = {
  id: string;
  type: TimelineEntryType;
  occurredAt: string;
  title?: string;
  data: Record<string, unknown>;
  [key: string]: unknown;
};

export type AssessmentTemplateRef = {
  templateId: string;
  label?: string;
  /** `builtin` = bundled repo template; `author` = created in authoring UI (default). */
  source?: "builtin" | "author";
  x_defaultForStudents?: boolean;
  [key: string]: unknown;
};

export type CaseStudyAssessments = {
  assessmentTemplates?: AssessmentTemplateRef[];
  [key: string]: unknown;
};

/** Returns linked assessment templates from case study assessments data. */
export function linkedAssessmentTemplates(
  assessments: CaseStudyAssessments | undefined,
): AssessmentTemplateRef[] {
  if (!assessments) {
    return [];
  }
  return assessments.assessmentTemplates ?? [];
}

export type CaseStudyAttachment = {
  id: string;
  type: string;
  title?: string;
  url?: string;
  [key: string]: unknown;
};

export type ProvenanceActor = {
  actorType: string;
  actorId?: string;
  [key: string]: unknown;
};

export type GeneratedByEntry = {
  generatedAt: string;
  tool: string;
  scope?: string;
  promptSummary?: string;
  [key: string]: unknown;
};

export type CaseStudyProvenance = {
  authoredBy?: ProvenanceActor;
  generatedBy?: GeneratedByEntry[];
  [key: string]: unknown;
};

/** Portable case study document v0.1 */
export type CaseStudyDocument = {
  schemaVersion: typeof CASE_STUDY_SCHEMA_VERSION;
  id: string;
  title: string;
  description?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
  status: CaseStudyStatus;
  patient: CaseStudyPatient;
  context?: CaseStudyContext;
  summary?: CaseStudySummary;
  timeline: CaseStudyTimelineEntry[];
  assessments?: CaseStudyAssessments;
  attachments?: CaseStudyAttachment[];
  provenance?: CaseStudyProvenance;
  x_extensions?: Record<string, unknown>;
  [key: string]: unknown;
};

export function emptyCaseStudyDocument(id: string): CaseStudyDocument {
  const t = new Date().toISOString();
  return {
    schemaVersion: CASE_STUDY_SCHEMA_VERSION,
    id,
    title: "Untitled case study",
    createdAt: t,
    updatedAt: t,
    status: "draft",
    patient: {},
    timeline: [],
    x_extensions: {},
  };
}
