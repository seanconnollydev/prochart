export const ASSESSMENT_TEMPLATE_SCHEMA_VERSION = "assessmentTemplate@0.1" as const;

export type AssessmentTemplateStatus = "draft" | "published";

export type AssessmentChoice = {
  id: string;
  label: string;
};

export type AssessmentResponseType =
  | "boolean"
  | "choice"
  | "multiChoice"
  | "text"
  | string;

/** One node in the section-heading tree (flat list + parent pointers). */
export type AssessmentGroup = {
  id: string;
  label: string;
  parentGroupId: string | null;
};

export type AssessmentPresentationLayout = "cards" | "worksheet" | "flowsheet";

export type AssessmentItem = {
  id: string;
  groupId?: string;
  prompt: string;
  responseType: AssessmentResponseType;
  choices?: AssessmentChoice[];
  /** Flowsheet: one subsection rollup row; WDL vs X, expands to exception `multiChoice` rows. */
  flowsheetSectionRollup?: boolean;
  /** Flowsheet: full subsection WDL narrative from workbook `Sub WDL` aggregate row (side panel when set). */
  flowsheetSectionAggregateWdlDefinition?: string;
  /** Flowsheet: WDL narrative for multiselect exception rows (not stored as a `WDL=` choice). */
  wdlListDefinition?: string;
};

export type AssessmentTemplate = {
  schemaVersion: typeof ASSESSMENT_TEMPLATE_SCHEMA_VERSION;
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  updatedAt: string;
  status: AssessmentTemplateStatus;
  groups: AssessmentGroup[];
  items: AssessmentItem[];
  /** How to render the taker UI (default: cards). */
  presentation?: { layout?: AssessmentPresentationLayout };
  /** Optional license / attribution (e.g. bundled adult physical assessment workbook). */
  licenseNotice?: string;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function isAssessmentGroup(v: unknown): v is AssessmentGroup {
  if (!isRecord(v)) {
    return false;
  }
  return (
    typeof v.id === "string" &&
    typeof v.label === "string" &&
    (v.parentGroupId === null || typeof v.parentGroupId === "string")
  );
}

function isAssessmentItem(v: unknown): v is AssessmentItem {
  if (!isRecord(v)) {
    return false;
  }
  return (
    typeof v.id === "string" &&
    typeof v.prompt === "string" &&
    typeof v.responseType === "string"
  );
}

/**
 * Returns a valid template or null (e.g. corrupt or wrong schema). No migration of legacy shapes.
 */
export function tryNormalizeAssessmentTemplate(raw: unknown): AssessmentTemplate | null {
  if (!isRecord(raw)) {
    return null;
  }
  if (raw.schemaVersion !== ASSESSMENT_TEMPLATE_SCHEMA_VERSION) {
    return null;
  }
  if (
    typeof raw.id !== "string" ||
    typeof raw.title !== "string" ||
    typeof raw.createdAt !== "string" ||
    typeof raw.updatedAt !== "string" ||
    (raw.status !== "draft" && raw.status !== "published")
  ) {
    return null;
  }
  if (!Array.isArray(raw.groups) || !raw.groups.every(isAssessmentGroup)) {
    return null;
  }
  if (!Array.isArray(raw.items) || !raw.items.every(isAssessmentItem)) {
    return null;
  }

  const template: AssessmentTemplate = {
    schemaVersion: ASSESSMENT_TEMPLATE_SCHEMA_VERSION,
    id: raw.id,
    title: raw.title,
    createdAt: raw.createdAt,
    updatedAt: raw.updatedAt,
    status: raw.status,
    groups: raw.groups,
    items: raw.items,
  };
  if (typeof raw.description === "string") {
    template.description = raw.description;
  }
  if (isRecord(raw.presentation)) {
    const layout = raw.presentation.layout;
    if (
      layout === undefined ||
      layout === "cards" ||
      layout === "worksheet" ||
      layout === "flowsheet"
    ) {
      template.presentation = { layout };
    }
  }
  if (typeof raw.licenseNotice === "string") {
    template.licenseNotice = raw.licenseNotice;
  }
  return template;
}

export function emptyAssessmentTemplate(id: string): AssessmentTemplate {
  const t = new Date().toISOString();
  const defaultGroup: AssessmentGroup = {
    id: "grp_default",
    label: "General",
    parentGroupId: null,
  };
  return {
    schemaVersion: ASSESSMENT_TEMPLATE_SCHEMA_VERSION,
    id,
    title: "Untitled assessment",
    createdAt: t,
    updatedAt: t,
    status: "draft",
    groups: [defaultGroup],
    items: [],
  };
}

/** Strict parse; throws if the document is not a valid current-schema template. */
export function normalizeAssessmentTemplate(raw: unknown): AssessmentTemplate {
  const parsed = tryNormalizeAssessmentTemplate(raw);
  if (!parsed) {
    throw new Error("Invalid assessment template document");
  }
  return parsed;
}
