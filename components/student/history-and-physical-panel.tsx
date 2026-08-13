import type { SimulationHistoryAndPhysical } from "@/lib/types/simulation-template";
import {
  DefinitionList,
  EmptyState,
  SectionHeading,
  VitalsMap,
} from "@/components/student/simulation-chart-shared";

export function HistoryAndPhysicalPanel({
  hp,
}: {
  hp?: SimulationHistoryAndPhysical;
}) {
  if (!hp) return <EmptyState label="No history and physical" />;

  return (
    <div className="space-y-6">
      <DefinitionList
        items={[
          { label: "Name", value: hp.displayName },
          { label: "MRN", value: hp.mrn },
          { label: "DOB", value: hp.dateOfBirth },
          { label: "Chief complaint", value: hp.chiefComplaint },
          { label: "HPI", value: hp.hpi },
          { label: "PMH", value: hp.pastMedicalHistory },
          { label: "PSH", value: hp.pastSurgicalHistory },
          { label: "Recent hospitalizations", value: hp.recentHospitalizations },
          {
            label: "Medications",
            value: hp.medications?.length
              ? hp.medications.join("; ")
              : undefined,
          },
          {
            label: "Allergies",
            value: hp.allergies?.length ? hp.allergies.join("; ") : undefined,
          },
          { label: "Family history", value: hp.familyHistory },
          { label: "Assessment & plan", value: hp.assessmentAndPlan },
          { label: "Signed by", value: hp.signedBy },
        ]}
      />
      {hp.examVitals && Object.keys(hp.examVitals).length > 0 ? (
        <div className="space-y-2">
          <SectionHeading>Exam vitals</SectionHeading>
          <VitalsMap vitals={hp.examVitals} />
        </div>
      ) : null}
      {hp.reviewOfSystems?.length ? (
        <div className="space-y-2">
          <SectionHeading>Review of systems</SectionHeading>
          <DefinitionList
            items={hp.reviewOfSystems.map((s) => ({
              label: s.system,
              value: s.findings,
            }))}
          />
        </div>
      ) : null}
      {hp.physicalExam?.length ? (
        <div className="space-y-2">
          <SectionHeading>Physical exam</SectionHeading>
          <DefinitionList
            items={hp.physicalExam.map((s) => ({
              label: s.system,
              value: s.findings,
            }))}
          />
        </div>
      ) : null}
    </div>
  );
}
