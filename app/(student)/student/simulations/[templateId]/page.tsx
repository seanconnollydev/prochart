import { Suspense } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAssessmentTemplateById } from "@/lib/actions/assessment-template";
import { getSimulationTemplateById } from "@/lib/actions/simulation-template";
import { SIMULATION_LINKED_ASSESSMENTS } from "@/lib/simulations/constants";
import { SimulationViewer } from "@/components/student/simulation-viewer";
import type { SimulationAssessmentEntry } from "@/components/student/simulation-assessments-panel";
import { Button } from "@/components/ui/button";

type Props = {
  params: Promise<{ templateId: string }>;
};

export default async function StudentSimulationPage({ params }: Props) {
  const { templateId } = await params;
  const template = await getSimulationTemplateById(templateId);
  if (!template) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          This simulation is not available.
        </p>
        <Button
          asChild
          variant="ghost"
          size="icon"
          aria-label="Back to simulations"
        >
          <Link href="/student/simulations">
            <ArrowLeft className="size-4" aria-hidden />
          </Link>
        </Button>
      </div>
    );
  }

  const linked = SIMULATION_LINKED_ASSESSMENTS[templateId] ?? [];
  const assessments: SimulationAssessmentEntry[] = [];
  for (const link of linked) {
    const assessmentTemplate = await getAssessmentTemplateById(link.templateId);
    if (assessmentTemplate) {
      assessments.push({
        templateId: link.templateId,
        title: link.title,
        template: assessmentTemplate,
      });
    }
  }

  return (
    <Suspense fallback={<p className="text-muted-foreground">Loading…</p>}>
      <SimulationViewer template={template} assessments={assessments} />
    </Suspense>
  );
}
