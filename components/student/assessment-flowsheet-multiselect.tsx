"use client";

import { useLayoutEffect, useMemo, useState } from "react";
import type { AssessmentChoice } from "@/lib/types/assessment-template";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Props = {
  id: string;
  label: string;
  choices: AssessmentChoice[];
  value: string[];
  onChange: (ids: string[]) => void;
  disabled?: boolean;
  className?: string;
};

const MAX_VISIBLE_CHIPS = 8;

/** How many leading selections can show as chips before "+N", based on measured chip row width. */
function visibleChipCountForWidth(
  containerWidthPx: number,
  totalSelected: number,
): number {
  if (totalSelected <= 0) return 0;
  const w = containerWidthPx;
  if (!Number.isFinite(w) || w < 40) return 1;

  const horizontalPadding = 16;
  const inputMinWidthPx = 72;
  const overflowBadgeWidthPx = 40;
  const gapPx = 4;
  const minChipWidthPx = 52;

  const ceiling = Math.min(totalSelected, MAX_VISIBLE_CHIPS);

  for (let k = ceiling; k >= 1; k--) {
    const showOverflowBadge = totalSelected > k;
    const flexChildren = k + (showOverflowBadge ? 1 : 0) + 1;
    const totalGapsPx = Math.max(0, flexChildren - 1) * gapPx;

    const neededWidthPx =
      horizontalPadding +
      inputMinWidthPx +
      k * minChipWidthPx +
      (showOverflowBadge ? overflowBadgeWidthPx : 0) +
      totalGapsPx;

    if (w >= neededWidthPx) {
      return k;
    }
  }

  return 1;
}

/**
 * Multiselect for flowsheet `multiChoice` items: shadcn Combobox (multiple) with chips.
 */
export function AssessmentFlowsheetMultiselect({
  id,
  label,
  choices,
  value,
  onChange,
  disabled,
  className,
}: Props) {
  const anchorRef = useComboboxAnchor();
  const [chipsRowWidth, setChipsRowWidth] = useState(0);

  useLayoutEffect(() => {
    const el = anchorRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      setChipsRowWidth(entry.contentRect.width);
    });

    observer.observe(el);
    setChipsRowWidth(el.getBoundingClientRect().width);

    return () => observer.disconnect();
  }, [anchorRef]);

  const byId = useMemo(
    () => new Map(choices.map((c) => [c.id, c] as const)),
    [choices],
  );
  const selectedChoices = useMemo((): AssessmentChoice[] => {
    const out: AssessmentChoice[] = [];
    for (const id_ of value) {
      const ch = byId.get(id_);
      if (ch) {
        out.push(ch);
      }
    }
    return out;
  }, [value, byId]);

  const selectedLabelsText = useMemo(
    () => selectedChoices.map((c) => c.label).join(", "),
    [selectedChoices],
  );

  const chipsInputAriaLabel =
    selectedChoices.length === 0
      ? label
      : selectedChoices.length === 1
        ? `${label}: ${selectedLabelsText}`
        : `${label}, ${selectedChoices.length} selected: ${selectedLabelsText}`;

  const chipsInputTitle =
    selectedChoices.length > 0 ? selectedLabelsText : undefined;

  const visibleChipCount = useMemo(
    () => visibleChipCountForWidth(chipsRowWidth, selectedChoices.length),
    [chipsRowWidth, selectedChoices.length],
  );

  const visibleChoices = useMemo(
    () => selectedChoices.slice(0, visibleChipCount),
    [selectedChoices, visibleChipCount],
  );

  const extraCount =
    selectedChoices.length > visibleChipCount
      ? selectedChoices.length - visibleChipCount
      : 0;

  return (
    <div className={cn("w-full min-w-0", className)}>
      <Combobox<AssessmentChoice, true>
        items={choices}
        multiple
        value={selectedChoices}
        onValueChange={(next) => onChange((next ?? []).map((c) => c.id))}
        itemToStringValue={(c) => c.label}
        isItemEqualToValue={(a, b) => a.id === b.id}
        disabled={disabled}
        modal={false}
      >
        <ComboboxChips
          ref={anchorRef}
          className={cn(
            "flex h-8 max-h-8 min-h-8 w-full min-w-0 max-w-full flex-nowrap items-center gap-1 overflow-hidden rounded-md border border-input/80 bg-input/30 px-2 py-0 text-xs",
            "has-data-[slot=combobox-chip]:px-1.5",
            "[&_[data-slot=combobox-chip]]:min-h-5.5 [&_[data-slot=combobox-chip]]:min-w-0 [&_[data-slot=combobox-chip]]:max-w-[min(14rem,58%)] [&_[data-slot=combobox-chip]]:shrink",
          )}
        >
          <ComboboxValue>
            {visibleChoices.length > 0 ? (
              <>
                {visibleChoices.map((ch) => (
                  <ComboboxChip
                    key={ch.id}
                    className="min-w-0 max-w-[min(14rem,58%)] shrink"
                  >
                    <span className="min-w-0 truncate">{ch.label}</span>
                  </ComboboxChip>
                ))}
                {extraCount > 0 ? (
                  <Badge
                    variant="secondary"
                    className="pointer-events-none shrink-0 px-1.5 text-[10px] font-medium tabular-nums"
                    aria-hidden
                  >
                    +{extraCount}
                  </Badge>
                ) : null}
              </>
            ) : null}
          </ComboboxValue>
          <ComboboxChipsInput
            id={id}
            placeholder="Add…"
            aria-label={chipsInputAriaLabel}
            title={chipsInputTitle}
            className="min-w-[4.5rem] shrink text-xs"
            disabled={disabled}
          />
        </ComboboxChips>
        <ComboboxContent
          anchor={anchorRef}
          className="!w-[min(100vw-2rem,28rem)] !max-w-[min(100vw-2rem,36rem)] !min-w-[var(--anchor-width,100%)]"
        >
          <ComboboxEmpty>No items found.</ComboboxEmpty>
          <ComboboxList className="max-h-[min(18rem,50dvh)]">
            {(item: AssessmentChoice) => (
              <ComboboxItem
                key={item.id}
                value={item}
                className="items-start py-2 text-xs leading-snug whitespace-normal"
              >
                {item.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    </div>
  );
}
