import type { AssessmentTemplate } from "@/lib/types/assessment-template";
import { tryNormalizeAssessmentTemplate } from "@/lib/types/assessment-template";
import h2tHeadToToe from "./h2t-head-to-toe.generated.json";

const rawBuiltins: Record<string, unknown> = {
  h2t_head_to_toe_v1: h2tHeadToToe,
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
