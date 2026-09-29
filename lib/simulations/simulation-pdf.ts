import type { jsPDF } from "jspdf";
import type { FlowsheetExportRow } from "@/lib/assessments/flowsheet-export";
import {
  FLOWSHEET_PDF_MARGIN,
  appendFlowsheetAssessmentTable,
  appendPdfDocumentHeader,
  createFlowsheetPdfDocument,
  drawPageNumberFooter,
  loadJsPdfWithAutoTable,
  sanitizeTextForStandardPdfFont,
  slugifyForFilename,
  type PdfMargin,
} from "@/lib/assessments/flowsheet-pdf";
import type { SimulationPatient } from "@/lib/types/simulation-template";

export type SimulationPdfAssessmentSection = {
  title: string;
  description?: string;
  rows: FlowsheetExportRow[];
};

export type ExportSimulationSessionPdfInput = {
  simulationTitle: string;
  description?: string;
  patient: SimulationPatient;
  assessments: SimulationPdfAssessmentSection[];
  exportedAtLabel: string;
};

function patientDemographicsLine(patient: SimulationPatient): string {
  return [
    patient.age != null ? `${patient.age} y/o` : null,
    patient.gender,
    patient.mrn ? `MRN ${patient.mrn}` : null,
    patient.dateOfBirth ? `DOB ${patient.dateOfBirth}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Same fields / omit-empty rules as PatientSummary in simulation-viewer. */
function patientSummaryEntries(
  patient: SimulationPatient,
): Array<{ label: string; value: string }> {
  const entries: Array<{ label: string; value: string }> = [
    {
      label: "Allergies",
      value: patient.allergies?.length
        ? patient.allergies.join(", ")
        : "None documented",
    },
  ];

  const optional: Array<{ label: string; value?: string | string[] }> = [
    { label: "Code status", value: patient.codeStatus },
    { label: "Height", value: patient.height },
    { label: "Weight", value: patient.weight },
    { label: "Language", value: patient.primaryLanguage },
    {
      label: "Admitting diagnoses",
      value: patient.admittingDiagnoses?.length
        ? patient.admittingDiagnoses.join("; ")
        : undefined,
    },
    {
      label: "Medical history",
      value: patient.medicalHistory?.length
        ? patient.medicalHistory.join("; ")
        : undefined,
    },
    {
      label: "Home medications",
      value: patient.currentMedications?.length
        ? patient.currentMedications.join("; ")
        : undefined,
    },
  ];

  for (const item of optional) {
    if (
      item.value === undefined ||
      item.value === null ||
      item.value === "" ||
      (Array.isArray(item.value) && item.value.length === 0)
    ) {
      continue;
    }
    entries.push({
      label: item.label,
      value: Array.isArray(item.value) ? item.value.join("; ") : item.value,
    });
  }

  return entries;
}

function appendPatientSummary(
  doc: jsPDF,
  patient: SimulationPatient,
  startY: number,
  margin: PdfMargin,
): number {
  const pageWidth = doc.internal.pageSize.getWidth();
  const contentW = pageWidth - margin.left - margin.right;
  let y = startY + 4;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(
    sanitizeTextForStandardPdfFont("Patient summary"),
    margin.left,
    y,
  );
  y += 7;

  const name = patient.displayName ?? "Unnamed patient";
  doc.setFontSize(12);
  doc.text(sanitizeTextForStandardPdfFont(name), margin.left, y);
  y += 5;

  const demographics = patientDemographicsLine(patient);
  if (demographics) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    const demoLines = doc.splitTextToSize(
      sanitizeTextForStandardPdfFont(demographics),
      contentW,
    );
    doc.text(demoLines, margin.left, y);
    y += demoLines.length * 4 + 3;
    doc.setTextColor(0, 0, 0);
  } else {
    y += 2;
  }

  const labelW = 42;
  const valueX = margin.left + labelW;
  const valueW = contentW - labelW;

  for (const entry of patientSummaryEntries(patient)) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(90, 90, 90);
    doc.text(
      sanitizeTextForStandardPdfFont(entry.label),
      margin.left,
      y,
    );
    doc.setTextColor(0, 0, 0);
    const valueLines = doc.splitTextToSize(
      sanitizeTextForStandardPdfFont(entry.value),
      valueW,
    );
    doc.text(valueLines, valueX, y);
    y += Math.max(1, valueLines.length) * 4.2 + 2;
  }

  return y;
}

/**
 * Builds a multi-page simulation session PDF and triggers download.
 * Patient summary first, then each assessment on its own page using the
 * same flowsheet Item/Response table formatting as standalone assessment export.
 */
export async function exportSimulationSessionPdf(
  input: ExportSimulationSessionPdfInput,
): Promise<void> {
  const { jsPDF, autoTable } = await loadJsPdfWithAutoTable();
  const margin = FLOWSHEET_PDF_MARGIN;
  const doc = createFlowsheetPdfDocument(jsPDF);

  let y = appendPdfDocumentHeader(doc, {
    title: input.simulationTitle,
    description: input.description,
    exportedAtLabel: input.exportedAtLabel,
    margin,
  });

  y = appendPatientSummary(doc, input.patient, y, margin);

  // Summary pages have no autotable yet — stamp page numbers manually.
  const summaryPageCount = doc.getNumberOfPages();
  for (let i = 1; i <= summaryPageCount; i++) {
    doc.setPage(i);
    drawPageNumberFooter(doc, i);
  }

  for (const assessment of input.assessments) {
    doc.addPage();
    y = appendPdfDocumentHeader(doc, {
      title: assessment.title,
      description: assessment.description,
      margin,
    });
    appendFlowsheetAssessmentTable(
      doc,
      autoTable,
      assessment.rows,
      y,
      margin,
    );
  }

  const filename = `${slugifyForFilename(input.simulationTitle, "simulation")}.pdf`;
  doc.save(filename);
}
