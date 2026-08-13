export const CHART_TAB_VALUES = [
  "summary",
  "vitals",
  "orders",
  "diagnostics",
  "mar",
  "notes",
  "hp",
  "assessments",
] as const;

export type ChartTab = (typeof CHART_TAB_VALUES)[number];

const CHART_TAB_SET = new Set<string>(CHART_TAB_VALUES);

export function parseChartTab(raw: string | null | undefined): ChartTab {
  if (raw && CHART_TAB_SET.has(raw)) {
    return raw as ChartTab;
  }
  return "summary";
}

export function parseAssessmentTab(
  raw: string | null | undefined,
  allowedIds: readonly string[],
): string {
  if (raw && allowedIds.includes(raw)) {
    return raw;
  }
  return allowedIds[0]!;
}

export function buildSimulationTabHref(
  pathname: string,
  options: { tab: ChartTab; assessment?: string | null },
): string {
  const params = new URLSearchParams();
  params.set("tab", options.tab);
  if (options.tab === "assessments" && options.assessment) {
    params.set("assessment", options.assessment);
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
