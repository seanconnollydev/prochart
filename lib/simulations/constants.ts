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
