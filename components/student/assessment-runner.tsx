"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { prepareFlowsheetTemplate } from "@/lib/assessments/flowsheet";
import { buildFlowsheetExportRows } from "@/lib/assessments/flowsheet-export";
import { exportFlowsheetAssessmentPdf } from "@/lib/assessments/flowsheet-pdf";
import { groupPathLabels } from "@/lib/assessments/group-path";
import { useLocalAssessmentSubmission } from "@/lib/hooks/use-local-assessment-submission";
import { nowIso } from "@/lib/ids";
import {
  normalizeAssessmentTemplate,
  type AssessmentTemplate,
} from "@/lib/types/assessment-template";
import type { AssessmentItemResponse } from "@/lib/types/assessment-submission";
import { AssessmentFlowsheetLayout } from "@/components/student/assessment-flowsheet-layout";
import { AssessmentWorksheetLayout } from "@/components/student/assessment-worksheet-layout";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LicenseNoticeProse } from "@/lib/format/linkify-plain-text";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { FileExportIcon } from "@hugeicons/core-free-icons";
import { ArrowLeft, InfoIcon } from "lucide-react";

function hasMeaningfulResponses(
  responses: Record<string, AssessmentItemResponse>,
): boolean {
  for (const r of Object.values(responses)) {
    const c = r?.comment;
    if (typeof c === "string" && c.trim() !== "") {
      return true;
    }
    const v = r?.value;
    if (v === true || v === false) {
      return true;
    }
    if (typeof v === "number" && !Number.isNaN(v)) {
      return true;
    }
    if (typeof v === "string" && v.trim() !== "") {
      return true;
    }
    if (Array.isArray(v) && v.length > 0) {
      return true;
    }
  }
  return false;
}

function FlowsheetPdfExportButton({
  disabled,
  template: templateForExport,
  responses,
}: {
  disabled: boolean;
  template: AssessmentTemplate;
  responses: Record<string, AssessmentItemResponse>;
}) {
  async function handleExportPdf() {
    try {
      const prepared = prepareFlowsheetTemplate(templateForExport);
      const rows = buildFlowsheetExportRows(prepared, responses);
      await exportFlowsheetAssessmentPdf({
        title: templateForExport.title,
        description: templateForExport.description?.trim() || undefined,
        rows,
        exportedAtLabel: new Date().toLocaleString(),
      });
      toast.success("PDF downloaded.");
    } catch {
      toast.error("Could not export PDF.");
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      disabled={disabled}
      title="Export to PDF"
      aria-label="Export to PDF"
      onClick={() => void handleExportPdf()}
    >
      <HugeiconsIcon icon={FileExportIcon} strokeWidth={2} className="size-4" />
    </Button>
  );
}

function FlowsheetLicenseNoticePopover({ notice }: { notice: string }) {
  return (
    <Popover>
      <PopoverTrigger
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon" }),
          "text-muted-foreground shrink-0",
        )}
        aria-label="License and attribution"
      >
        <InfoIcon className="size-4" aria-hidden />
      </PopoverTrigger>
      <PopoverContent
        className="max-w-md w-[min(100vw-2rem,28rem)] gap-3 py-3"
        align="end"
        side="bottom"
        sideOffset={4}
      >
        <LicenseNoticeProse text={notice} />
      </PopoverContent>
    </Popover>
  );
}

type Props = {
  templateId: string;
  template: AssessmentTemplate;
  /** Shown above the title (e.g. author preview). */
  previewBanner?: string;
  backHref?: string;
  /** Accessible name for the header back control (icon-only). */
  backLabel?: string;
  /** When true, show submission status badges in the header. */
  showSubmissionStatus?: boolean;
};

export function AssessmentRunner({
  templateId,
  template: templateRaw,
  previewBanner,
  backHref = "/student/assessments",
  backLabel = "Back to practice assessments",
  showSubmissionStatus = false,
}: Props) {
  const template = useMemo(
    () => normalizeAssessmentTemplate(templateRaw),
    [templateRaw],
  );

  const { document, meta, setDocument, setSyncError, hydrated } =
    useLocalAssessmentSubmission(templateId);

  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [flowsheetRemountKey, setFlowsheetRemountKey] = useState(0);

  const layout = template.presentation?.layout ?? "cards";

  function setResponse(
    itemId: string,
    value: AssessmentItemResponse["value"],
    clearItemIds?: string[],
  ) {
    setDocument((d) => {
      const nextResponses = {
        ...d.responses,
        [itemId]: { ...d.responses[itemId], value },
      };
      for (const id of clearItemIds ?? []) {
        if (id !== itemId) {
          delete nextResponses[id];
        }
      }
      return {
        ...d,
        responses: nextResponses,
        updatedAt: nowIso(),
      };
    });
  }

  function setItemComment(itemId: string, comment: string | undefined) {
    setDocument((d) => {
      const prev = { ...(d.responses[itemId] ?? {}) };
      const trimmed = comment?.trim();
      if (trimmed) {
        prev.comment = trimmed;
      } else {
        delete prev.comment;
      }
      const nextResponses = { ...d.responses };
      if (Object.keys(prev).length === 0) {
        delete nextResponses[itemId];
      } else {
        nextResponses[itemId] = prev;
      }
      return {
        ...d,
        responses: nextResponses,
        updatedAt: nowIso(),
      };
    });
  }

  function handleResetConfirm() {
    setSyncError(null);
    setDocument((d) => ({ ...d, responses: {} }));
    setFlowsheetRemountKey((k) => k + 1);
    toast.success("Assessment reset.");
    setResetDialogOpen(false);
  }

  if (!hydrated || !document) {
    return <p className="text-muted-foreground text-sm">Loading…</p>;
  }

  const groups = template.groups ?? [];

  return (
    <div
      className={cn(
        layout !== "flowsheet" && "space-y-6",
        layout === "flowsheet" && "flex min-h-0 flex-1 flex-col gap-6",
      )}
    >
      {previewBanner && (
        <p className="bg-muted text-muted-foreground rounded-md border px-3 py-2 text-sm">
          {previewBanner}
        </p>
      )}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 flex-1 gap-2">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="mt-1 size-9 shrink-0 sm:mt-0.5"
          >
            <Link href={backHref} aria-label={backLabel}>
              <ArrowLeft className="size-4" aria-hidden />
            </Link>
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-semibold break-words">
              {template.title}
            </h1>
            {template.description && (
              <p className="text-muted-foreground mt-1 text-sm">
                {template.description}
              </p>
            )}
            {showSubmissionStatus && (
              <div className="mt-2 flex gap-2">
                <Badge variant="secondary">{document.status}</Badge>
              </div>
            )}
            {meta?.syncError && (
              <p className="text-destructive mt-1 text-sm">{meta.syncError}</p>
            )}
          </div>
        </div>
        {document.status !== "submitted" ? (
          <div className="flex flex-wrap items-center gap-2">
            {layout === "flowsheet" && template.licenseNotice ? (
              <FlowsheetLicenseNoticePopover notice={template.licenseNotice} />
            ) : null}
            <Button
              type="button"
              variant="outline"
              disabled={!hasMeaningfulResponses(document.responses)}
              onClick={() => setResetDialogOpen(true)}
            >
              Reset
            </Button>
            {layout === "flowsheet" && (
              <FlowsheetPdfExportButton
                disabled={!hasMeaningfulResponses(document.responses)}
                template={template}
                responses={document.responses}
              />
            )}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            {layout === "flowsheet" && template.licenseNotice ? (
              <FlowsheetLicenseNoticePopover notice={template.licenseNotice} />
            ) : null}
            <Badge>Submitted</Badge>
            {layout === "flowsheet" && (
              <FlowsheetPdfExportButton
                disabled={!hasMeaningfulResponses(document.responses)}
                template={template}
                responses={document.responses}
              />
            )}
          </div>
        )}
      </div>

      <AlertDialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Start over?</AlertDialogTitle>
            <AlertDialogDescription>
              This clears all answers for this assessment. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              onClick={handleResetConfirm}
            >
              Reset
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {layout === "flowsheet" ? (
        <div className="min-h-0 w-full flex-1">
          <AssessmentFlowsheetLayout
            key={flowsheetRemountKey}
            className="h-full min-h-0"
            template={template}
            responses={document.responses}
            setResponse={setResponse}
            setItemComment={setItemComment}
          />
        </div>
      ) : layout === "worksheet" ? (
        <AssessmentWorksheetLayout
          template={template}
          responses={document.responses}
          setResponse={setResponse}
        />
      ) : (
        <div className="space-y-6">
          {template.items.map((item) => {
            const path = groupPathLabels(groups, item.groupId);
            const groupLine = path.length > 0 ? path.join(" → ") : null;
            return (
              <Card key={item.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{item.prompt}</CardTitle>
                  {groupLine && <CardDescription>{groupLine}</CardDescription>}
                </CardHeader>
                <CardContent>
                  {item.responseType === "boolean" && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id={`${item.id}-bool`}
                        checked={Boolean(
                          document.responses[item.id]?.value === true,
                        )}
                        onCheckedChange={(c) =>
                          setResponse(item.id, c === true)
                        }
                      />
                      <Label htmlFor={`${item.id}-bool`}>
                        Yes / within limits
                      </Label>
                    </div>
                  )}
                  {(item.responseType === "choice" ||
                    item.responseType === "multiChoice") && (
                    <div className="space-y-3">
                      {item.responseType === "choice" ? (
                        <RadioGroup
                          value={String(
                            document.responses[item.id]?.value ?? "",
                          )}
                          onValueChange={(v) => setResponse(item.id, v)}
                        >
                          {(item.choices ?? []).map((ch) => (
                            <div
                              key={ch.id}
                              className="flex items-center gap-2"
                            >
                              <RadioGroupItem
                                value={ch.id}
                                id={`${item.id}-${ch.id}`}
                              />
                              <Label
                                htmlFor={`${item.id}-${ch.id}`}
                                className="font-normal"
                              >
                                {ch.label}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      ) : (
                        <div className="space-y-2">
                          {(item.choices ?? []).map((ch) => {
                            const selected = Array.isArray(
                              document.responses[item.id]?.value,
                            )
                              ? (document.responses[item.id]?.value as string[])
                              : [];
                            const checked = selected.includes(ch.id);
                            return (
                              <div
                                key={ch.id}
                                className="flex items-center gap-2"
                              >
                                <Checkbox
                                  id={`${item.id}-${ch.id}`}
                                  checked={checked}
                                  onCheckedChange={(c) => {
                                    const next = new Set(selected);
                                    if (c === true) {
                                      next.add(ch.id);
                                    } else {
                                      next.delete(ch.id);
                                    }
                                    setResponse(item.id, [...next]);
                                  }}
                                />
                                <Label
                                  htmlFor={`${item.id}-${ch.id}`}
                                  className="font-normal"
                                >
                                  {ch.label}
                                </Label>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                  {item.responseType === "text" && (
                    <Textarea
                      rows={4}
                      value={String(document.responses[item.id]?.value ?? "")}
                      onChange={(e) => setResponse(item.id, e.target.value)}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {template.licenseNotice && layout !== "flowsheet" ? (
        <div className="border-t pt-4">
          <LicenseNoticeProse text={template.licenseNotice} />
        </div>
      ) : null}
    </div>
  );
}
