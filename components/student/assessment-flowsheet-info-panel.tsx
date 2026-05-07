"use client";

import type { AssessmentItem } from "@/lib/prototype-alpha/types/assessment-template";
import type { AssessmentItemResponse } from "@/lib/prototype-alpha/types/assessment-submission";
import {
  coerceFlowsheetMultiselectValue,
  flowsheetMultiselectChoicesForItem,
  isFlowsheetMultiselectPresentationItem,
  isFlowsheetWdlGateItem,
  segmentWdlDefinitionText,
  stripFlowsheetMultiselectWdlSlotIds,
} from "@/lib/assessments/flowsheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon } from "@hugeicons/core-free-icons";

type Props = {
  open: boolean;
  item: AssessmentItem | null;
  definition: string | null;
  pathLine: string;
  responses: Record<string, AssessmentItemResponse>;
  setResponse: (
    itemId: string,
    value: AssessmentItemResponse["value"],
  ) => void;
  onClose: () => void;
};

export function AssessmentFlowsheetInfoPanel({
  open,
  item,
  definition,
  pathLine,
  responses,
  setResponse,
  onClose,
}: Props) {
  const trimmedDefinition = definition?.trim() ?? "";
  const hasWdlDefinition = trimmedDefinition !== "";
  const wdlSegments = segmentWdlDefinitionText(trimmedDefinition);

  return (
    <aside
      className={cn(
        "border-border bg-muted/10 flex min-h-0 flex-col border-l transition-[width] duration-200 ease-out",
        open
          ? "sticky top-4 h-full max-h-[calc(100dvh-10rem)] min-h-0 w-[min(22rem,40vw)] shrink-0 overflow-hidden"
          : "w-0 shrink-0 overflow-hidden border-l-0",
      )}
      aria-hidden={!open}
    >
      {item ? (
        <div className="flex h-full min-h-0 min-w-[min(22rem,40vw)] flex-1 flex-col overflow-hidden">
          <div className="border-b px-3 py-2.5 shrink-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-muted-foreground line-clamp-2 text-[10px] leading-tight">
                  {pathLine || "—"}
                </p>
                <p className="text-foreground mt-0.5 text-xs font-semibold leading-snug">
                  {item.prompt}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="shrink-0"
                aria-label="Close info panel"
                onClick={onClose}
              >
                <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
              </Button>
            </div>
            {isFlowsheetWdlGateItem(item) ? (
              <p className="text-muted-foreground mt-2 text-[10px] leading-snug">
                WDL = Within defined limits. X = Exceptions to WDL.
              </p>
            ) : null}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="p-3">
              {isFlowsheetMultiselectPresentationItem(item)
                ? (() => {
                    const panelChoices =
                      flowsheetMultiselectChoicesForItem(item);
                    if (panelChoices.length === 0) {
                      return null;
                    }
                    const selectedIds = stripFlowsheetMultiselectWdlSlotIds(
                      item,
                      coerceFlowsheetMultiselectValue(
                        responses[item.id]?.value,
                      ),
                    );
                    return (
                      <>
                        <p className="text-muted-foreground mb-2 text-[10px] font-medium tracking-wide uppercase">
                          Options
                        </p>
                        <div
                          className="mb-3 space-y-2"
                          role="group"
                          aria-label={`Options for ${item.prompt}`}
                        >
                          {panelChoices.map((ch) => {
                            const checked = selectedIds.includes(ch.id);
                            return (
                              <div
                                key={ch.id}
                                className="flex items-start gap-2"
                              >
                                <Checkbox
                                  id={`flowsheet-info-${item.id}-${ch.id}`}
                                  checked={checked}
                                  onCheckedChange={(c) => {
                                    const next = new Set(selectedIds);
                                    if (c === true) {
                                      next.add(ch.id);
                                    } else {
                                      next.delete(ch.id);
                                    }
                                    setResponse(
                                      item.id,
                                      stripFlowsheetMultiselectWdlSlotIds(
                                        item,
                                        [...next],
                                      ),
                                    );
                                  }}
                                  className="mt-0.5"
                                />
                                <Label
                                  htmlFor={`flowsheet-info-${item.id}-${ch.id}`}
                                  className="text-foreground text-xs font-normal leading-snug"
                                >
                                  {ch.label}
                                </Label>
                              </div>
                            );
                          })}
                        </div>
                        {hasWdlDefinition ? (
                          <Separator className="mb-3" />
                        ) : null}
                      </>
                    );
                  })()
                : null}
              {hasWdlDefinition ? (
                <>
                  <p className="text-muted-foreground mb-2 text-[10px] font-medium leading-snug">
                    Within Defined Limits (WDL) =
                  </p>
                  {wdlSegments.length === 1 ? (
                    <p className="text-foreground text-xs leading-relaxed">
                      {wdlSegments[0]}
                    </p>
                  ) : (
                    <ul className="text-foreground list-disc space-y-1.5 pl-4 text-xs leading-relaxed">
                      {wdlSegments.map((segment, i) => (
                        <li key={i}>{segment}</li>
                      ))}
                    </ul>
                  )}
                </>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </aside>
  );
}
