"use client";

import { useMemo } from "react";
import type { AssessmentChoice } from "@/lib/types/assessment-template";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  label: string;
  choices: AssessmentChoice[];
  value: string;
  onChange: (choiceId: string | undefined) => void;
  disabled?: boolean;
  className?: string;
};

/**
 * Dense single-select for assessment choice items. Uses the shared Select primitive
 * (Base UI) so the popup opens and selects reliably inside scrollable layouts.
 */
export function AssessmentChoiceCombobox({
  id,
  label,
  choices,
  value,
  onChange,
  disabled,
  className,
}: Props) {
  const selected = useMemo(
    () => choices.find((c) => c.id === value),
    [choices, value],
  );

  const hasValue = Boolean(value && selected);

  return (
    <Select
      value={hasValue ? value : null}
      onValueChange={(next) => {
        onChange(next ?? undefined);
      }}
      disabled={disabled}
      modal={false}
    >
      <SelectTrigger
        id={id}
        size="sm"
        aria-label={label}
        className={cn(
          "h-7 min-h-7 w-full min-w-0 max-w-full justify-between gap-1 px-2 py-0.5 font-normal [&_*[data-slot=select-value]]:line-clamp-2 [&_*[data-slot=select-value]]:whitespace-normal [&_*[data-slot=select-value]]:text-left [&_*[data-slot=select-value]]:text-xs",
          className,
        )}
      >
        <SelectValue placeholder="Select…">
          {hasValue ? selected?.label : undefined}
        </SelectValue>
      </SelectTrigger>
      <SelectContent
        align="start"
        side="bottom"
        sideOffset={4}
        className="max-h-72 w-[min(100vw-2rem,28rem)] min-w-[var(--anchor-width)] max-w-[min(100vw-2rem,36rem)]"
      >
        {choices.map((ch) => (
          <SelectItem
            key={ch.id}
            value={ch.id}
            className="items-start py-2 text-xs leading-snug whitespace-normal"
          >
            {ch.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
