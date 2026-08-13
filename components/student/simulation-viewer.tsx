"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, InfoIcon, UserIcon } from "lucide-react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { FileExportIcon } from "@hugeicons/core-free-icons";
import { prepareFlowsheetTemplate } from "@/lib/assessments/flowsheet";
import { buildFlowsheetExportRows } from "@/lib/assessments/flowsheet-export";
import { useIsMdUp } from "@/lib/hooks/use-media-query";
import { readSubmission } from "@/lib/local-storage";
import type { AssessmentSubmission } from "@/lib/types/assessment-submission";
import {
  buildSimulationTabHref,
  type ChartTab,
  parseChartTab,
} from "@/lib/simulations/tab-params";
import type { SimulationTemplate } from "@/lib/types/simulation-template";
import { LicenseNoticeProse } from "@/lib/format/linkify-plain-text";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DiagnosticsPanel } from "@/components/student/diagnostics-panel";
import { HistoryAndPhysicalPanel } from "@/components/student/history-and-physical-panel";
import { MarPanel } from "@/components/student/mar-panel";
import { OrdersPanel } from "@/components/student/orders-panel";
import { PatientSummary } from "@/components/student/patient-summary";
import { ProgressNotesPanel } from "@/components/student/progress-notes-panel";
import {
  SimulationAssessmentsPanel,
  type SimulationAssessmentEntry,
} from "@/components/student/simulation-assessments-panel";
import { VitalsPanel } from "@/components/student/vitals-panel";

const CHART_TAB_TRIGGERS: ReadonlyArray<{ value: ChartTab; label: string }> = [
  { value: "summary", label: "Summary" },
  { value: "vitals", label: "Vitals" },
  { value: "orders", label: "Orders" },
  { value: "diagnostics", label: "Diagnostics" },
  { value: "mar", label: "MAR" },
  { value: "notes", label: "Progress Notes" },
  { value: "hp", label: "H&P" },
  { value: "assessments", label: "Assessments" },
];

type Props = {
  template: SimulationTemplate;
  assessments?: SimulationAssessmentEntry[];
};

export function SimulationViewer({
  template,
  assessments = [],
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const tab = parseChartTab(searchParams.get("tab"));
  const isMdUp = useIsMdUp();
  const tabsListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isMdUp) return;
    const active = tabsListRef.current?.querySelector<HTMLElement>(
      '[data-slot="tabs-trigger"][data-active]',
    );
    active?.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: "smooth",
    });
  }, [tab, isMdUp]);

  const metaBits: string[] = [];
  if (template.meta?.discipline) metaBits.push(template.meta.discipline);
  if (template.meta?.level != null)
    metaBits.push(`Level ${template.meta.level}`);
  if (template.meta?.skillFocus) metaBits.push(template.meta.skillFocus);
  if (template.meta?.estimatedTimeMinutes != null) {
    metaBits.push(`${template.meta.estimatedTimeMinutes} min sim`);
  }

  async function handleExportPdf() {
    try {
      const { exportSimulationSessionPdf } = await import(
        "@/lib/simulations/simulation-pdf"
      );
      const storageScope = {
        kind: "simulation" as const,
        simulationTemplateId: template.id,
      };
      const flowsheetAssessments = assessments.filter(
        (a) => (a.template.presentation?.layout ?? "cards") === "flowsheet",
      );
      const assessmentSections = flowsheetAssessments.map((a) => {
        const wrapped = readSubmission<AssessmentSubmission>(
          a.templateId,
          storageScope,
        );
        const responses = wrapped?.document.responses ?? {};
        const prepared = prepareFlowsheetTemplate(a.template);
        return {
          title: a.template.title,
          description: a.template.description?.trim() || undefined,
          rows: buildFlowsheetExportRows(prepared, responses),
        };
      });

      await exportSimulationSessionPdf({
        simulationTitle: template.title,
        description: template.description?.trim() || undefined,
        patient: template.patient,
        assessments: assessmentSections,
        exportedAtLabel: new Date().toLocaleString(),
      });
      toast.success("PDF downloaded.");
    } catch {
      toast.error("Could not export PDF.");
    }
  }

  return (
    <div className="-mx-4 -my-6 flex h-[calc(100%+3rem)] min-h-0 flex-col overflow-hidden">
      <div className="flex shrink-0 items-start gap-3 border-b border-border px-4 pt-6 pb-4">
        <Button
          asChild
          variant="ghost"
          size="icon"
          aria-label="Back to simulations"
          className="mt-0.5 shrink-0"
        >
          <Link href="/student/simulations">
            <ArrowLeft className="size-4" aria-hidden />
          </Link>
        </Button>
        <h1 className="min-w-0 flex-1 text-2xl font-semibold break-words">
          {template.title}
        </h1>
        <div className="mt-0.5 flex shrink-0 items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            title="Export to PDF"
            aria-label="Export to PDF"
            onClick={() => void handleExportPdf()}
          >
            <HugeiconsIcon
              icon={FileExportIcon}
              strokeWidth={2}
              className="size-4"
            />
          </Button>
          <Sheet>
            <SheetTrigger
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "text-muted-foreground shrink-0",
              )}
              aria-label="Patient summary"
            >
              <UserIcon className="size-4" aria-hidden />
            </SheetTrigger>
            <SheetContent side="right" className="overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Patient summary</SheetTitle>
              </SheetHeader>
              <div className="px-6 pb-6">
                <PatientSummary patient={template.patient} />
              </div>
            </SheetContent>
          </Sheet>
          <Sheet>
            <SheetTrigger
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "text-muted-foreground shrink-0",
              )}
              aria-label="Simulation details"
            >
              <InfoIcon className="size-4" aria-hidden />
            </SheetTrigger>
            <SheetContent side="right" className="overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Simulation details</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-6 px-6 pb-6">
                {template.description ? (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Description</h3>
                    <p className="text-muted-foreground text-sm">
                      {template.description}
                    </p>
                  </div>
                ) : null}
                {metaBits.length > 0 ? (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">Tags</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {metaBits.map((bit) => (
                        <Badge key={bit} variant="secondary">
                          {bit}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
                {template.licenseNotice ? (
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold">License</h3>
                    <LicenseNoticeProse text={template.licenseNotice} />
                  </div>
                ) : null}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      <Tabs
        value={tab}
        onValueChange={(next) => {
          const nextTab = parseChartTab(String(next));
          router.push(
            buildSimulationTabHref(pathname, {
              tab: nextTab,
              assessment:
                nextTab === "assessments"
                  ? searchParams.get("assessment")
                  : undefined,
            }),
            { scroll: false },
          );
        }}
        orientation={isMdUp ? "vertical" : "horizontal"}
        className="min-h-0 flex-1 items-stretch gap-0"
      >
        <nav
          aria-label="Chart sections"
          className={cn(
            "shrink-0",
            isMdUp
              ? "flex w-40 flex-col border-r border-border pl-4 pt-4"
              : "border-b border-border",
          )}
        >
          <div
            className={cn(
              isMdUp ? "contents" : "no-scrollbar overflow-x-auto px-4 pb-1.5",
            )}
          >
            <TabsList
              ref={tabsListRef}
              variant="line"
              className={cn(
                "shrink-0",
                isMdUp
                  ? "h-auto w-full items-stretch self-start pr-4"
                  : "h-auto w-max min-w-full justify-start gap-0 rounded-none py-0",
              )}
            >
              {CHART_TAB_TRIGGERS.map(({ value, label }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className={cn(
                    !isMdUp && "flex-none rounded-none px-3 py-2.5",
                  )}
                >
                  {label}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>
        </nav>

        <div className="relative min-h-0 min-w-0 flex-1">
          <div className="absolute inset-0 overflow-y-auto px-4 pt-4 pb-6">
            <TabsContent value="summary">
              <PatientSummary patient={template.patient} />
            </TabsContent>
            <TabsContent value="vitals">
              <VitalsPanel template={template} />
            </TabsContent>
            <TabsContent value="orders">
              <OrdersPanel orders={template.orders} />
            </TabsContent>
            <TabsContent value="diagnostics">
              <DiagnosticsPanel template={template} />
            </TabsContent>
            <TabsContent value="mar">
              <MarPanel mar={template.mar} />
            </TabsContent>
            <TabsContent value="notes">
              <ProgressNotesPanel notes={template.progressNotes} />
            </TabsContent>
            <TabsContent value="hp">
              <HistoryAndPhysicalPanel hp={template.historyAndPhysical} />
            </TabsContent>
          </div>
          <TabsContent
            value="assessments"
            className="absolute inset-0 mt-0 flex min-h-0 flex-col overflow-hidden px-4 pt-4 pb-6"
          >
            <SimulationAssessmentsPanel
              simulationTemplateId={template.id}
              assessments={assessments}
            />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
