import type { CellInput } from "jspdf-autotable";
import type { FlowsheetExportRow } from "@/lib/assessments/flowsheet-export";

export type ExportFlowsheetPdfInput = {
  title: string;
  description?: string;
  rows: FlowsheetExportRow[];
  exportedAtLabel: string;
};

function slugifyForFilename(title: string): string {
  const s = title
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return (s || "assessment").slice(0, 80);
}

/**
 * jsPDF’s standard fonts use PDF WinAnsi encoding. Unicode (e.g. →, —, smart quotes)
 * is not represented and can render as wrong glyphs (e.g. "!' " instead of an arrow).
 */
export function sanitizeTextForStandardPdfFont(text: string): string {
  return (
    text
      .replace(/\u2192/g, " -> ") // → (matches web `join(" → ")` paths)
      .replace(/\u2190/g, " <- ")
      .replace(/\u21D2/g, " => ")
      .replace(/\u2194/g, " <-> ")
      .replace(/\u2014/g, " - ") // —
      .replace(/\u2013/g, "-") // –
      .replace(/\u2018|\u2019/g, "'")
      .replace(/\u201C|\u201D/g, '"')
      .replace(/\u2026/g, "...")
      .replace(/\u00A0/g, " ")
  );
}

/**
 * Builds a multi-page PDF in the browser and triggers download.
 * Loads jsPDF + autotable on demand.
 */
export async function exportFlowsheetAssessmentPdf(
  input: ExportFlowsheetPdfInput,
): Promise<void> {
  const [{ default: jsPDF }, autoTableMod] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const autoTable = autoTableMod.default;

  const margin = { top: 14, right: 14, bottom: 16, left: 14 };
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentW = pageWidth - margin.left - margin.right;

  let y = margin.top;
  doc.setFontSize(15);
  doc.setFont("helvetica", "bold");
  const titleLines = doc.splitTextToSize(
    sanitizeTextForStandardPdfFont(input.title),
    contentW,
  );
  doc.text(titleLines, margin.left, y + 5);
  y += titleLines.length * 6 + 2;

  if (input.description?.trim()) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(55, 55, 55);
    const descLines = doc.splitTextToSize(
      sanitizeTextForStandardPdfFont(input.description.trim()),
      contentW,
    );
    doc.text(descLines, margin.left, y + 4);
    y += descLines.length * 4 + 4;
    doc.setTextColor(0, 0, 0);
  }

  doc.setFontSize(8);
  doc.setTextColor(90, 90, 90);
  doc.text(
    sanitizeTextForStandardPdfFont(`Exported ${input.exportedAtLabel}`),
    margin.left,
    y + 3,
  );
  y += 6;
  doc.setTextColor(0, 0, 0);

  const body: CellInput[][] = [];

  for (const row of input.rows) {
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

  autoTable(doc, {
    startY: y,
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
    didDrawPage: (data) => {
      const pageH = doc.internal.pageSize.getHeight();
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      doc.text(`Page ${data.pageNumber}`, pageWidth / 2, pageH - 8, {
        align: "center",
      });
      doc.setTextColor(0, 0, 0);
    },
  });

  const filename = `${slugifyForFilename(input.title)}.pdf`;
  doc.save(filename);
}
