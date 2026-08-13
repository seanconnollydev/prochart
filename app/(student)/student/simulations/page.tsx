import Link from "next/link";
import { BUILTIN_SIMULATION_CATALOG } from "@/lib/simulations/constants";
import { StudentPageHeader } from "@/components/student/student-page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function StudentSimulationsPage() {
  return (
    <div className="space-y-6">
      <StudentPageHeader
        title="Simulations"
        description="Open a case-study EHR simulation to review the chart and scenario materials."
        backHref="/student"
        backLabel="Back to student area"
      />
      <div className="grid gap-4 sm:grid-cols-1 md:max-w-lg">
        {BUILTIN_SIMULATION_CATALOG.map((sim) => (
          <Card key={sim.templateId}>
            <CardHeader>
              <CardTitle className="text-base">{sim.title}</CardTitle>
              {sim.description ? (
                <CardDescription>{sim.description}</CardDescription>
              ) : null}
            </CardHeader>
            <CardContent>
              <Button asChild size="sm">
                <Link href={`/student/simulations/${sim.templateId}`}>
                  Open simulation
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
