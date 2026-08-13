import type { SimulationTemplate } from "@/lib/types/simulation-template";
import { tryNormalizeSimulationTemplate } from "@/lib/types/simulation-template";
import atypicalChestPainFemale from "./atypical-chest-pain-female.generated.json";

const rawBuiltins: Record<string, unknown> = {
  atypical_chest_pain_female_v1: atypicalChestPainFemale,
};

export const BUILTIN_SIMULATION_TEMPLATE_IDS = Object.keys(
  rawBuiltins,
) as readonly string[];

export function isBuiltinSimulationTemplateId(id: string): boolean {
  return id in rawBuiltins;
}

export function getBuiltinSimulationTemplate(
  id: string,
): SimulationTemplate | null {
  const raw = rawBuiltins[id];
  if (!raw) {
    return null;
  }
  return tryNormalizeSimulationTemplate(raw);
}
