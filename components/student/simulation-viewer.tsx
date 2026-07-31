"use client";

import Link from "next/link";
import { ArrowLeft, InfoIcon, UserIcon } from "lucide-react";
import type {
  SimulationHistoryAndPhysical,
  SimulationLabPanel,
  SimulationMAREntry,
  SimulationOrder,
  SimulationPatient,
  SimulationProgressNote,
  SimulationTemplate,
} from "@/lib/types/simulation-template";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  SimulationAssessmentsPanel,
  type SimulationAssessmentEntry,
} from "@/components/student/simulation-assessments-panel";

type Props = {
  template: SimulationTemplate;
  assessments?: SimulationAssessmentEntry[];
};

function EmptyState({ label = "No data" }: { label?: string }) {
  return <p className="text-muted-foreground text-sm">{label}</p>;
}

function SectionHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="mb-2 text-sm font-semibold">{children}</h3>;
}

function DefinitionList({
  items,
}: {
  items: Array<{ label: string; value?: React.ReactNode }>;
}) {
  const visible = items.filter(
    (item) =>
      item.value !== undefined &&
      item.value !== null &&
      item.value !== "" &&
      !(Array.isArray(item.value) && item.value.length === 0),
  );
  if (visible.length === 0) return <EmptyState />;
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-[minmax(8rem,12rem)_1fr]">
      {visible.map((item) => (
        <div key={item.label} className="contents">
          <dt className="text-muted-foreground text-sm">{item.label}</dt>
          <dd className="text-sm whitespace-pre-wrap">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function BulletList({ items }: { items?: string[] }) {
  if (!items?.length) return <EmptyState />;
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}

function VitalsMap({ vitals }: { vitals?: Record<string, string> }) {
  if (!vitals || Object.keys(vitals).length === 0) return <EmptyState />;
  return (
    <dl className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
      {Object.entries(vitals).map(([key, value]) => (
        <div key={key} className="space-y-0.5">
          <dt className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
            {key}
          </dt>
          <dd className="text-base font-medium tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

function PatientSummary({ patient }: { patient: SimulationPatient }) {
  const demographics = [
    patient.age != null ? `${patient.age} y/o` : null,
    patient.gender,
    patient.mrn ? `MRN ${patient.mrn}` : null,
    patient.dateOfBirth ? `DOB ${patient.dateOfBirth}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-lg font-semibold">
          {patient.displayName ?? "Unnamed patient"}
        </p>
        {demographics ? (
          <p className="text-muted-foreground mt-0.5 text-sm">{demographics}</p>
        ) : null}
      </div>
      <DefinitionList
        items={[
          {
            label: "Allergies",
            value: patient.allergies?.length
              ? patient.allergies.join(", ")
              : "None documented",
          },
          { label: "Code status", value: patient.codeStatus },
          { label: "Height", value: patient.height },
          { label: "Weight", value: patient.weight },
          { label: "Language", value: patient.primaryLanguage },
          {
            label: "Admitting diagnoses",
            value: patient.admittingDiagnoses?.length
              ? patient.admittingDiagnoses.join("; ")
              : undefined,
          },
          {
            label: "Medical history",
            value: patient.medicalHistory?.length
              ? patient.medicalHistory.join("; ")
              : undefined,
          },
          {
            label: "Home medications",
            value: patient.currentMedications?.length
              ? patient.currentMedications.join("; ")
              : undefined,
          },
        ]}
      />
    </div>
  );
}

function VitalsPanel({ template }: { template: SimulationTemplate }) {
  const monitor = template.setup?.monitorSettings;
  const examVitals = template.historyAndPhysical?.examVitals;
  const hasMonitor =
    (monitor?.initialVitals &&
      Object.keys(monitor.initialVitals).length > 0) ||
    (monitor?.notes && monitor.notes.length > 0);
  const hasExam = examVitals && Object.keys(examVitals).length > 0;

  if (!hasMonitor && !hasExam) {
    return <EmptyState label="No vitals documented" />;
  }

  return (
    <div className="space-y-6">
      {hasMonitor ? (
        <div className="space-y-3">
          <SectionHeading>Monitor — initial vitals</SectionHeading>
          <VitalsMap vitals={monitor?.initialVitals} />
          {monitor?.notes?.length ? (
            <div className="space-y-2">
              <SectionHeading>Monitor notes</SectionHeading>
              <BulletList items={monitor.notes} />
            </div>
          ) : null}
        </div>
      ) : null}
      {hasExam ? (
        <div className="space-y-3">
          <SectionHeading>Exam vitals (H&amp;P)</SectionHeading>
          <VitalsMap vitals={examVitals} />
        </div>
      ) : null}
    </div>
  );
}

const ORDER_CATEGORY_LABELS: Record<string, string> = {
  activity: "Activity",
  monitoring: "Monitoring",
  ivFluids: "IV fluids",
  medication: "Medication",
  diagnostic: "Diagnostic",
  diet: "Diet",
  nursing: "Nursing",
  other: "Other",
};

function OrdersPanel({ orders }: { orders?: SimulationOrder[] }) {
  if (!orders?.length) return <EmptyState label="No orders" />;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-36">Category</TableHead>
          <TableHead>Order</TableHead>
          <TableHead>Details</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id}>
            <TableCell className="align-top text-muted-foreground">
              {ORDER_CATEGORY_LABELS[order.category] ?? order.category}
            </TableCell>
            <TableCell className="align-top font-medium">{order.text}</TableCell>
            <TableCell className="align-top text-muted-foreground whitespace-pre-wrap">
              {order.details ?? "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function LabPanelBlock({ panel }: { panel: SimulationLabPanel }) {
  return (
    <div className="space-y-2">
      <div>
        <p className="font-medium">{panel.name}</p>
        <p className="text-muted-foreground text-xs">
          {[
            panel.orderedAt ? `Ordered ${panel.orderedAt}` : null,
            panel.resultedAt ? `Resulted ${panel.resultedAt}` : null,
          ]
            .filter(Boolean)
            .join(" · ") || null}
        </p>
      </div>
      {panel.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- static simulation asset URLs
        <img
          src={panel.imageUrl}
          alt={panel.name}
          className="max-w-full rounded-md border border-border"
        />
      ) : null}
      {panel.results.length === 0 ? (
        panel.imageUrl ? null : <EmptyState label="No results" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Test</TableHead>
              <TableHead>Value</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead>Ref range</TableHead>
              <TableHead>Flag</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {panel.results.map((r) => (
              <TableRow key={r.id}>
                <TableCell>{r.name}</TableCell>
                <TableCell className="tabular-nums">{r.value ?? "—"}</TableCell>
                <TableCell>{r.unit ?? "—"}</TableCell>
                <TableCell>{r.referenceRange ?? "—"}</TableCell>
                <TableCell>{r.flag ?? "—"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function DiagnosticsPanel({ template }: { template: SimulationTemplate }) {
  const labs = template.labPanels ?? [];
  const imaging = template.imagingResults ?? [];
  const ecgs = template.ecgResults ?? [];
  if (!labs.length && !imaging.length && !ecgs.length) {
    return <EmptyState label="No diagnostic results" />;
  }

  return (
    <div className="space-y-8">
      {labs.length > 0 ? (
        <div className="space-y-4">
          <SectionHeading>Labs</SectionHeading>
          {labs.map((panel) => (
            <LabPanelBlock key={panel.id} panel={panel} />
          ))}
        </div>
      ) : null}
      {imaging.length > 0 ? (
        <div className="space-y-4">
          <SectionHeading>Imaging</SectionHeading>
          {imaging.map((img) => (
            <div key={img.id} className="space-y-2">
              <p className="font-medium">
                {img.title ?? img.modality}
                {img.title && img.modality !== img.title
                  ? ` (${img.modality})`
                  : null}
              </p>
              {img.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- static simulation asset URLs
                <img
                  src={img.imageUrl}
                  alt={img.title ?? img.modality}
                  className="max-w-full rounded-md border border-border"
                />
              ) : null}
              <DefinitionList
                items={[
                  { label: "Findings", value: img.findings },
                  { label: "Impression", value: img.impression },
                  { label: "Ordered", value: img.orderedAt },
                  { label: "Reported", value: img.reportedAt },
                ]}
              />
            </div>
          ))}
        </div>
      ) : null}
      {ecgs.length > 0 ? (
        <div className="space-y-4">
          <SectionHeading>ECG</SectionHeading>
          {ecgs.map((ecg) => (
            <div key={ecg.id} className="space-y-2">
              <p className="font-medium">{ecg.title ?? "ECG"}</p>
              {ecg.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- static simulation asset URLs
                <img
                  src={ecg.imageUrl}
                  alt={ecg.title ?? "ECG"}
                  className="max-w-full rounded-md border border-border"
                />
              ) : null}
              {ecg.awaitingInterpretation ? (
                <DefinitionList
                  items={[
                    {
                      label: "Status",
                      value: "Awaiting interpretation",
                    },
                  ]}
                />
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function MarPanel({ mar }: { mar?: SimulationMAREntry[] }) {
  if (!mar?.length) return <EmptyState label="No medications on MAR" />;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order</TableHead>
          <TableHead className="w-[28%]">Sch. Time</TableHead>
          <TableHead className="w-[12%]">Dose</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {mar.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell className="align-top whitespace-pre-wrap">
              {entry.order}
            </TableCell>
            <TableCell className="align-top whitespace-pre-wrap">
              {entry.scheduledTime ?? ""}
            </TableCell>
            <TableCell className="align-top whitespace-pre-wrap">
              {entry.dose ?? ""}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function ProgressNotesPanel({ notes }: { notes?: SimulationProgressNote[] }) {
  if (!notes?.length) return <EmptyState label="No progress notes" />;
  return (
    <div className="space-y-6">
      {notes.map((note) => (
        <article key={note.id} className="space-y-2 border-border border-b pb-4 last:border-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p className="font-medium">{note.noteType ?? "Progress note"}</p>
            {note.occurredAt ? (
              <p className="text-muted-foreground text-xs">{note.occurredAt}</p>
            ) : null}
          </div>
          <p className="text-muted-foreground text-sm">
            {[note.author, note.authorRole].filter(Boolean).join(" · ") ||
              "Author not documented"}
          </p>
          <p className="text-sm whitespace-pre-wrap">
            {note.content ?? "—"}
          </p>
        </article>
      ))}
    </div>
  );
}

function HistoryAndPhysicalPanel({
  hp,
}: {
  hp?: SimulationHistoryAndPhysical;
}) {
  if (!hp) return <EmptyState label="No history and physical" />;

  return (
    <div className="space-y-6">
      <DefinitionList
        items={[
          { label: "Name", value: hp.displayName },
          { label: "MRN", value: hp.mrn },
          { label: "DOB", value: hp.dateOfBirth },
          { label: "Chief complaint", value: hp.chiefComplaint },
          { label: "HPI", value: hp.hpi },
          { label: "PMH", value: hp.pastMedicalHistory },
          { label: "PSH", value: hp.pastSurgicalHistory },
          { label: "Recent hospitalizations", value: hp.recentHospitalizations },
          {
            label: "Medications",
            value: hp.medications?.length
              ? hp.medications.join("; ")
              : undefined,
          },
          {
            label: "Allergies",
            value: hp.allergies?.length ? hp.allergies.join("; ") : undefined,
          },
          { label: "Family history", value: hp.familyHistory },
          { label: "Assessment & plan", value: hp.assessmentAndPlan },
          { label: "Signed by", value: hp.signedBy },
        ]}
      />
      {hp.examVitals && Object.keys(hp.examVitals).length > 0 ? (
        <div className="space-y-2">
          <SectionHeading>Exam vitals</SectionHeading>
          <VitalsMap vitals={hp.examVitals} />
        </div>
      ) : null}
      {hp.reviewOfSystems?.length ? (
        <div className="space-y-2">
          <SectionHeading>Review of systems</SectionHeading>
          <DefinitionList
            items={hp.reviewOfSystems.map((s) => ({
              label: s.system,
              value: s.findings,
            }))}
          />
        </div>
      ) : null}
      {hp.physicalExam?.length ? (
        <div className="space-y-2">
          <SectionHeading>Physical exam</SectionHeading>
          <DefinitionList
            items={hp.physicalExam.map((s) => ({
              label: s.system,
              value: s.findings,
            }))}
          />
        </div>
      ) : null}
    </div>
  );
}

export function SimulationViewer({
  template,
  assessments = [],
}: Props) {
  const metaBits: string[] = [];
  if (template.meta?.discipline) metaBits.push(template.meta.discipline);
  if (template.meta?.level != null)
    metaBits.push(`Level ${template.meta.level}`);
  if (template.meta?.skillFocus) metaBits.push(template.meta.skillFocus);
  if (template.meta?.estimatedTimeMinutes != null) {
    metaBits.push(`${template.meta.estimatedTimeMinutes} min sim`);
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
      <div className="flex shrink-0 items-start gap-3">
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
        <div className="mt-0.5 flex shrink-0 items-center gap-0.5">
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
        defaultValue="summary"
        orientation="vertical"
        className="min-h-0 flex-1 items-stretch gap-6"
      >
        <TabsList
          variant="line"
          className="h-auto w-40 shrink-0 items-stretch self-start"
        >
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="vitals">Vitals</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="diagnostics">Diagnostics</TabsTrigger>
          <TabsTrigger value="mar">MAR</TabsTrigger>
          <TabsTrigger value="notes">Progress Notes</TabsTrigger>
          <TabsTrigger value="hp">H&amp;P</TabsTrigger>
          <TabsTrigger value="assessments">Assessments</TabsTrigger>
        </TabsList>

        <div className="relative min-h-0 min-w-0 flex-1">
          <div className="absolute inset-0 overflow-y-auto">
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
            className="absolute inset-0 mt-0 flex min-h-0 flex-col overflow-hidden"
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
