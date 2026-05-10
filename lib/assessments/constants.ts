/** Case study id for practice runs outside a published case (localStorage keying). */
export const STANDALONE_PRACTICE_CASE_STUDY_ID = "standalone_practice";

/** Case study id for author preview (localStorage keying). */
export const AUTHOR_PREVIEW_CASE_STUDY_ID = "author_preview";

/**
 * Alpha prototype: all assessment runs are local-only (no server persistence).
 */
export function isLocalOnlyAssessmentCaseStudy(_caseStudyId: string): boolean {
  return true;
}

export const H2T_ASSESSMENT_TEMPLATE_ID = "h2t_head_to_toe_v1" as const;

/** Built-in assessments authors can attach to case studies. */
export const BUILTIN_ASSESSMENT_CATALOG: ReadonlyArray<{
  templateId: string;
  title: string;
}> = [
  {
    templateId: H2T_ASSESSMENT_TEMPLATE_ID,
    title: "Head-to-Toe Assessment (H2T)",
  },
];
