import rawAdultPhysicalAssessment from "@/lib/assessments/adult-physical-assessment.generated.json";
import {
  buildFlowsheetExportRows,
  type FlowsheetExportRow,
} from "@/lib/assessments/flowsheet-export";
import {
  FLOWSHEET_EXCEPTION_CHOICE_ID,
  isFlowsheetWdlXComboboxItem,
  prepareFlowsheetTemplate,
} from "@/lib/assessments/flowsheet";
import { sanitizeTextForStandardPdfFont } from "@/lib/assessments/flowsheet-pdf";
import {
  normalizeAssessmentTemplate,
  type AssessmentTemplate,
} from "@/lib/types/assessment-template";
import type { AssessmentItemResponse } from "@/lib/types/assessment-submission";
import { expect } from "@playwright/test";

export type AdultPhysicalAssessmentExportScenario = {
  gateSelectionPlan: readonly Readonly<{
    prompt: string;
    choice: "WDL" | "Exception";
  }>[];
  commentGatePrompt: string;
  commentText: string;
  multiRowPrompt: string;
  multiChoiceLabel: string;
};

/** Collapses whitespace like PDF/text extractors typically do across line breaks and cells. */
function collapseComparableWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Maps export rows into ordered snippets that {@link PDFParse} extraction should preserve in document order. */
export function flowsheetExportRowsToOrderedPdfFragments(
  rows: FlowsheetExportRow[],
): string[] {
  const sanitize = sanitizeTextForStandardPdfFont;
  const out: string[] = [];
  for (const row of rows) {
    if (row.kind === "section") {
      out.push(sanitize(row.pathLine).toUpperCase());
      continue;
    }
    const pad = "  ".repeat(row.indent);
    out.push(sanitize(pad + row.prompt));
    out.push(sanitize(row.valueDisplay));
  }
  return out;
}

function scenarioResponsesFromTemplate(
  prepared: AssessmentTemplate,
  scenario: AdultPhysicalAssessmentExportScenario,
): Record<string, AssessmentItemResponse> {
  const responses: Record<string, AssessmentItemResponse> = {};

  for (const { prompt, choice } of scenario.gateSelectionPlan) {
    const item = prepared.items.find(
      (i) =>
        i.prompt === prompt &&
        i.responseType === "choice" &&
        isFlowsheetWdlXComboboxItem(i),
    );
    if (!item?.id) {
      throw new Error(
        `Adult physical assessment export scenario: missing WDL/X gate "${prompt}".`,
      );
    }
    const gates = [...(item.choices ?? [])];
    const wdlChoice =
      gates.find((c) => c.id !== FLOWSHEET_EXCEPTION_CHOICE_ID) ?? gates[0];
    responses[item.id] = {
      value:
        choice === "Exception"
          ? FLOWSHEET_EXCEPTION_CHOICE_ID
          : (wdlChoice?.id ?? ""),
    };
    if (
      responses[item.id].value !== FLOWSHEET_EXCEPTION_CHOICE_ID &&
      !responses[item.id].value
    ) {
      throw new Error(
        `Adult physical assessment export scenario: no WDL choice for "${prompt}".`,
      );
    }
  }

  const abdomen = prepared.items.find(
    (i) =>
      i.prompt === scenario.multiRowPrompt && i.responseType === "multiChoice",
  );
  if (!abdomen?.id) {
    throw new Error(
      `Adult physical assessment export scenario: missing multi-row "${scenario.multiRowPrompt}".`,
    );
  }
  const distended = abdomen.choices?.find(
    (c) => c.label === scenario.multiChoiceLabel,
  );
  if (!distended?.id) {
    throw new Error(
      `Adult physical assessment export scenario: choice "${scenario.multiChoiceLabel}" not found on Abdomen.`,
    );
  }
  responses[abdomen.id] = { value: [distended.id] };

  const rollup = prepared.items.find(
    (it) =>
      it.prompt === scenario.commentGatePrompt && it.flowsheetSectionRollup,
  );
  if (!rollup?.id) {
    throw new Error(
      `Adult physical assessment export scenario: missing section rollup "${scenario.commentGatePrompt}".`,
    );
  }
  responses[rollup.id] = {
    ...responses[rollup.id],
    comment: scenario.commentText,
  };

  return responses;
}

/** Expected ordered PDF snippets for template + persisted scenario (matches {@link exportFlowsheetAssessmentPdf}). */
export function buildAdultPhysicalAssessmentScenarioOrderedPdfFragments(
  scenario: AdultPhysicalAssessmentExportScenario,
): string[] {
  const normalized = normalizeAssessmentTemplate(rawAdultPhysicalAssessment);
  const prepared = prepareFlowsheetTemplate(normalized);
  const responses = scenarioResponsesFromTemplate(prepared, scenario);
  const rows = buildFlowsheetExportRows(prepared, responses);
  return flowsheetExportRowsToOrderedPdfFragments(rows);
}

export function expectPdfContainsOrderedComparableFragments(
  pdfText: string,
  fragments: string[],
): void {
  let from = 0;
  const haystack = collapseComparableWhitespace(pdfText);
  for (const fragment of fragments) {
    const needle = collapseComparableWhitespace(fragment);
    if (!needle) {
      continue;
    }
    const at = haystack.indexOf(needle, from);
    expect(
      at >= 0,
      `missing ordered PDF fragment "${needle.slice(0, 120)}"`,
    ).toBe(true);
    from = at + needle.length;
  }
}
