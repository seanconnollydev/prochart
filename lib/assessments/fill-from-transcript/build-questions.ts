import {
  FLOWSHEET_EXCEPTION_CHOICE_ID,
  isFlowsheetWdlGateItem,
  prepareFlowsheetTemplate,
} from "@/lib/assessments/flowsheet";
import type { AssessmentTemplate } from "@/lib/types/assessment-template";
import { choice, noul, type Questions } from "@typesafe-ai/sdk";

export const NOT_EVIDENCED_CHOICE_KEY = "not_evidenced";

export function optionQuestionId(itemId: string, choiceId: string): string {
  return `opt:${itemId}:${choiceId}`;
}

export function itemChoiceQuestionId(itemId: string): string {
  return `item:${itemId}`;
}

export function wdlGateQuestionId(gateItemId: string): string {
  return `wdl:${gateItemId}`;
}

export function parseOptionQuestionId(
  id: string,
): { itemId: string; choiceId: string } | null {
  if (!id.startsWith("opt:")) {
    return null;
  }
  const rest = id.slice(4);
  const sep = rest.indexOf(":");
  if (sep <= 0 || sep === rest.length - 1) {
    return null;
  }
  return { itemId: rest.slice(0, sep), choiceId: rest.slice(sep + 1) };
}

export function parseItemChoiceQuestionId(id: string): string | null {
  if (!id.startsWith("item:")) {
    return null;
  }
  const itemId = id.slice(5);
  return itemId || null;
}

export function parseWdlGateQuestionId(id: string): string | null {
  if (!id.startsWith("wdl:")) {
    return null;
  }
  const gateItemId = id.slice(4);
  return gateItemId || null;
}

/**
 * Build TypeSafe questions that judge transcript evidence for each fillable
 * flowsheet field. WDL gates are judged for "within defined limits" only;
 * Exception is derived later from detail selections.
 */
export function buildFillFromTranscriptQuestions(
  template: AssessmentTemplate,
): Questions {
  const prepared = prepareFlowsheetTemplate(template);
  const questions: Questions = {};

  for (const item of prepared.items) {
    if (isFlowsheetWdlGateItem(item)) {
      const sectionLabel = item.prompt.replace(/\s+WDL\s*$/i, "").trim();
      const wdlNarrative =
        (item.choices ?? []).find((c) => c.id !== FLOWSHEET_EXCEPTION_CHOICE_ID)
          ?.label ??
        item.flowsheetSectionAggregateWdlDefinition ??
        item.wdlListDefinition ??
        `${sectionLabel} within defined limits`;

      questions[wdlGateQuestionId(item.id)] = noul(
        {
          question:
            "Does the clinical transcript describe this body system or assessment area as within defined limits, with no abnormal or exception findings mentioned?",
          assessment_item: item.prompt,
          within_defined_limits_means: wdlNarrative,
        },
        {
          true: "The transcript discusses this area and indicates findings are normal / within defined limits, without documenting exceptions.",
          false:
            "The transcript does not establish this area as within defined limits (silent, unclear, or documents abnormalities).",
        },
      );
      continue;
    }

    if (item.responseType === "multiChoice") {
      for (const ch of item.choices ?? []) {
        questions[optionQuestionId(item.id, ch.id)] = noul(
          {
            question:
              "Does the clinical transcript support documenting this assessment finding?",
            assessment_row: item.prompt,
            finding: ch.label,
          },
          {
            true: "The transcript clearly mentions or strongly implies this finding for the patient.",
            false:
              "The transcript does not support selecting this finding (absent, contradicted, or unrelated).",
          },
        );
      }
      continue;
    }

    if (item.responseType === "choice") {
      const choices = item.choices ?? [];
      if (choices.length === 0) {
        continue;
      }
      const criteria: Record<string, string | null> = {
        [NOT_EVIDENCED_CHOICE_KEY]:
          "The transcript does not provide enough evidence to select any of the listed options for this row.",
      };
      for (const ch of choices) {
        criteria[ch.id] = ch.label;
      }
      questions[itemChoiceQuestionId(item.id)] = choice(
        {
          question:
            "Which option best matches what the clinical transcript documents for this assessment row? Choose not_evidenced when the transcript is silent or unclear.",
          assessment_row: item.prompt,
        },
        criteria,
      );
    }
  }

  return questions;
}
