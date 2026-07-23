"use client";

import { Fragment } from "react";
import type { AssessmentItem } from "@/lib/types/assessment-template";
import type {
  AssessmentItemResponse,
  LocationScopedFindingValue,
} from "@/lib/types/assessment-submission";
import {
  coerceLocationScopedFindingValue,
  getLocationScopedFieldValue,
  locationChoiceLabel,
  locationScopedSelectedLocationIds,
  setLocationScopedFieldValue,
  setLocationScopedLocations,
} from "@/lib/assessments/flowsheet";
import { AssessmentFlowsheetMultiselect } from "@/components/student/assessment-flowsheet-multiselect";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { SearchIcon } from "@hugeicons/core-free-icons";

export type LocationScopedInfoTarget =
  | { kind: "locations"; itemId: string }
  | {
      kind: "field";
      itemId: string;
      locationId: string;
      fieldKey: string;
    };

type Props = {
  item: AssessmentItem;
  responses: Record<string, AssessmentItemResponse>;
  setResponse: (itemId: string, value: AssessmentItemResponse["value"]) => void;
  indentLevel?: number;
  onOpenInfo: (target: LocationScopedInfoTarget) => void;
  onSyncInfoPanelOnFocus: (target: LocationScopedInfoTarget) => void;
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

function ValueWithInfo({
  showInfo,
  ariaLabel,
  onOpenInfo,
  onSyncInfoPanelOnFocus,
  children,
}: {
  showInfo: boolean;
  ariaLabel: string;
  onOpenInfo: () => void;
  onSyncInfoPanelOnFocus: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-start gap-1">
      <div
        className="min-w-0 flex-1"
        onFocusCapture={() => {
          if (showInfo) onSyncInfoPanelOnFocus();
        }}
      >
        {children}
      </div>
      {showInfo ? (
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

/** Expands a `locationScoped` item into location picker + per-location nested field rows. */
export function FlowsheetLocationScopedRows({
  item,
  responses,
  setResponse,
  indentLevel = 0,
  onOpenInfo,
  onSyncInfoPanelOnFocus,
}: Props) {
  const value = coerceLocationScopedFindingValue(responses[item.id]?.value);
  const locationChoices = item.locationChoices ?? [];
  const fields = item.locationScopedFields ?? [];
  const selectedLocationIds = locationScopedSelectedLocationIds(value);

  function writeValue(next: LocationScopedFindingValue) {
    setResponse(item.id, next);
  }

  const locPickerId = `flowsheet-${item.id}-locations`;
  const locationsTarget: LocationScopedInfoTarget = {
    kind: "locations",
    itemId: item.id,
  };

  return (
    <Fragment>
      <TableRow className="hover:bg-muted/30">
        <TableCell
          className={cn(
            "min-w-0 align-top break-words py-1 pr-2 whitespace-normal",
            labelPadding(indentLevel),
          )}
        >
          <Label
            htmlFor={locPickerId}
            className="text-foreground text-xs leading-snug font-normal"
          >
            Locations
          </Label>
        </TableCell>
        <TableCell
          className={cn(
            "min-w-0 align-top py-1 pr-3",
            valuePadding(indentLevel),
          )}
        >
          <ValueWithInfo
            showInfo={locationChoices.length > 0}
            ariaLabel="View row information for Locations"
            onOpenInfo={() => onOpenInfo(locationsTarget)}
            onSyncInfoPanelOnFocus={() =>
              onSyncInfoPanelOnFocus(locationsTarget)
            }
          >
            <AssessmentFlowsheetMultiselect
              id={locPickerId}
              label="Locations"
              choices={locationChoices}
              value={selectedLocationIds}
              onChange={(ids) =>
                writeValue(setLocationScopedLocations(value, ids))
              }
              className="w-full min-w-0"
            />
          </ValueWithInfo>
        </TableCell>
      </TableRow>
      {value.map((entry) => {
        const locLabel = locationChoiceLabel(item, entry.locationId);
        return (
          <Fragment key={`${item.id}-loc-${entry.locationId}`}>
            <TableRow className="bg-muted/15 hover:bg-muted/15">
              <TableCell
                colSpan={2}
                className={cn(
                  "text-foreground min-w-0 break-words py-1 pr-2 text-xs font-medium whitespace-normal",
                  labelPadding(indentLevel + 1),
                )}
              >
                {locLabel}
              </TableCell>
            </TableRow>
            {fields.map((field) => {
              const fieldId = `flowsheet-${item.id}-${entry.locationId}-${field.key}`;
              const fieldTarget: LocationScopedInfoTarget = {
                kind: "field",
                itemId: item.id,
                locationId: entry.locationId,
                fieldKey: field.key,
              };
              const showInfo =
                Boolean(field.wdlListDefinition?.trim()) ||
                field.choices.length > 0;
              return (
                <TableRow
                  key={`${item.id}-${entry.locationId}-${field.key}`}
                  className="hover:bg-muted/30"
                >
                  <TableCell
                    className={cn(
                      "min-w-0 align-top break-words py-1 pr-2 whitespace-normal",
                      labelPadding(indentLevel + 2),
                    )}
                  >
                    <Label
                      htmlFor={fieldId}
                      className="text-foreground text-xs leading-snug font-normal"
                    >
                      {field.prompt}
                    </Label>
                  </TableCell>
                  <TableCell
                    className={cn(
                      "min-w-0 align-top py-1 pr-3",
                      valuePadding(indentLevel + 2),
                    )}
                  >
                    <ValueWithInfo
                      showInfo={showInfo}
                      ariaLabel={`View row information for ${field.prompt}`}
                      onOpenInfo={() => onOpenInfo(fieldTarget)}
                      onSyncInfoPanelOnFocus={() =>
                        onSyncInfoPanelOnFocus(fieldTarget)
                      }
                    >
                      <AssessmentFlowsheetMultiselect
                        id={fieldId}
                        label={`${locLabel}: ${field.prompt}`}
                        choices={field.choices}
                        value={getLocationScopedFieldValue(entry, field.key)}
                        onChange={(ids) =>
                          writeValue(
                            setLocationScopedFieldValue(
                              value,
                              entry.locationId,
                              field.key,
                              ids,
                            ),
                          )
                        }
                        className="w-full min-w-0"
                      />
                    </ValueWithInfo>
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
