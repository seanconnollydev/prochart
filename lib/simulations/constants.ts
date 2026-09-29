import { ADULT_PHYSICAL_ASSESSMENT_TEMPLATE_ID } from "@/lib/assessments/constants";

export const ATYPICAL_CHEST_PAIN_FEMALE_TEMPLATE_ID =
  "atypical_chest_pain_female_v1" as const;

export const END_OF_LIFE_TEMPLATE_ID = "end_of_life_v1" as const;

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
  {
    templateId: END_OF_LIFE_TEMPLATE_ID,
    title: "End of Life",
    description:
      "End-of-life care simulation. Assess common EOL symptoms, communicate with patient and family about hospice and advance directives, and implement hospitalist orders.",
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
  [END_OF_LIFE_TEMPLATE_ID]: [
    {
      templateId: ADULT_PHYSICAL_ASSESSMENT_TEMPLATE_ID,
      title: "Adult Physical Assessment",
    },
  ],
};
