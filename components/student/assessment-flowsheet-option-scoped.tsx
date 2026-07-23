"use client";

import { Fragment, useState } from "react";
import type {
  AssessmentChoice,
  AssessmentItem,
} from "@/lib/types/assessment-template";
import type {
  AssessmentItemResponse,
  OptionScopedFindingValue,
} from "@/lib/types/assessment-submission";
import {
  addOptionScopedChoice,
  coerceOptionScopedFindingValue,
  getOptionScopedEntry,
  optionChoiceLabel,
  optionScopedSelectedChoiceIds,
  removeOptionScopedChoice,
  setOptionScopedLocations,
} from "@/lib/assessments/flowsheet";
import { AssessmentFlowsheetMultiselect } from "@/components/student/assessment-flowsheet-multiselect";
import { Button, buttonVariants } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Cancel01Icon,
  PlusSignIcon,
  SearchIcon,
} from "@hugeicons/core-free-icons";

export type OptionScopedInfoTarget =
  | { kind: "field"; itemId: string; fieldKey: string }
  | {
      kind: "locations";
      itemId: string;
      fieldKey: string;
      choiceId: string;
    };

type Props = {
  item: AssessmentItem;
  responses: Record<string, AssessmentItemResponse>;
  setResponse: (itemId: string, value: AssessmentItemResponse["value"]) => void;
  indentLevel?: number;
  onOpenInfo: (target: OptionScopedInfoTarget) => void;
  onSyncInfoPanelOnFocus: (target: OptionScopedInfoTarget) => void;
};

function labelPadding(indentLevel: number): string {
  if (indentLevel <= 0) return "pl-3";
  if (indentLevel === 1) return "pl-8";
  if (indentLevel === 2) return "pl-11";
  return "pl-[3.5rem]";
}

function valuePadding(indentLevel: number): string {
  if (indentLevel <= 0) return "pl-2";
  if (indentLevel === 1) return "pl-7";
  if (indentLevel === 2) return "pl-10";
  return "pl-[3.25rem]";
}

function AddFindingButton({
  label,
  choices,
  disabled,
  onAdd,
}: {
  label: string;
  choices: AssessmentChoice[];
  disabled?: boolean;
  onAdd: (choiceId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const isDisabled = disabled || choices.length === 0;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        type="button"
        disabled={isDisabled}
        aria-label={label}
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "text-muted-foreground hover:text-foreground size-7 shrink-0",
        )}
      >
        <HugeiconsIcon icon={PlusSignIcon} strokeWidth={2} className="size-4" />
      </PopoverTrigger>
      <PopoverContent
        align="end"
        side="bottom"
        sideOffset={4}
        className="w-[min(100vw-2rem,20rem)] gap-0 rounded-md p-1 shadow-md"
      >
        <div
          className="max-h-72 overflow-y-auto"
          role="listbox"
          aria-label={label}
        >
          {choices.map((ch) => (
            <button
              key={ch.id}
              type="button"
              role="option"
              aria-selected={false}
              className="hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground w-full cursor-pointer rounded-sm px-2 py-1.5 text-left text-xs leading-snug outline-none"
              onClick={() => {
                onAdd(ch.id);
                setOpen(false);
              }}
            >
              {ch.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Option-scoped flowsheet rows: field header with persistent + / info actions;
 * each finding is a single row with locations + remove.
 */
export function FlowsheetOptionScopedRows({
  item,
  responses,
  setResponse,
  indentLevel = 0,
  onOpenInfo,
  onSyncInfoPanelOnFocus,
}: Props) {
  const value = coerceOptionScopedFindingValue(responses[item.id]?.value);
  const fields = item.optionScopedFields ?? [];
  const locationChoices = item.locationChoices ?? [];

  function writeValue(next: OptionScopedFindingValue) {
    setResponse(item.id, next);
  }

  return (
    <Fragment>
      {fields.map((field) => {
        const selectedIds = optionScopedSelectedChoiceIds(value, field.key);
        const selectedSet = new Set(selectedIds);
        const availableChoices = field.choices.filter(
          (c) => !selectedSet.has(c.id),
        );
        const fieldTarget: OptionScopedInfoTarget = {
          kind: "field",
          itemId: item.id,
          fieldKey: field.key,
        };
        const showFieldInfo =
          Boolean(field.wdlListDefinition?.trim()) || field.choices.length > 0;
        const addLabel = `Add ${field.prompt}`;

        return (
          <Fragment key={`${item.id}-${field.key}`}>
            <TableRow className="hover:bg-muted/30">
              <TableCell
                className={cn(
                  "min-w-0 align-middle break-words py-1 pr-2 whitespace-normal",
                  labelPadding(indentLevel),
                )}
              >
                <Label className="text-foreground text-xs leading-snug font-normal">
                  {field.prompt}
                </Label>
              </TableCell>
              <TableCell
                className={cn(
                  "min-w-0 align-middle py-1 pr-3",
                  valuePadding(indentLevel),
                )}
              >
                <div className="flex min-w-0 items-center justify-end gap-1">
                  <AddFindingButton
                    label={addLabel}
                    choices={availableChoices}
                    disabled={availableChoices.length === 0}
                    onAdd={(choiceId) =>
                      writeValue(
                        addOptionScopedChoice(value, field.key, choiceId),
                      )
                    }
                  />
                  {showFieldInfo ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="text-muted-foreground hover:text-foreground size-7 shrink-0"
                      aria-label={`View row information for ${field.prompt}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenInfo(fieldTarget);
                      }}
                    >
                      <HugeiconsIcon
                        icon={SearchIcon}
                        strokeWidth={2}
                        className="size-4"
                      />
                    </Button>
                  ) : (
                    <div className="size-7 shrink-0" aria-hidden />
                  )}
                </div>
              </TableCell>
            </TableRow>
            {selectedIds.map((choiceId) => {
              const entry = getOptionScopedEntry(value, field.key, choiceId);
              const choiceLabel = optionChoiceLabel(field, choiceId);
              const locId = `flowsheet-${item.id}-${field.key}-${choiceId}-locations`;
              const locTarget: OptionScopedInfoTarget = {
                kind: "locations",
                itemId: item.id,
                fieldKey: field.key,
                choiceId,
              };
              return (
                <TableRow
                  key={`${item.id}-${field.key}-${choiceId}`}
                  className="hover:bg-muted/30"
                >
                  <TableCell
                    className={cn(
                      "min-w-0 align-middle break-words py-1 pr-2 whitespace-normal",
                      labelPadding(indentLevel + 1),
                    )}
                  >
                    <span className="text-foreground text-xs leading-snug font-normal">
                      {choiceLabel}
                    </span>
                  </TableCell>
                  <TableCell
                    className={cn(
                      "min-w-0 align-middle py-1 pr-3",
                      valuePadding(indentLevel + 1),
                    )}
                  >
                    <div className="flex min-w-0 items-center gap-1">
                      <div
                        className="min-w-0 flex-1"
                        onFocusCapture={() =>
                          onSyncInfoPanelOnFocus(locTarget)
                        }
                      >
                        <AssessmentFlowsheetMultiselect
                          id={locId}
                          label={`${choiceLabel}: Locations`}
                          choices={locationChoices}
                          value={entry?.locationIds ?? []}
                          onChange={(ids) =>
                            writeValue(
                              setOptionScopedLocations(
                                value,
                                field.key,
                                choiceId,
                                ids,
                              ),
                            )
                          }
                          placeholder="Select location(s)"
                          className="w-full min-w-0"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground size-7 shrink-0"
                        aria-label={`Remove ${choiceLabel}`}
                        onClick={() =>
                          writeValue(
                            removeOptionScopedChoice(
                              value,
                              field.key,
                              choiceId,
                            ),
                          )
                        }
                      >
                        <HugeiconsIcon
                          icon={Cancel01Icon}
                          strokeWidth={2}
                          className="size-4"
                        />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-foreground size-7 shrink-0"
                        aria-label={`View row information for Locations (${choiceLabel})`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenInfo(locTarget);
                        }}
                      >
                        <HugeiconsIcon
                          icon={SearchIcon}
                          strokeWidth={2}
                          className="size-4"
                        />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </Fragment>
        );
      })}
    </Fragment>
  );
}
