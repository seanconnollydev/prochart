export const ASSESSMENT_TEMPLATE_SCHEMA_VERSION = "assessmentTemplate@0.2" as const;

/** Legacy schema; migrated on read via {@link normalizeAssessmentTemplate}. */
export const ASSESSMENT_TEMPLATE_SCHEMA_VERSION_LEGACY = "assessmentTemplate@0.1" as const;

export type AssessmentTemplateStatus = "draft" | "published";

export type DefinedLimits =
  | { type: "numericRange"; unit?: string; min?: number; max?: number; [key: string]: unknown }
  | { type: "scenarioDefined"; description?: string; [key: string]: unknown }
  | { type: "informational"; description?: string; [key: string]: unknown }
  | { type: "none"; [key: string]: unknown }
  | Record<string, unknown>;

export type AssessmentChoice = {
  id: string;
  label: string;
  [key: string]: unknown;
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
  [key: string]: unknown;
};

/** @deprecated Use {@link AssessmentGroup}. Retained for migration from 0.1. */
export type AssessmentDomain = {
  id: string;
  label: string;
  [key: string]: unknown;
};

export type AssessmentPresentationLayout = "cards" | "worksheet" | "flowsheet";

export type AssessmentItem = {
  id: string;
  groupId?: string;
  /** @deprecated Migrated to groupId */
  domainId?: string;
  prompt: string;
  responseType: AssessmentResponseType;
  definedLimits?: DefinedLimits;
  choices?: AssessmentChoice[];
  /** Flowsheet: one subsection rollup row; WDL vs X, expands to exception `multiChoice` rows. */
  x_flowsheetSectionRollup?: boolean;
  /** Flowsheet: full subsection WDL narrative from workbook `Sub WDL` aggregate row (side panel when set). */
  x_flowsheetSectionAggregateWdlDefinition?: string;
  /** Flowsheet: WDL narrative for multiselect exception rows (not stored as a `WDL=` choice). */
  x_wdlListDefinition?: string;
  [key: string]: unknown;
};

export type AssessmentTemplate = {
  schemaVersion: typeof ASSESSMENT_TEMPLATE_SCHEMA_VERSION;
  id: string;
  title: string;
  description?: string;
  /** Optional link to a case study for authoring/navigation */
  caseStudyId?: string;
  createdAt: string;
  updatedAt: string;
  status: AssessmentTemplateStatus;
  groups: AssessmentGroup[];
  items: AssessmentItem[];
  /** How to render the taker UI (default: cards). */
  x_presentation?: { layout?: AssessmentPresentationLayout };
  /** Optional license / attribution (e.g. bundled H2T workbook). */
  x_licenseNotice?: string;
  provenance?: {
    authoredBy?: { actorType: string; actorId?: string; [key: string]: unknown };
    [key: string]: unknown;
  };
  x_extensions?: Record<string, unknown>;
  [key: string]: unknown;
};

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
    x_extensions: {},
  };
}

/**
 * Migrates legacy 0.1 documents (domains / domainId) to 0.2 (groups / groupId).
 */
export function normalizeAssessmentTemplate(raw: unknown): AssessmentTemplate {
  const d = raw as Record<string, unknown>;
  const schemaVersion = d.schemaVersion as string | undefined;

  if (
    schemaVersion === ASSESSMENT_TEMPLATE_SCHEMA_VERSION &&
    Array.isArray(d.groups)
  ) {
    return raw as AssessmentTemplate;
  }

  if (
    schemaVersion === ASSESSMENT_TEMPLATE_SCHEMA_VERSION_LEGACY &&
    Array.isArray(d.domains)
  ) {
    const domains = d.domains as AssessmentDomain[];
    const groups: AssessmentGroup[] = domains.map((dom) => ({
      id: dom.id,
      label: dom.label,
      parentGroupId: null,
    }));
    const defaultGid = groups[0]?.id ?? "grp_default";
    const items = (Array.isArray(d.items) ? d.items : []).map((it) => {
      const row = it as AssessmentItem & { domainId?: string };
      const { domainId: _legacy, ...rest } = row;
      const gid = row.groupId ?? row.domainId ?? defaultGid;
      return { ...rest, groupId: gid } as AssessmentItem;
    });
    const { domains: _drop, ...rest } = d;
    return {
      ...rest,
      schemaVersion: ASSESSMENT_TEMPLATE_SCHEMA_VERSION,
      groups,
      items,
    } as AssessmentTemplate;
  }

  const groups: AssessmentGroup[] = Array.isArray(d.groups)
    ? (d.groups as AssessmentGroup[])
    : [{ id: "grp_default", label: "General", parentGroupId: null }];
  const defaultGid = groups[0]?.id ?? "grp_default";
  const items = (Array.isArray(d.items) ? d.items : []).map((it) => {
    const row = it as AssessmentItem;
    return {
      ...row,
      groupId: row.groupId ?? row.domainId ?? defaultGid,
    } as AssessmentItem;
  });
  return {
    ...(d as object),
    schemaVersion: ASSESSMENT_TEMPLATE_SCHEMA_VERSION,
    groups,
    items,
  } as AssessmentTemplate;
}
