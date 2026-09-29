"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AssessmentRunner } from "@/components/student/assessment-runner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  buildSimulationTabHref,
  parseAssessmentTab,
} from "@/lib/simulations/tab-params";
import type { AssessmentTemplate } from "@/lib/types/assessment-template";

export type SimulationAssessmentEntry = {
  templateId: string;
  title: string;
  template: AssessmentTemplate;
};

type Props = {
  simulationTemplateId: string;
  assessments: SimulationAssessmentEntry[];
};

export function SimulationAssessmentsPanel({
  simulationTemplateId,
  assessments,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const storageScope = useMemo(
    () =>
      ({
        kind: "simulation" as const,
        simulationTemplateId,
      }),
    [simulationTemplateId],
  );

  const allowedIds = assessments.map((a) => a.templateId);

  const assessmentParam = searchParams.get("assessment");
  const chartTab = searchParams.get("tab");
  const assessmentTab =
    assessments.length > 0
      ? parseAssessmentTab(assessmentParam, allowedIds)
      : "";

  useEffect(() => {
    if (assessments.length === 0) return;
    if (chartTab !== "assessments") return;
    if (assessmentParam === assessmentTab) return;
    router.replace(
      buildSimulationTabHref(pathname, {
        tab: "assessments",
        assessment: assessmentTab,
      }),
      { scroll: false },
    );
  }, [
    assessmentParam,
    assessmentTab,
    assessments.length,
    chartTab,
    pathname,
    router,
  ]);

  if (assessments.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No assessments are available for this simulation.
      </p>
    );
  }

  return (
    <Tabs
      value={assessmentTab}
      onValueChange={(next) => {
        router.push(
          buildSimulationTabHref(pathname, {
            tab: "assessments",
            assessment: String(next),
          }),
          { scroll: false },
        );
      }}
      className="flex h-full min-h-0 flex-1 flex-col gap-4"
    >
      <TabsList variant="line" className="h-auto w-fit shrink-0">
        {assessments.map((a) => (
          <TabsTrigger
            key={a.templateId}
            value={a.templateId}
            className="flex-none"
          >
            {a.title}
          </TabsTrigger>
        ))}
      </TabsList>
      {assessments.map((a) => (
        <TabsContent
          key={a.templateId}
          value={a.templateId}
          className="mt-0 flex min-h-0 flex-1 flex-col"
        >
          <AssessmentRunner
            templateId={a.templateId}
            template={a.template}
            mode="embedded"
            storageScope={storageScope}
          />
        </TabsContent>
      ))}
    </Tabs>
  );
}
