"use client";

import type { AssessmentChoice } from "@/lib/types/assessment-template";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type Props = {
  /** Prefix for checkbox input ids (must be unique per surface). */
  idPrefix: string;
  /** Accessible name for the options group (typically the item prompt). */
  groupLabel: string;
  choices: AssessmentChoice[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  className?: string;
  emptyMessage?: string;
};

/**
 * Checkbox list for flowsheet multiselect options (info panel + mobile picker).
 */
export function FlowsheetMultiselectOptionsList({
  idPrefix,
  groupLabel,
  choices,
  selectedIds,
  onChange,
  disabled,
  className,
  emptyMessage = "No items found.",
}: Props) {
  if (choices.length === 0) {
    return (
      <p className="text-muted-foreground py-2 text-center text-xs">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div
      className={cn("space-y-2", className)}
      role="group"
      aria-label={`Options for ${groupLabel}`}
    >
      {choices.map((ch) => {
        const inputId = `${idPrefix}-${ch.id}`;
        const checked = selectedIds.includes(ch.id);
        return (
          <div key={ch.id} className="flex items-center gap-2">
            <Checkbox
              id={inputId}
              checked={checked}
              disabled={disabled}
              onCheckedChange={(c) => {
                const next = new Set(selectedIds);
                if (c === true) {
                  next.add(ch.id);
                } else {
                  next.delete(ch.id);
                }
                onChange([...next]);
              }}
              className="cursor-pointer"
            />
            <Label
              htmlFor={inputId}
              className="text-foreground cursor-pointer text-xs font-normal leading-snug"
            >
              {ch.label}
            </Label>
          </div>
        );
      })}
    </div>
  );
}
