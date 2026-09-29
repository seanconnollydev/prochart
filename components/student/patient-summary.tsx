import type { SimulationPatient } from "@/lib/types/simulation-template";
import { DefinitionList } from "@/components/student/simulation-chart-shared";

export function PatientSummary({ patient }: { patient: SimulationPatient }) {
  const demographics = [
    patient.age != null ? `${patient.age} y/o` : null,
    patient.gender,
    patient.mrn ? `MRN ${patient.mrn}` : null,
    patient.dateOfBirth ? `DOB ${patient.dateOfBirth}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-lg font-semibold">
          {patient.displayName ?? "Unnamed patient"}
        </p>
        {demographics ? (
          <p className="text-muted-foreground mt-0.5 text-sm">{demographics}</p>
        ) : null}
      </div>
      <DefinitionList
        items={[
          {
            label: "Allergies",
            value: patient.allergies?.length
              ? patient.allergies.join(", ")
              : "None documented",
          },
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
        ]}
      />
    </div>
  );
}
