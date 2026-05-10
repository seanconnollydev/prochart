import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAssessmentTemplateById } from "@/lib/actions/assessment-template";
import { AssessmentRunner } from "@/components/student/assessment-runner";
import { Button } from "@/components/ui/button";

type Props = {
  params: Promise<{ templateId: string }>;
};

export default async function StudentStandaloneAssessmentPage({ params }: Props) {
  const { templateId } = await params;
  const template = await getAssessmentTemplateById(templateId);
  if (!template) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">
          This assessment is not available.
        </p>
        <Button asChild variant="ghost" size="icon" aria-label="Back to assessments">
          <Link href="/student/assessments">
            <ArrowLeft className="size-4" aria-hidden />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <AssessmentRunner
      templateId={templateId}
      template={template}
      backHref="/student/assessments"
      backLabel="Back to assessments"
    />
  );
}
