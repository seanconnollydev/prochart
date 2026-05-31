import Link from "next/link";
import { BUILTIN_ASSESSMENT_CATALOG } from "@/lib/assessments/constants";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function StudentAssessmentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Practice assessments</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Open an assessment on its own to practice outside a case study.
          Progress is saved in this browser until you submit.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-1 md:max-w-lg">
        {BUILTIN_ASSESSMENT_CATALOG.map((a) => (
          <Card key={a.templateId}>
            <CardHeader>
              <CardTitle className="text-base">{a.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <Button asChild size="sm">
                <Link href={`/student/assessments/${a.templateId}`}>
                  Open practice
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
