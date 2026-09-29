import type { SimulationTemplate } from "@/lib/types/simulation-template";
import {
  BulletList,
  EmptyState,
  SectionHeading,
  VitalsMap,
} from "@/components/student/simulation-chart-shared";

export function VitalsPanel({ template }: { template: SimulationTemplate }) {
  const monitor = template.setup?.monitorSettings;
  const examVitals = template.historyAndPhysical?.examVitals;
  const hasMonitor =
    (monitor?.initialVitals &&
      Object.keys(monitor.initialVitals).length > 0) ||
    (monitor?.notes && monitor.notes.length > 0);
  const hasExam = examVitals && Object.keys(examVitals).length > 0;

  if (!hasMonitor && !hasExam) {
    return <EmptyState label="No vitals documented" />;
  }

  return (
    <div className="space-y-6">
      {hasMonitor ? (
        <div className="space-y-3">
          <SectionHeading>Monitor — initial vitals</SectionHeading>
          <VitalsMap vitals={monitor?.initialVitals} />
          {monitor?.notes?.length ? (
            <div className="space-y-2">
              <SectionHeading>Monitor notes</SectionHeading>
              <BulletList items={monitor.notes} />
            </div>
          ) : null}
        </div>
      ) : null}
      {hasExam ? (
        <div className="space-y-3">
          <SectionHeading>Exam vitals (H&amp;P)</SectionHeading>
          <VitalsMap vitals={examVitals} />
        </div>
      ) : null}
    </div>
  );
}
