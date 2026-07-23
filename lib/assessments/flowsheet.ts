import { groupPathLabels } from "@/lib/assessments/group-path";
import type {
  AssessmentChoice,
  AssessmentGroup,
  AssessmentItem,
  AssessmentTemplate,
  LocationScopedField,
} from "@/lib/types/assessment-template";
import type {
  AssessmentItemResponse,
  LocationScopedFindingEntry,
  LocationScopedFindingValue,
} from "@/lib/types/assessment-submission";

/** Synthetic choice id appended to WDL gate rows for exception documentation. */
export const FLOWSHEET_EXCEPTION_CHOICE_ID = "ch_exception";

export const FLOWSHEET_EXCEPTION_CHOICE_LABEL = "Exception";

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

export function isLocationScopedItem(item: AssessmentItem): boolean {
  return item.responseType === "locationScoped";
}

/** Flowsheet grid + panel: multiselect UI for `multiChoice` and leaf (non-gate) `choice` rows. */
export function isFlowsheetMultiselectPresentationItem(
  item: AssessmentItem,
): boolean {
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

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Normalize stored `locationScoped` response value. */
export function coerceLocationScopedFindingValue(
  raw: unknown,
): LocationScopedFindingValue {
  if (!Array.isArray(raw)) {
    return [];
  }
  const out: LocationScopedFindingValue = [];
  for (const entry of raw) {
    if (!isRecord(entry) || typeof entry.locationId !== "string") {
      continue;
    }
    const fieldsRaw = entry.fields;
    const fields: Record<string, string[]> = {};
    if (isRecord(fieldsRaw)) {
      for (const [k, v] of Object.entries(fieldsRaw)) {
        fields[k] = coerceFlowsheetMultiselectValue(v);
      }
    }
    out.push({ locationId: entry.locationId, fields });
  }
  return out;
}

/** Selected location ids from a location-scoped value (selection order). */
export function locationScopedSelectedLocationIds(
  value: LocationScopedFindingValue,
): string[] {
  return value.map((e) => e.locationId);
}

/**
 * Sync location picker selection with nested field state: add empty entries for
 * new locations (append order), drop removed locations and their fields.
 */
export function setLocationScopedLocations(
  prev: LocationScopedFindingValue,
  nextLocationIds: string[],
): LocationScopedFindingValue {
  const prevById = new Map(prev.map((e) => [e.locationId, e]));
  const next: LocationScopedFindingValue = [];
  for (const locationId of nextLocationIds) {
    const existing = prevById.get(locationId);
    if (existing) {
      next.push(existing);
    } else {
      next.push({ locationId, fields: {} });
    }
  }
  return next;
}

/** Update one nested field's multiselect under a location. */
export function setLocationScopedFieldValue(
  prev: LocationScopedFindingValue,
  locationId: string,
  fieldKey: string,
  choiceIds: string[],
): LocationScopedFindingValue {
  return prev.map((entry) => {
    if (entry.locationId !== locationId) {
      return entry;
    }
    return {
      ...entry,
      fields: {
        ...entry.fields,
        [fieldKey]: choiceIds,
      },
    };
  });
}

export function getLocationScopedFieldValue(
  entry: LocationScopedFindingEntry | undefined,
  fieldKey: string,
): string[] {
  if (!entry) {
    return [];
  }
  return coerceFlowsheetMultiselectValue(entry.fields[fieldKey]);
}

export function locationChoiceLabel(
  item: AssessmentItem,
  locationId: string,
): string {
  return (
    (item.locationChoices ?? []).find((c) => c.id === locationId)?.label ??
    locationId
  );
}

export function findLocationScopedField(
  item: AssessmentItem,
  fieldKey: string,
): LocationScopedField | undefined {
  return (item.locationScopedFields ?? []).find((f) => f.key === fieldKey);
}

/** Multiselect options for flowsheet UI. */
export function flowsheetMultiselectChoicesForItem(
  item: AssessmentItem,
): AssessmentChoice[] {
  if (item.responseType === "multiChoice") {
    return item.choices ?? [];
  }
  if (item.responseType !== "choice" || isFlowsheetWdlGateItem(item)) {
    return [];
  }
  return item.choices ?? [];
}

export function gateHasExceptionChoice(item: AssessmentItem): boolean {
  return (item.choices ?? []).some(
    (c) => c.id === FLOWSHEET_EXCEPTION_CHOICE_ID,
  );
}

/** Ensures the synthetic exception choice exists on gate items; idempotent. */
export function ensureFlowsheetGateChoices(
  item: AssessmentItem,
): AssessmentItem {
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
export function prepareFlowsheetTemplate(
  template: AssessmentTemplate,
): AssessmentTemplate {
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
  return items.find(
    (it) => it.groupId === groupId && isFlowsheetWdlGateItem(it),
  );
}

export function isSectionRollupGateItem(item: AssessmentItem): boolean {
  return item.flowsheetSectionRollup === true;
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
 * Text after `WDL =` in a choice label, or the full label if absent.
 * Used by {@link getWdlDefinitionForItem} for gate rows.
 */
function narrativeAfterWdlEquals(label: string): string {
  const t = label.trim();
  const match = t.match(WDL_EQUALS_PREFIX);
  if (match && match.index !== undefined) {
    return t.slice(match.index + match[0].length).trim();
  }
  return t;
}

/**
 * WDL narrative stored on the template (`wdlListDefinition`, section aggregate).
 * Flowsheet sidebar uses this—not gate choice labels—for “Within Defined Limits” copy.
 */
export function getTemplateStoredWdlDefinition(
  item: AssessmentItem,
): string | null {
  if (
    (item.responseType === "multiChoice" || item.responseType === "choice") &&
    typeof item.wdlListDefinition === "string" &&
    item.wdlListDefinition.trim() !== ""
  ) {
    return item.wdlListDefinition;
  }
  if (
    item.flowsheetSectionRollup === true &&
    typeof item.flowsheetSectionAggregateWdlDefinition === "string" &&
    item.flowsheetSectionAggregateWdlDefinition.trim() !== ""
  ) {
    return item.flowsheetSectionAggregateWdlDefinition.trim();
  }
  return null;
}

/**
 * Full WDL narrative for an item: template fields first, then gate choice labels.
 */
export function getWdlDefinitionForItem(item: AssessmentItem): string | null {
  const fromTemplate = getTemplateStoredWdlDefinition(item);
  if (fromTemplate) {
    return fromTemplate;
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
  return null;
}

/** Split definition copy into bullet segments (paragraph breaks, then ". " sentence boundaries). */
export function segmentWdlDefinitionText(text: string): string[] {
  const t = text.trim();
  const paragraphs = t
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const chunks = paragraphs.length > 1 ? paragraphs : [t];
  const out: string[] = [];
  for (const chunk of chunks) {
    const bySentence = chunk
      .split(/\.\s+/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (bySentence.length <= 1) {
      out.push(chunk);
    } else {
      for (let i = 0; i < bySentence.length; i++) {
        let seg = bySentence[i];
        if (i < bySentence.length - 1 && !/\.$/.test(seg)) {
          seg += ".";
        }
        out.push(seg);
      }
    }
  }
  return out.length > 0 ? out : [t];
}
