import type { AssessmentTemplate } from "@/lib/types/assessment-template";
import { tryNormalizeAssessmentTemplate } from "@/lib/types/assessment-template";
import adultPhysicalAssessment from "./adult-physical-assessment.generated.json";

const rawBuiltins: Record<string, unknown> = {
  adult_physical_assessment_v1: adultPhysicalAssessment,
};

export const BUILTIN_TEMPLATE_IDS = Object.keys(
  rawBuiltins,
) as readonly string[];

export function isBuiltinTemplateId(id: string): boolean {
  return id in rawBuiltins;
}

export function getBuiltinAssessmentTemplate(
  id: string,
): AssessmentTemplate | null {
  const raw = rawBuiltins[id];
  if (!raw) {
    return null;
  }
  return tryNormalizeAssessmentTemplate(raw);
}
