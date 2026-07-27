import Link from "next/link";
import { BUILTIN_SIMULATION_CATALOG } from "@/lib/simulations/constants";
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
      <div>
        <h1 className="text-2xl font-semibold">Simulations</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Open a case-study EHR simulation to review the chart and scenario
          materials.
        </p>
      </div>
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
