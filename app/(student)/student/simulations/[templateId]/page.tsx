import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSimulationTemplateById } from "@/lib/actions/simulation-template";
import { SimulationViewer } from "@/components/student/simulation-viewer";
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

  return <SimulationViewer template={template} />;
}
