import {
  FLOWSHEET_EXCEPTION_CHOICE_ID,
  buildFlowsheetBlocks,
  isFlowsheetWdlGateItem,
  prepareFlowsheetTemplate,
  segmentFlowsheetRowItems,
} from "@/lib/assessments/flowsheet";
import type { AssessmentTemplate } from "@/lib/types/assessment-template";
import type { AssessmentItemResponse } from "@/lib/types/assessment-submission";
import type {
  ChoiceResponse,
  NoulResponse,
  ScoreResponse,
} from "@typesafe-ai/sdk";
import {
  NOT_EVIDENCED_CHOICE_KEY,
  parseItemChoiceQuestionId,
  parseOptionQuestionId,
  parseWdlGateQuestionId,
} from "./build-questions";

/** Apply multiChoice options when Noul probability is at or above this. */
export const NOUL_SELECT_THRESHOLD = 0.7;

/** Apply a Choice answer when confidence is at or above this. */
export const CHOICE_CONFIDENCE_THRESHOLD = 0.5;

/** Set a WDL gate to WDL when section Noul is at or above this (and no exceptions). */
export const WDL_NOUL_THRESHOLD = 0.7;

export type FillFromTranscriptAnswer =
  | NoulResponse
  | ChoiceResponse
  | ScoreResponse;

export type FillFromTranscriptAnswerMap = Record<
  string,
  FillFromTranscriptAnswer
>;

function isNoulAnswer(
  answer: FillFromTranscriptAnswer,
): answer is NoulResponse {
  return answer.type === "noul";
}

function isChoiceAnswer(
  answer: FillFromTranscriptAnswer,
): answer is ChoiceResponse {
  return answer.type === "choice";
}

/**
 * Map TypeSafe answers onto assessment responses. Only returns keys that should
 * be written (partial merge). Derives WDL/Exception gates from detail evidence.
 */
export function mapAnswersToResponses(
  template: AssessmentTemplate,
  answers: FillFromTranscriptAnswerMap,
): Record<string, AssessmentItemResponse> {
  const prepared = prepareFlowsheetTemplate(template);
  const responses: Record<string, AssessmentItemResponse> = {};

  const multiSelected = new Map<string, string[]>();

  for (const [qid, answer] of Object.entries(answers)) {
    const opt = parseOptionQuestionId(qid);
    if (opt && isNoulAnswer(answer) && answer.noul >= NOUL_SELECT_THRESHOLD) {
      const list = multiSelected.get(opt.itemId) ?? [];
      list.push(opt.choiceId);
      multiSelected.set(opt.itemId, list);
      continue;
    }

    const itemId = parseItemChoiceQuestionId(qid);
    if (itemId && isChoiceAnswer(answer)) {
      if (
        answer.choice !== NOT_EVIDENCED_CHOICE_KEY &&
        answer.confidence >= CHOICE_CONFIDENCE_THRESHOLD
      ) {
        // Flowsheet multiselect UI accepts a single id as string or string[].
        responses[itemId] = { value: [answer.choice] };
      }
    }
  }

  for (const [itemId, choiceIds] of multiSelected) {
    if (choiceIds.length > 0) {
      responses[itemId] = { value: choiceIds };
    }
  }

  const wdlNouls = new Map<string, number>();
  for (const [qid, answer] of Object.entries(answers)) {
    const gateId = parseWdlGateQuestionId(qid);
    if (gateId && isNoulAnswer(answer)) {
      wdlNouls.set(gateId, answer.noul);
    }
  }

  const blocks = buildFlowsheetBlocks(prepared.items, prepared.groups);
  const itemById = new Map(prepared.items.map((i) => [i.id, i]));

  for (const block of blocks) {
    const sectionGate = block.items.find((i) => i.flowsheetSectionRollup);
    const bodyItems = sectionGate
      ? block.items.filter((i) => i.id !== sectionGate.id)
      : block.items;
    const segments = segmentFlowsheetRowItems(bodyItems);

    let sectionHasException = false;

    for (const seg of segments) {
      const detailHasValue = seg.details.some((d) => {
        const v = responses[d.id]?.value;
        if (Array.isArray(v)) {
          return v.length > 0;
        }
        return typeof v === "string" && v.trim() !== "";
      });

      if (seg.gate) {
        if (detailHasValue) {
          responses[seg.gate.id] = { value: FLOWSHEET_EXCEPTION_CHOICE_ID };
          sectionHasException = true;
        } else {
          const noul = wdlNouls.get(seg.gate.id) ?? 0;
          if (noul >= WDL_NOUL_THRESHOLD) {
            const wdlChoice = (seg.gate.choices ?? []).find(
              (c) => c.id !== FLOWSHEET_EXCEPTION_CHOICE_ID,
            );
            if (wdlChoice) {
              responses[seg.gate.id] = { value: wdlChoice.id };
            }
          }
        }
      } else if (detailHasValue) {
        sectionHasException = true;
      }
    }

    // Details directly under a section rollup (no row gate), e.g. Behavioral.
    if (sectionGate) {
      const directDetailsHaveValue = bodyItems.some((item) => {
        if (isFlowsheetWdlGateItem(item)) {
          return responses[item.id]?.value === FLOWSHEET_EXCEPTION_CHOICE_ID;
        }
        const v = responses[item.id]?.value;
        if (Array.isArray(v)) {
          return v.length > 0;
        }
        return typeof v === "string" && v.trim() !== "";
      });

      if (sectionHasException || directDetailsHaveValue) {
        responses[sectionGate.id] = { value: FLOWSHEET_EXCEPTION_CHOICE_ID };
      } else {
        const noul = wdlNouls.get(sectionGate.id) ?? 0;
        if (noul >= WDL_NOUL_THRESHOLD) {
          const wdlChoice = (sectionGate.choices ?? []).find(
            (c) => c.id !== FLOWSHEET_EXCEPTION_CHOICE_ID,
          );
          if (wdlChoice) {
            responses[sectionGate.id] = { value: wdlChoice.id };
          }
        }
      }
    }
  }

  // Drop any accidental writes for unknown item ids.
  for (const id of Object.keys(responses)) {
    if (!itemById.has(id)) {
      delete responses[id];
    }
  }

  return responses;
}
