export const ADULT_PHYSICAL_ASSESSMENT_TEMPLATE_ID =
  "adult_physical_assessment_v1" as const;

/** Built-in assessments authors can attach to case studies. */
export const BUILTIN_ASSESSMENT_CATALOG: ReadonlyArray<{
  templateId: string;
  title: string;
}> = [
  {
    templateId: ADULT_PHYSICAL_ASSESSMENT_TEMPLATE_ID,
    title: "Adult Physical Assessment",
  },
];
