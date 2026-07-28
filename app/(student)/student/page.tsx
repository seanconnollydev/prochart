import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const practiceModes = [
  {
    title: "Assessments",
    description: "Practice individual assessments outside a case study.",
    href: "/student/assessments",
    actionLabel: "Open assessments",
  },
  {
    title: "Simulations",
    description: "Case-study EHR simulations.",
    href: "/student/simulations",
    actionLabel: "Open simulations",
  },
] as const;

export default function StudentPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Choose a practice mode</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Select assessments or simulations to begin practicing.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 md:max-w-2xl">
          {practiceModes.map((mode) => (
            <Card key={mode.title} className="h-full">
              <CardHeader>
                <CardTitle className="text-base">{mode.title}</CardTitle>
                <CardDescription>{mode.description}</CardDescription>
              </CardHeader>
              <CardContent className="mt-auto">
                <Button asChild size="sm">
                  <Link href={mode.href}>{mode.actionLabel}</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
      <SiteFooter className="mt-auto border-0 px-0" />
    </div>
  );
}
