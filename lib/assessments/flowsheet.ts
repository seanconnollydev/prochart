import { groupPathLabels } from "@/lib/assessments/group-path";
import type {
  AssessmentChoice,
  AssessmentGroup,
  AssessmentItem,
  AssessmentTemplate,
} from "@/lib/prototype-alpha/types/assessment-template";
import type { AssessmentItemResponse } from "@/lib/prototype-alpha/types/assessment-submission";

/** Synthetic choice id appended to WDL gate rows for Epic-style “X” (exception) documentation. */
export const FLOWSHEET_EXCEPTION_CHOICE_ID = "ch_flowsheet_exception";

export const FLOWSHEET_EXCEPTION_CHOICE_LABEL = "X";

const WDL_EQUALS_PREFIX = /^\s*WDL\s*=\s*/i;

export function isFlowsheetWdlGateItem(item: AssessmentItem): boolean {
  if (item.responseType !== "choice") {
    return false;
  }
  const p = item.prompt.trim();
  return p.endsWith(" WDL");
}

export function isFlowsheetWdlXComboboxItem(item: AssessmentItem): boolean {
  return isFlowsheetWdlGateItem(item);
}

/**
 * Epic-style detail row: leaf `choice` with WDL narrative on `x_wdlListDefinition` (not in choices),
 * or legacy template with exactly one `WDL=`… choice plus exceptions.
 */
export function isFlowsheetWdlDetailChoiceItem(item: AssessmentItem): boolean {
  if (item.responseType !== "choice") {
    return false;
  }
  if (isFlowsheetWdlGateItem(item)) {
    return false;
  }
  const def =
    typeof item.x_wdlListDefinition === "string"
      ? item.x_wdlListDefinition.trim()
      : "";
  if (def !== "") {
    return (item.choices ?? []).length >= 1;
  }
  const cs = item.choices ?? [];
  let wdlSlotCount = 0;
  for (const c of cs) {
    if (WDL_EQUALS_PREFIX.test(c.label)) {
      wdlSlotCount += 1;
    }
  }
  return wdlSlotCount === 1 && cs.length >= 2;
}

/** Flowsheet grid + panel: multiselect UI for `multiChoice` and leaf (non-gate) `choice` rows. */
export function isFlowsheetMultiselectPresentationItem(item: AssessmentItem): boolean {
  return (
    item.responseType === "multiChoice" ||
    (item.responseType === "choice" && !isFlowsheetWdlGateItem(item))
  );
}

/** Normalize stored response for multiselect rows (legacy single `string` or `string[]`). */
export function coerceFlowsheetMultiselectValue(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === "string");
  }
  if (typeof raw === "string" && raw !== "") {
    return [raw];
  }
  return [];
}

/** @deprecated Legacy: choice ids whose labels used a `WDL=` row; modern templates use {@link AssessmentItem.x_wdlListDefinition} instead. */
export function flowsheetWdlSlotChoiceIds(item: AssessmentItem): Set<string> {
  const out = new Set<string>();
  for (const c of item.choices ?? []) {
    if (WDL_EQUALS_PREFIX.test(c.label)) {
      out.add(c.id);
    }
  }
  return out;
}

/** Remove WDL-slot choice ids from stored multiselect values (those options are not in the UI). */
export function stripFlowsheetMultiselectWdlSlotIds(
  item: AssessmentItem,
  ids: string[],
): string[] {
  const drop = flowsheetWdlSlotChoiceIds(item);
  return ids.filter((id) => !drop.has(id));
}

/**
 * Multiselect options: exception labels only. Drops any legacy `WDL=`… choice rows (prefer
 * `x_wdlListDefinition` on the item instead).
 */
export function flowsheetMultiselectChoicesForItem(item: AssessmentItem): AssessmentChoice[] {
  const withoutWdlSlot = (cs: AssessmentChoice[]) =>
    cs.filter((ch) => !WDL_EQUALS_PREFIX.test(ch.label));

  if (item.responseType === "multiChoice") {
    return withoutWdlSlot(item.choices ?? []);
  }
  if (item.responseType !== "choice" || isFlowsheetWdlGateItem(item)) {
    return [];
  }
  return withoutWdlSlot(item.choices ?? []);
}

export function gateHasExceptionChoice(item: AssessmentItem): boolean {
  return (item.choices ?? []).some((c) => c.id === FLOWSHEET_EXCEPTION_CHOICE_ID);
}

/** Ensures the synthetic exception choice exists on gate items; idempotent. */
export function ensureFlowsheetGateChoices(item: AssessmentItem): AssessmentItem {
  if (!isFlowsheetWdlXComboboxItem(item)) {
    return item;
  }
  const choices = [...(item.choices ?? [])];
  if (choices.some((c) => c.id === FLOWSHEET_EXCEPTION_CHOICE_ID)) {
    return item;
  }
  const ex: AssessmentChoice = {
    id: FLOWSHEET_EXCEPTION_CHOICE_ID,
    label: FLOWSHEET_EXCEPTION_CHOICE_LABEL,
  };
  return { ...item, choices: [...choices, ex] };
}

/** Clone template and augment WDL gate rows for flowsheet UX. */
export function prepareFlowsheetTemplate(template: AssessmentTemplate): AssessmentTemplate {
  return {
    ...template,
    items: template.items.map((it) => ensureFlowsheetGateChoices(it)),
  };
}

export function isFlowsheetExceptionSelected(
  responses: Record<string, AssessmentItemResponse>,
  gateItemId: string,
): boolean {
  const v = responses[gateItemId]?.value;
  return v === FLOWSHEET_EXCEPTION_CHOICE_ID;
}

/** WDL path: any selection other than the exception choice (including empty / undefined). */
export function isFlowsheetWdlPath(
  responses: Record<string, AssessmentItemResponse>,
  gateItemId: string,
): boolean {
  return !isFlowsheetExceptionSelected(responses, gateItemId);
}

export function findGateItemForGroup(
  groupId: string,
  items: AssessmentItem[],
): AssessmentItem | undefined {
  return items.find((it) => it.groupId === groupId && isFlowsheetWdlGateItem(it));
}

export function isSectionRollupGateItem(item: AssessmentItem): boolean {
  return item.x_flowsheetSectionRollup === true;
}

export function findSectionRollupGate(
  groupId: string,
  _groupLabel: string,
  items: AssessmentItem[],
): AssessmentItem | undefined {
  return items.find(
    (it) => it.groupId === groupId && isSectionRollupGateItem(it),
  );
}

/** One group’s contiguous items in template order (as used by the flowsheet layout). */
export type FlowsheetBlock = {
  groupId: string;
  items: AssessmentItem[];
};

/** Block with ancestry path labels (root → leaf), used by layout and PDF export. */
export type FlowsheetLayoutBlock = FlowsheetBlock & {
  path: string[];
};

/**
 * Groups template items into contiguous blocks by `groupId`, preserving template order.
 */
export function buildFlowsheetBlocks(
  items: AssessmentItem[],
  groups: AssessmentGroup[] | undefined,
): FlowsheetLayoutBlock[] {
  const g = groups ?? [];
  const result: FlowsheetLayoutBlock[] = [];
  for (const item of items) {
    const gid = item.groupId ?? "";
    const path = groupPathLabels(g, item.groupId);
    const last = result[result.length - 1];
    if (last && last.groupId === gid) {
      last.items.push(item);
    } else {
      result.push({ groupId: gid, path, items: [item] });
    }
  }
  return result;
}

/**
 * When a WDL/X combobox leaves exception (X) for WDL, returns response keys to remove for nested
 * rows: section rollup clears all other items in the block; a row gate clears that segment’s details.
 */
export function getFlowsheetItemIdsToClearWhenLeavingException(
  groups: AssessmentTemplate["groups"],
  block: FlowsheetBlock,
  itemId: string,
  newValue: AssessmentItemResponse["value"],
  responses: Record<string, AssessmentItemResponse>,
): string[] {
  const item = block.items.find((i) => i.id === itemId);
  if (!item || !isFlowsheetWdlXComboboxItem(item)) {
    return [];
  }
  const prevEx = isFlowsheetExceptionSelected(responses, itemId);
  const nextIsException = newValue === FLOWSHEET_EXCEPTION_CHOICE_ID;
  if (!prevEx || nextIsException) {
    return [];
  }

  const groupLabel = groups?.find((g) => g.id === block.groupId)?.label ?? "";
  const sectionGate = findSectionRollupGate(
    block.groupId,
    groupLabel,
    block.items,
  );

  if (isSectionRollupGateItem(item)) {
    return block.items.filter((i) => i.id !== itemId).map((i) => i.id);
  }

  if (isFlowsheetWdlGateItem(item)) {
    const bodyItems = sectionGate
      ? block.items.filter((i) => i.id !== sectionGate.id)
      : block.items;
    const segments = segmentFlowsheetRowItems(bodyItems);
    const seg = segments.find((s) => s.gate?.id === itemId);
    return seg ? seg.details.map((d) => d.id) : [];
  }

  return [];
}

export type FlowsheetRowSegment = {
  gate?: AssessmentItem;
  details: AssessmentItem[];
};

/**
 * Partition items (already excluding section rollup) into row-level segments:
 * each gate is followed by its detail rows until the next gate.
 */
export function segmentFlowsheetRowItems(
  itemsInTemplateOrder: AssessmentItem[],
): FlowsheetRowSegment[] {
  const segments: FlowsheetRowSegment[] = [];
  let i = 0;
  while (i < itemsInTemplateOrder.length) {
    const item = itemsInTemplateOrder[i];
    if (isFlowsheetWdlGateItem(item)) {
      const gate = item;
      const details: AssessmentItem[] = [];
      i += 1;
      while (
        i < itemsInTemplateOrder.length &&
        !isFlowsheetWdlGateItem(itemsInTemplateOrder[i])
      ) {
        details.push(itemsInTemplateOrder[i]);
        i += 1;
      }
      segments.push({ gate, details });
    } else {
      const details: AssessmentItem[] = [];
      while (
        i < itemsInTemplateOrder.length &&
        !isFlowsheetWdlGateItem(itemsInTemplateOrder[i])
      ) {
        details.push(itemsInTemplateOrder[i]);
        i += 1;
      }
      if (details.length > 0) {
        segments.push({ gate: undefined, details });
      }
    }
  }
  return segments;
}

/** Non-gate items in the same group (detail rows). */
export function flowsheetDetailItemsForGroup(
  groupId: string,
  items: AssessmentItem[],
  gateItemId: string,
): AssessmentItem[] {
  return items.filter((it) => it.groupId === groupId && it.id !== gateItemId);
}

/** Gate row first, then other items in template order. */
export function flowsheetOrderedItemsForGroup(
  groupId: string,
  items: AssessmentItem[],
  gate: AssessmentItem | undefined,
): AssessmentItem[] {
  const inGroup = items.filter((it) => it.groupId === groupId);
  if (!gate) {
    return inGroup;
  }
  const rest = inGroup.filter((it) => it.id !== gate.id);
  return [gate, ...rest];
}

/**
 * Narrative shown in the WDL info panel: gate rows use non-exception choice label(s);
 * other choice rows use text after `WDL =` on a matching choice.
 */
function narrativeAfterWdlEquals(label: string): string {
  const t = label.trim();
  const match = t.match(WDL_EQUALS_PREFIX);
  if (match && match.index !== undefined) {
    return t.slice(match.index + match[0].length).trim();
  }
  return t;
}

export function getWdlDefinitionForItem(item: AssessmentItem): string | null {
  if (
    (item.responseType === "multiChoice" || item.responseType === "choice") &&
    typeof item.x_wdlListDefinition === "string" &&
    item.x_wdlListDefinition.trim() !== ""
  ) {
    return item.x_wdlListDefinition;
  }
  if (
    item.x_flowsheetSectionRollup === true &&
    typeof item.x_flowsheetSectionAggregateWdlDefinition === "string" &&
    item.x_flowsheetSectionAggregateWdlDefinition.trim() !== ""
  ) {
    return item.x_flowsheetSectionAggregateWdlDefinition.trim();
  }
  if (isFlowsheetWdlGateItem(item)) {
    const parts = (item.choices ?? [])
      .filter((c) => c.id !== FLOWSHEET_EXCEPTION_CHOICE_ID)
      .map((c) => narrativeAfterWdlEquals(c.label))
      .filter(Boolean);
    if (parts.length === 0) {
      return null;
    }
    return parts.join("\n\n");
  }
  if (item.responseType === "choice" || item.responseType === "multiChoice") {
    for (const c of item.choices ?? []) {
      const label = c.label;
      if (WDL_EQUALS_PREFIX.test(label)) {
        return narrativeAfterWdlEquals(label);
      }
    }
  }
  return null;
}

/** Split definition copy into bullet segments (paragraph breaks, then semicolons). */
export function segmentWdlDefinitionText(text: string): string[] {
  const t = text.trim();
  const paragraphs = t.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);
  const chunks = paragraphs.length > 1 ? paragraphs : [t];
  const out: string[] = [];
  for (const chunk of chunks) {
    const bySemi = chunk
      .split(";")
      .map((s) => s.trim())
      .filter(Boolean);
    if (bySemi.length > 1) {
      out.push(...bySemi);
    } else {
      out.push(chunk);
    }
  }
  return out.length > 0 ? out : [t];
}
