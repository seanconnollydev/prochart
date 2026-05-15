"use server";

import { getBuiltinAssessmentTemplate } from "@/lib/assessments/builtin";
import type { AssessmentTemplate } from "@/lib/types/assessment-template";

/** Built-in template from project assets (e.g. H2T JSON). */
export async function getAssessmentTemplateById(
  id: string,
): Promise<AssessmentTemplate | null> {
  return getBuiltinAssessmentTemplate(id);
}
