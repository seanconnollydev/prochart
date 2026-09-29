"use server";

import { getBuiltinSimulationTemplate } from "@/lib/simulations/builtin";
import type { SimulationTemplate } from "@/lib/types/simulation-template";

/** Built-in template from project assets (e.g. atypical chest pain JSON). */
export async function getSimulationTemplateById(
  id: string,
): Promise<SimulationTemplate | null> {
  return getBuiltinSimulationTemplate(id);
}
