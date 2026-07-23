import {
  buildFlowsheetBlocks,
  coerceFlowsheetMultiselectValue,
  coerceLocationScopedFindingValue,
  FLOWSHEET_EXCEPTION_CHOICE_ID,
  FLOWSHEET_EXCEPTION_CHOICE_LABEL,
  findSectionRollupGate,
  getLocationScopedFieldValue,
  isFlowsheetExceptionSelected,
  isFlowsheetWdlXComboboxItem,
  isLocationScopedItem,
  locationChoiceLabel,
  segmentFlowsheetRowItems,
} from "@/lib/assessments/flowsheet";
import type {
  AssessmentItem,
  AssessmentTemplate,
  LocationScopedField,
} from "@/lib/types/assessment-template";
import type { AssessmentItemResponse } from "@/lib/types/assessment-submission";

export type FlowsheetExportRow =
  | { kind: "section"; pathLine: string }
  | { kind: "item"; prompt: string; valueDisplay: string; indent: number };

function promptForRow(item: AssessmentItem): string {
  return item.prompt;
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
  if (WDL_EQUALS_EXPORT.test(ch.label)) {
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
      return FLOWSHEET_EXCEPTION_CHOICE_LABEL;
    }
    if (!id) {
      return "—";
    }
    return "WDL";
  }
  const ids = coerceFlowsheetMultiselectValue(raw);
  if (ids.length === 0) {
    return "—";
  }
  const parts = ids.map((id) => flowsheetChoiceIdExportLabel(item, id));
  return parts.length > 0 ? parts.join(", ") : "—";
}

function multiChoiceDisplay(
  item: AssessmentItem,
  responses: Record<string, AssessmentItemResponse>,
): string {
  const raw = responses[item.id]?.value;
  const ids = coerceFlowsheetMultiselectValue(raw);
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

function fieldChoiceDisplay(
  field: LocationScopedField,
  selectedIds: string[],
): string {
  if (selectedIds.length === 0) {
    return "—";
  }
  const labels = field.choices
    .filter((c) => selectedIds.includes(c.id))
    .map((c) => c.label);
  return labels.length > 0 ? labels.join(", ") : "—";
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

function exportValueDisplayWithComment(
  item: AssessmentItem,
  responses: Record<string, AssessmentItemResponse>,
): string {
  const main = formatItemValue(item, responses);
  const raw = responses[item.id]?.comment;
  const c = typeof raw === "string" ? raw.trim() : "";
  if (!c) {
    return main;
  }
  return `${main}\n\nComment: ${c}`;
}

function appendLocationScopedExportRows(
  out: FlowsheetExportRow[],
  item: AssessmentItem,
  responses: Record<string, AssessmentItemResponse>,
  indent: number,
): void {
  const value = coerceLocationScopedFindingValue(responses[item.id]?.value);
  const fields = item.locationScopedFields ?? [];
  const locationIds = value.map((e) => e.locationId);
  const locationLabels = locationIds.map((id) => locationChoiceLabel(item, id));

  out.push({
    kind: "item",
    prompt: "Locations",
    valueDisplay:
      locationLabels.length > 0 ? locationLabels.join(", ") : "—",
    indent,
  });

  for (const entry of value) {
    const locLabel = locationChoiceLabel(item, entry.locationId);
    out.push({
      kind: "item",
      prompt: locLabel,
      valueDisplay: "—",
      indent: indent + 1,
    });
    for (const field of fields) {
      out.push({
        kind: "item",
        prompt: field.prompt,
        valueDisplay: fieldChoiceDisplay(
          field,
          getLocationScopedFieldValue(entry, field.key),
        ),
        indent: indent + 2,
      });
    }
  }

  const rawComment = responses[item.id]?.comment;
  const comment = typeof rawComment === "string" ? rawComment.trim() : "";
  if (comment) {
    out.push({
      kind: "item",
      prompt: item.prompt,
      valueDisplay: `Comment: ${comment}`,
      indent,
    });
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
    const groupLabel = groups.find((g) => g.id === block.groupId)?.label ?? "";
    const sectionGate = findSectionRollupGate(
      block.groupId,
      groupLabel,
      block.items,
    );
    const bodyItems = sectionGate
      ? block.items.filter((i) => i.id !== sectionGate.id)
      : block.items;
    const sectionExpanded =
      !sectionGate || isFlowsheetExceptionSelected(responses, sectionGate.id);
    const rowSegments = segmentFlowsheetRowItems(bodyItems);
    const sectionBodyIndent = Boolean(sectionGate) && sectionExpanded ? 1 : 0;

    const pathLine = block.path.length > 0 ? block.path.join(" → ") : "—";

    out.push({ kind: "section", pathLine });

    if (sectionGate) {
      out.push({
        kind: "item",
        prompt: promptForRow(sectionGate),
        valueDisplay: exportValueDisplayWithComment(sectionGate, responses),
        indent: 0,
      });
    }

    if (sectionExpanded) {
      for (const seg of rowSegments) {
        if (seg.gate) {
          out.push({
            kind: "item",
            prompt: promptForRow(seg.gate),
            valueDisplay: exportValueDisplayWithComment(seg.gate, responses),
            indent: sectionBodyIndent,
          });
          if (isFlowsheetExceptionSelected(responses, seg.gate.id)) {
            for (const d of seg.details) {
              if (isLocationScopedItem(d)) {
                appendLocationScopedExportRows(
                  out,
                  d,
                  responses,
                  sectionBodyIndent + 1,
                );
              } else {
                out.push({
                  kind: "item",
                  prompt: promptForRow(d),
                  valueDisplay: exportValueDisplayWithComment(d, responses),
                  indent: sectionBodyIndent + 1,
                });
              }
            }
          }
        } else {
          for (const d of seg.details) {
            if (isLocationScopedItem(d)) {
              appendLocationScopedExportRows(
                out,
                d,
                responses,
                sectionBodyIndent,
              );
            } else {
              out.push({
                kind: "item",
                prompt: promptForRow(d),
                valueDisplay: exportValueDisplayWithComment(d, responses),
                indent: sectionBodyIndent,
              });
            }
          }
        }
      }
    }
  }

  return out;
}
