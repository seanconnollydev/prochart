import { ADULT_PHYSICAL_ASSESSMENT_TEMPLATE_ID } from "@/lib/assessments/constants";

export const ATYPICAL_CHEST_PAIN_FEMALE_TEMPLATE_ID =
  "atypical_chest_pain_female_v1" as const;

/** Built-in simulations available for student practice. */
export const BUILTIN_SIMULATION_CATALOG: ReadonlyArray<{
  templateId: string;
  title: string;
  description?: string;
}> = [
  {
    templateId: ATYPICAL_CHEST_PAIN_FEMALE_TEMPLATE_ID,
    title: "Atypical Chest Pain Female",
    description:
      "Post-PCI care simulation. Implement standard orders and respond to an emergent loss of perfusion.",
  },
];

/** Assessments available inside a given simulation (student practice). */
export const SIMULATION_LINKED_ASSESSMENTS: Record<
  string,
  ReadonlyArray<{ templateId: string; title: string }>
> = {
  [ATYPICAL_CHEST_PAIN_FEMALE_TEMPLATE_ID]: [
    {
      templateId: ADULT_PHYSICAL_ASSESSMENT_TEMPLATE_ID,
      title: "Adult Physical Assessment",
    },
  ],
};
