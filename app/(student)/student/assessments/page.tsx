import Link from "next/link";
import { BUILTIN_ASSESSMENT_CATALOG } from "@/lib/assessments/constants";
import { StudentPageHeader } from "@/components/student/student-page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function StudentAssessmentsPage() {
  return (
    <div className="space-y-6">
      <StudentPageHeader
        title="Practice assessments"
        description="Open an assessment on its own to practice outside a case study. Progress is saved in this browser until you submit."
        backHref="/student"
        backLabel="Back to student area"
      />
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
