import type { jsPDF } from "jspdf";
import type { CellInput } from "jspdf-autotable";
import type { FlowsheetExportRow } from "@/lib/assessments/flowsheet-export";

export type ExportFlowsheetPdfInput = {
  title: string;
  description?: string;
  rows: FlowsheetExportRow[];
  exportedAtLabel: string;
};

export type PdfMargin = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export const FLOWSHEET_PDF_MARGIN: PdfMargin = {
  top: 14,
  right: 14,
  bottom: 16,
  left: 14,
};

export function slugifyForFilename(
  title: string,
  fallback = "assessment",
): string {
  const s = title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return (s || fallback).slice(0, 80);
}

/**
 * jsPDF’s standard fonts use PDF WinAnsi encoding. Unicode (e.g. →, —, smart quotes)
 * is not represented and can render as wrong glyphs (e.g. "!' " instead of an arrow).
 */
export function sanitizeTextForStandardPdfFont(text: string): string {
  return text
    .replace(/\u2192/g, " -> ") // → (matches web `join(" → ")` paths)
    .replace(/\u2190/g, " <- ")
    .replace(/\u21D2/g, " => ")
    .replace(/\u2194/g, " <-> ")
    .replace(/\u2014/g, " - ") // —
    .replace(/\u2013/g, "-") // –
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201C|\u201D/g, '"')
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ");
}

export async function loadJsPdfWithAutoTable(): Promise<{
  jsPDF: typeof import("jspdf").default;
  autoTable: typeof import("jspdf-autotable").default;
}> {
  const [{ default: jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  return { jsPDF, autoTable: autoTableMod.default };
}

export function createFlowsheetPdfDocument(
  JsPDF: typeof import("jspdf").default,
): jsPDF {
  return new JsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });
}

/** Draws title, optional description, and optional export timestamp. Returns Y after the block. */
export function appendPdfDocumentHeader(
  doc: jsPDF,
  options: {
    title: string;
    description?: string;
    exportedAtLabel?: string;
    margin?: PdfMargin;
    startY?: number;
  },
): number {
  const margin = options.margin ?? FLOWSHEET_PDF_MARGIN;
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentW = pageWidth - margin.left - margin.right;
  let y = options.startY ?? margin.top;

  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  const titleLines = doc.splitTextToSize(
    sanitizeTextForStandardPdfFont(options.title),
    contentW,
  );
  doc.text(titleLines, margin.left, y + 5);
  y += titleLines.length * 6 + 2;

  if (options.description?.trim()) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(55, 55, 55);
    const descLines = doc.splitTextToSize(
      sanitizeTextForStandardPdfFont(options.description.trim()),
      contentW,
    );
    doc.text(descLines, margin.left, y + 4);
    y += descLines.length * 4 + 4;
    doc.setTextColor(0, 0, 0);
  }

  if (options.exportedAtLabel) {
    doc.setFontSize(8);
    doc.setTextColor(90, 90, 90);
    doc.text(
      sanitizeTextForStandardPdfFont(`Exported ${options.exportedAtLabel}`),
      margin.left,
      y + 3,
    );
    y += 6;
    doc.setTextColor(0, 0, 0);
  }

  return y;
}

function flowsheetExportRowsToTableBody(
  rows: FlowsheetExportRow[],
): CellInput[][] {
  const body: CellInput[][] = [];
  for (const row of rows) {
    if (row.kind === "section") {
      body.push([
        {
          content: sanitizeTextForStandardPdfFont(row.pathLine).toUpperCase(),
          colSpan: 2,
          styles: {
            fontStyle: "bold",
            fillColor: [236, 236, 236],
            textColor: [20, 20, 20],
          },
        },
      ]);
    } else {
      const pad = "  ".repeat(row.indent);
      body.push([
        sanitizeTextForStandardPdfFont(pad + row.prompt),
        sanitizeTextForStandardPdfFont(row.valueDisplay),
      ]);
    }
  }
  return body;
}

export function drawPageNumberFooter(doc: jsPDF, pageNumber: number): void {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(`Page ${pageNumber}`, pageWidth / 2, pageH - 8, {
    align: "center",
  });
  doc.setTextColor(0, 0, 0);
}

/**
 * Appends the standard Item/Response flowsheet autotable.
 * Returns the Y position after the table (finalY), or startY if empty.
 */
export function appendFlowsheetAssessmentTable(
  doc: jsPDF,
  autoTable: typeof import("jspdf-autotable").default,
  rows: FlowsheetExportRow[],
  startY: number,
  margin: PdfMargin = FLOWSHEET_PDF_MARGIN,
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentW = pageWidth - margin.left - margin.right;
  const body = flowsheetExportRowsToTableBody(rows);

  autoTable(doc, {
    startY,
    head: [["Item", "Response"]],
    body,
    theme: "grid",
    styles: {
      fontSize: 8,
      cellPadding: 1.5,
      overflow: "linebreak",
      valign: "top",
    },
    headStyles: {
      fillColor: [220, 220, 220],
      textColor: 0,
      fontStyle: "bold",
    },
    columnStyles: {
      0: { cellWidth: contentW * 0.52 },
      1: { cellWidth: contentW * 0.48 },
    },
    margin,
    showHead: "everyPage",
    didDrawPage: () => {
      const pageNumber = doc.getCurrentPageInfo().pageNumber;
      drawPageNumberFooter(doc, pageNumber);
    },
  });

  const finalY =
    (
      doc as jsPDF & {
        lastAutoTable?: { finalY?: number };
      }
    ).lastAutoTable?.finalY ?? startY;
  return finalY;
}

/**
 * Builds a multi-page PDF in the browser and triggers download.
 * Loads jsPDF + autotable on demand.
 */
export async function exportFlowsheetAssessmentPdf(
  input: ExportFlowsheetPdfInput,
): Promise<void> {
  const { jsPDF, autoTable } = await loadJsPdfWithAutoTable();
  const margin = FLOWSHEET_PDF_MARGIN;
  const doc = createFlowsheetPdfDocument(jsPDF);

  const y = appendPdfDocumentHeader(doc, {
    title: input.title,
    description: input.description,
    exportedAtLabel: input.exportedAtLabel,
    margin,
  });

  appendFlowsheetAssessmentTable(doc, autoTable, input.rows, y, margin);

  const filename = `${slugifyForFilename(input.title)}.pdf`;
  doc.save(filename);
}
