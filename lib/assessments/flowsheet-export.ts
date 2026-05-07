import {
  buildFlowsheetBlocks,
  FLOWSHEET_EXCEPTION_CHOICE_ID,
  findSectionRollupGate,
  isFlowsheetExceptionSelected,
  isFlowsheetWdlDetailChoiceItem,
  isFlowsheetWdlXComboboxItem,
  segmentFlowsheetRowItems,
} from "@/lib/assessments/flowsheet";
import type {
  AssessmentItem,
  AssessmentTemplate,
} from "@/lib/prototype-alpha/types/assessment-template";
import type { AssessmentItemResponse } from "@/lib/prototype-alpha/types/assessment-submission";

export type FlowsheetExportRow =
  | { kind: "section"; pathLine: string }
  | { kind: "item"; prompt: string; valueDisplay: string; indent: number };

function promptForRow(item: AssessmentItem): string {
  let p = item.prompt;
  if (isFlowsheetWdlXComboboxItem(item)) {
    p += " (WDL / X)";
  }
  return p;
}

const WDL_EQUALS_EXPORT = /^\s*WDL\s*=\s*/i;

function flowsheetChoiceIdExportLabel(
  item: AssessmentItem,
  id: string,
): string {
  const ch = (item.choices ?? []).find((c) => c.id === id);
  if (!ch) {
    return id;
  }
  if (isFlowsheetWdlDetailChoiceItem(item) && WDL_EQUALS_EXPORT.test(ch.label)) {
    return "WDL";
  }
  return ch.label;
}

function choiceDisplay(
  item: AssessmentItem,
  responses: Record<string, AssessmentItemResponse>,
): string {
  const raw = responses[item.id]?.value;
  if (isFlowsheetWdlXComboboxItem(item)) {
    const id = typeof raw === "string" ? raw : "";
    if (id === FLOWSHEET_EXCEPTION_CHOICE_ID) {
      return "X";
    }
    if (!id) {
      return "—";
    }
    return "WDL";
  }
  if (Array.isArray(raw)) {
    const ids = raw.filter((x): x is string => typeof x === "string");
    if (ids.length === 0) {
      return "—";
    }
    const parts = ids.map((id) => flowsheetChoiceIdExportLabel(item, id));
    return parts.length > 0 ? parts.join(", ") : "—";
  }
  const id = typeof raw === "string" ? raw : "";
  if (!id) {
    return "—";
  }
  return flowsheetChoiceIdExportLabel(item, id);
}

function multiChoiceDisplay(
  item: AssessmentItem,
  responses: Record<string, AssessmentItemResponse>,
): string {
  const raw = responses[item.id]?.value;
  const ids = Array.isArray(raw) ? raw : [];
  if (ids.length === 0) {
    return "—";
  }
  const labels = (item.choices ?? [])
    .filter((c) => ids.includes(c.id))
    .map((c) => c.label);
  return labels.length > 0 ? labels.join(", ") : "—";
}

function booleanDisplay(
  responses: Record<string, AssessmentItemResponse>,
  itemId: string,
): string {
  const v = responses[itemId]?.value;
  if (v === true) {
    return "Yes / within limits";
  }
  return "—";
}

function textDisplay(
  responses: Record<string, AssessmentItemResponse>,
  itemId: string,
): string {
  const v = responses[itemId]?.value;
  const s = typeof v === "string" ? v.trim() : "";
  return s || "—";
}

function formatItemValue(
  item: AssessmentItem,
  responses: Record<string, AssessmentItemResponse>,
): string {
  switch (item.responseType) {
    case "choice":
      return choiceDisplay(item, responses);
    case "multiChoice":
      return multiChoiceDisplay(item, responses);
    case "boolean":
      return booleanDisplay(responses, item.id);
    case "text":
      return textDisplay(responses, item.id);
    default:
      return "—";
  }
}

export function buildFlowsheetExportRows(
  template: AssessmentTemplate,
  responses: Record<string, AssessmentItemResponse>,
): FlowsheetExportRow[] {
  const groups = template.groups ?? [];
  const items = template.items;
  const blocks = buildFlowsheetBlocks(items, groups);
  const out: FlowsheetExportRow[] = [];

  for (const block of blocks) {
    const groupLabel =
      groups.find((g) => g.id === block.groupId)?.label ?? "";
    const sectionGate = findSectionRollupGate(
      block.groupId,
      groupLabel,
      block.items,
    );
    const bodyItems = sectionGate
      ? block.items.filter((i) => i.id !== sectionGate.id)
      : block.items;
    const sectionExpanded =
      !sectionGate ||
      isFlowsheetExceptionSelected(responses, sectionGate.id);
    const rowSegments = segmentFlowsheetRowItems(bodyItems);
    const sectionBodyIndent =
      Boolean(sectionGate) && sectionExpanded ? 1 : 0;

    const pathLine =
      block.path.length > 0 ? block.path.join(" → ") : "—";

    out.push({ kind: "section", pathLine });

    if (sectionGate) {
      out.push({
        kind: "item",
        prompt: promptForRow(sectionGate),
        valueDisplay: formatItemValue(sectionGate, responses),
        indent: 0,
      });
    }

    if (sectionExpanded) {
      for (const seg of rowSegments) {
        if (seg.gate) {
          out.push({
            kind: "item",
            prompt: promptForRow(seg.gate),
            valueDisplay: formatItemValue(seg.gate, responses),
            indent: sectionBodyIndent,
          });
          if (isFlowsheetExceptionSelected(responses, seg.gate.id)) {
            for (const d of seg.details) {
              out.push({
                kind: "item",
                prompt: promptForRow(d),
                valueDisplay: formatItemValue(d, responses),
                indent: sectionBodyIndent + 1,
              });
            }
          }
        } else {
          for (const d of seg.details) {
            out.push({
              kind: "item",
              prompt: promptForRow(d),
              valueDisplay: formatItemValue(d, responses),
              indent: sectionBodyIndent,
            });
          }
        }
      }
    }
  }

  return out;
}
