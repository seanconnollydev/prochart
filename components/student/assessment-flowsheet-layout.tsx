"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import type {
  AssessmentItem,
  AssessmentTemplate,
} from "@/lib/types/assessment-template";
import type { AssessmentItemResponse } from "@/lib/types/assessment-submission";
import { groupPathLabels } from "@/lib/assessments/group-path";
import {
  buildFlowsheetBlocks,
  coerceFlowsheetMultiselectValue,
  FLOWSHEET_EXCEPTION_CHOICE_ID,
  FLOWSHEET_EXCEPTION_CHOICE_LABEL,
  findSectionRollupGate,
  flowsheetMultiselectChoicesForItem,
  getFlowsheetItemIdsToClearWhenLeavingException,
  getTemplateStoredWdlDefinition,
  isFlowsheetExceptionSelected,
  isFlowsheetMultiselectPresentationItem,
  isFlowsheetWdlGateItem,
  isFlowsheetWdlXComboboxItem,
  prepareFlowsheetTemplate,
  segmentFlowsheetRowItems,
} from "@/lib/assessments/flowsheet";
import { AssessmentChoiceCombobox } from "@/components/student/assessment-choice-combobox";
import { AssessmentFlowsheetInfoPanel } from "@/components/student/assessment-flowsheet-info-panel";
import { AssessmentFlowsheetMultiselect } from "@/components/student/assessment-flowsheet-multiselect";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { SearchIcon } from "@hugeicons/core-free-icons";

type Props = {
  template: AssessmentTemplate;
  responses: Record<string, AssessmentItemResponse>;
  setResponse: (
    itemId: string,
    value: AssessmentItemResponse["value"],
    clearItemIds?: string[],
  ) => void;
  setItemComment: (itemId: string, comment: string | undefined) => void;
  /** Assessment-scoped actions (info / reset / export) rendered above the category rail and table. */
  toolbar?: ReactNode;
  /** Merged onto the root layout wrapper (e.g. height constraints from the parent page). */
  className?: string;
};

function FlowsheetItemTableRow({
  item,
  responses,
  setResponse,
  onWdlXChoiceChange,
  onOpenInfoPanel,
  onSyncInfoPanelOnFocus,
  indentLevel = 0,
}: {
  item: AssessmentItem;
  responses: Record<string, AssessmentItemResponse>;
  setResponse: (itemId: string, value: AssessmentItemResponse["value"]) => void;
  onWdlXChoiceChange: (
    itemId: string,
    value: AssessmentItemResponse["value"],
  ) => void;
  onOpenInfoPanel: (itemId: string) => void;
  onSyncInfoPanelOnFocus: (itemId: string) => void;
  /** Left padding for nested rows (e.g. details under a WDL/X gate). */
  indentLevel?: number;
}) {
  const selId = `flowsheet-${item.id}`;
  const wdlDef = getTemplateStoredWdlDefinition(item);
  const hasPanelChoices = flowsheetMultiselectChoicesForItem(item).length > 0;
  const showInfoPanelTrigger = Boolean(wdlDef) || hasPanelChoices;
  const wdlGateCombo = isFlowsheetWdlXComboboxItem(item);
  const reserveForIcon =
    item.responseType === "choice" ||
    (item.responseType === "multiChoice" && showInfoPanelTrigger);
  const labelPl =
    indentLevel <= 0 ? "pl-3" : indentLevel === 1 ? "pl-8" : "pl-11";
  const valuePl =
    indentLevel <= 0 ? "pl-2" : indentLevel === 1 ? "pl-7" : "pl-10";

  const choiceComboboxChoices =
    item.responseType === "choice" && wdlGateCombo
      ? (item.choices ?? []).map((ch) => ({
          ...ch,
          label: ch.id === FLOWSHEET_EXCEPTION_CHOICE_ID ? FLOWSHEET_EXCEPTION_CHOICE_LABEL : "WDL",
        }))
      : [];

  return (
    <TableRow
      className={cn(
        "hover:bg-muted/30",
        isFlowsheetWdlGateItem(item) && "bg-muted/20",
      )}
    >
      <TableCell
        className={cn(
          "min-w-0 align-top break-words py-1 pr-2 whitespace-normal",
          labelPl,
        )}
      >
        <Label
          htmlFor={selId}
          className="text-foreground text-xs leading-snug font-normal"
        >
          {item.prompt}
        </Label>
      </TableCell>
      <TableCell className={cn("min-w-0 align-top py-1 pr-3", valuePl)}>
        <FlowsheetValueWithWdl
          reserveIconSpace={reserveForIcon}
          showWdl={showInfoPanelTrigger}
          ariaLabel={`View row information for ${item.prompt}`}
          onOpenInfo={() => onOpenInfoPanel(item.id)}
          onSyncInfoPanelOnFocus={() => onSyncInfoPanelOnFocus(item.id)}
        >
          {item.responseType === "choice" && wdlGateCombo ? (
            <AssessmentChoiceCombobox
              id={selId}
              label={item.prompt}
              choices={choiceComboboxChoices}
              value={String(responses[item.id]?.value ?? "")}
              onChange={(v) => onWdlXChoiceChange(item.id, v)}
              className="w-full min-w-0"
            />
          ) : null}
          {isFlowsheetMultiselectPresentationItem(item) ? (
            <AssessmentFlowsheetMultiselect
              id={selId}
              label={item.prompt}
              choices={flowsheetMultiselectChoicesForItem(item)}
              value={coerceFlowsheetMultiselectValue(responses[item.id]?.value)}
              onChange={(ids) => setResponse(item.id, ids)}
              onOpenInfoPanel={() => onOpenInfoPanel(item.id)}
              className="w-full min-w-0"
            />
          ) : null}
          {item.responseType === "boolean" && (
            <label className="flex items-center gap-2 text-xs">
              <Checkbox
                id={selId}
                checked={Boolean(responses[item.id]?.value === true)}
                onCheckedChange={(c) => setResponse(item.id, c === true)}
              />
              Yes / within limits
            </label>
          )}
          {item.responseType === "text" && (
            <Textarea
              id={selId}
              rows={2}
              className="min-h-[52px] resize-y px-2 py-1 text-xs"
              value={String(responses[item.id]?.value ?? "")}
              onChange={(e) => setResponse(item.id, e.target.value)}
              aria-label={item.prompt}
            />
          )}
        </FlowsheetValueWithWdl>
      </TableCell>
    </TableRow>
  );
}

function FlowsheetValueWithWdl({
  reserveIconSpace,
  showWdl,
  ariaLabel,
  onOpenInfo,
  onSyncInfoPanelOnFocus,
  children,
}: {
  reserveIconSpace: boolean;
  showWdl: boolean;
  ariaLabel: string;
  onOpenInfo: () => void;
  onSyncInfoPanelOnFocus: () => void;
  children: ReactNode;
}) {
  if (!reserveIconSpace) {
    return <>{children}</>;
  }
  return (
    <div className="flex min-w-0 items-start gap-1">
      <div
        className="min-w-0 flex-1"
        onFocusCapture={() => {
          if (showWdl) onSyncInfoPanelOnFocus();
        }}
      >
        {children}
      </div>
      {showWdl ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-foreground size-7 shrink-0"
          aria-label={ariaLabel}
          onClick={(e) => {
            e.stopPropagation();
            onOpenInfo();
          }}
        >
          <HugeiconsIcon icon={SearchIcon} strokeWidth={2} className="size-4" />
        </Button>
      ) : (
        <div className="size-7 shrink-0" aria-hidden />
      )}
    </div>
  );
}

function firstLeafGroupIdForRoot(
  groups: AssessmentTemplate["groups"],
  items: AssessmentTemplate["items"],
  rootLabel: string,
): string | undefined {
  for (const item of items) {
    const path = groupPathLabels(groups, item.groupId);
    if (path[0] === rootLabel) {
      return item.groupId;
    }
  }
  return undefined;
}

export function AssessmentFlowsheetLayout({
  template: templateRaw,
  responses,
  setResponse,
  setItemComment,
  toolbar,
  className,
}: Props) {
  const template = useMemo(
    () => prepareFlowsheetTemplate(templateRaw),
    [templateRaw],
  );
  const groups = useMemo(() => template.groups ?? [], [template.groups]);
  const items = template.items;
  const [railQuery, setRailQuery] = useState("");
  const [infoPanelItemId, setInfoPanelItemId] = useState<string | null>(null);

  function syncInfoPanelOnRowFocus(itemId: string) {
    if (infoPanelItemId == null) return;
    if (infoPanelItemId === itemId) return;
    setInfoPanelItemId(itemId);
  }

  const infoPanelItem = infoPanelItemId
    ? items.find((i) => i.id === infoPanelItemId)
    : undefined;
  const infoPanelDefinition =
    infoPanelItem && getTemplateStoredWdlDefinition(infoPanelItem);
  const infoPanelPathLine = infoPanelItem
    ? groupPathLabels(groups, infoPanelItem.groupId).join(" → ")
    : "";

  const rootGroups = useMemo(
    () => groups.filter((g) => g.parentGroupId === null),
    [groups],
  );

  const filteredRoots = useMemo(() => {
    const q = railQuery.trim().toLowerCase();
    if (!q) {
      return rootGroups;
    }
    return rootGroups.filter((r) => {
      if (r.label.toLowerCase().includes(q)) {
        return true;
      }
      return groups.some(
        (g) => g.parentGroupId === r.id && g.label.toLowerCase().includes(q),
      );
    });
  }, [groups, railQuery, rootGroups]);

  const blocks = useMemo(
    () => buildFlowsheetBlocks(items, groups),
    [items, groups],
  );

  const blockByItemId = useMemo(() => {
    const m = new Map<
      string,
      { groupId: string; path: string[]; items: typeof items }
    >();
    for (const b of blocks) {
      for (const it of b.items) {
        m.set(it.id, b);
      }
    }
    return m;
  }, [blocks]);

  const handleFlowsheetResponse = useCallback(
    (itemId: string, value: AssessmentItemResponse["value"]) => {
      const block = blockByItemId.get(itemId);
      if (!block) {
        setResponse(itemId, value);
        return;
      }
      const clearIds = getFlowsheetItemIdsToClearWhenLeavingException(
        groups,
        block,
        itemId,
        value,
        responses,
      );
      setResponse(itemId, value, clearIds);
    },
    [blockByItemId, groups, responses, setResponse],
  );

  function scrollToGroup(groupId: string) {
    const el = document.getElementById(`flowsheet-section-${groupId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleRailClick(rootId: string) {
    const root = groups.find((g) => g.id === rootId);
    if (!root) {
      return;
    }
    const gid = firstLeafGroupIdForRoot(groups, items, root.label);
    if (gid) {
      scrollToGroup(gid);
    }
  }

  return (
    <div
      className={cn(
        "flex min-h-[min(70vh,720px)] max-h-full flex-col rounded-md border",
        className,
      )}
    >
      {toolbar != null ? (
        <div className="bg-background shrink-0 rounded-t-md border-b px-2 py-1.5">
          {toolbar}
        </div>
      ) : null}
      <div className="flex min-h-0 flex-1 gap-0 overflow-x-clip">
        <aside className="bg-muted/40 hidden w-52 shrink-0 flex-col border-r md:flex">
          <div className="border-b p-2">
            <Input
              placeholder="Search categories…"
              value={railQuery}
              onChange={(e) => setRailQuery(e.target.value)}
              className="h-8 text-xs"
              aria-label="Filter body system categories"
            />
          </div>
          <ScrollArea className="min-h-0 flex-1">
            <nav
              className="flex flex-col gap-0.5 p-2"
              aria-label="Assessment categories"
            >
              {filteredRoots.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => handleRailClick(r.id)}
                  className="hover:bg-muted text-foreground cursor-pointer rounded-md px-2 py-1.5 text-left text-xs leading-tight transition-colors"
                >
                  {r.label}
                </button>
              ))}
            </nav>
          </ScrollArea>
        </aside>

        <div className="flex h-full min-h-0 min-w-0 flex-1">
          <div className="bg-background min-w-0 flex-1 overflow-auto">
            <Table className="table-fixed">
              {blocks.map((block) => {
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
                /** Body rows render under optional section rollup; shift them right when expanded. */
                const sectionBodyIndent =
                  Boolean(sectionGate) && sectionExpanded ? 1 : 0;

                const pathLine =
                  block.path.length > 0 ? block.path.join(" → ") : "—";

                const rowProps = {
                  responses,
                  setResponse,
                  onWdlXChoiceChange: handleFlowsheetResponse,
                  onOpenInfoPanel: setInfoPanelItemId,
                  onSyncInfoPanelOnFocus: syncInfoPanelOnRowFocus,
                };

                return (
                  <TableBody
                    key={block.groupId || "ungrouped"}
                    className="border-b"
                    id={`flowsheet-section-${block.groupId}`}
                  >
                    <TableRow className="bg-muted/80 hover:bg-muted/80 border-b-0">
                      <TableCell
                        colSpan={2}
                        className="text-foreground min-w-0 break-words py-1.5 text-xs font-semibold tracking-wide whitespace-normal uppercase"
                      >
                        {pathLine}
                      </TableCell>
                    </TableRow>
                    {sectionGate ? (
                      <FlowsheetItemTableRow item={sectionGate} {...rowProps} />
                    ) : null}
                    {sectionExpanded
                      ? rowSegments.flatMap((seg) => {
                          if (seg.gate) {
                            const out = [
                              <FlowsheetItemTableRow
                                key={seg.gate.id}
                                item={seg.gate}
                                indentLevel={sectionBodyIndent}
                                {...rowProps}
                              />,
                            ];
                            if (
                              isFlowsheetExceptionSelected(
                                responses,
                                seg.gate.id,
                              )
                            ) {
                              for (const d of seg.details) {
                                out.push(
                                  <FlowsheetItemTableRow
                                    key={d.id}
                                    item={d}
                                    indentLevel={sectionBodyIndent + 1}
                                    {...rowProps}
                                  />,
                                );
                              }
                            }
                            return out;
                          }
                          return seg.details.map((d) => (
                            <FlowsheetItemTableRow
                              key={d.id}
                              item={d}
                              indentLevel={sectionBodyIndent}
                              {...rowProps}
                            />
                          ));
                        })
                      : null}
                  </TableBody>
                );
              })}
            </Table>
          </div>

          <AssessmentFlowsheetInfoPanel
            open={Boolean(infoPanelItemId)}
            item={infoPanelItem ?? null}
            definition={infoPanelDefinition ?? null}
            pathLine={infoPanelPathLine}
            responses={responses}
            setResponse={setResponse}
            setItemComment={setItemComment}
            onClose={() => setInfoPanelItemId(null)}
          />
        </div>
      </div>
    </div>
  );
}
