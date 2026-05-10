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
