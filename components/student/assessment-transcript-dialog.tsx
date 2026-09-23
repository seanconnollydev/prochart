"use client";

import { useState } from "react";
import { toast } from "sonner";
import { EXAMPLE_ASSESSMENT_TRANSCRIPT } from "@/lib/assessments/fill-from-transcript/example-transcript";
import type { AssessmentItemResponse } from "@/lib/types/assessment-submission";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { HugeiconsIcon } from "@hugeicons/react";
import { File01Icon } from "@hugeicons/core-free-icons";

type Props = {
  templateId: string;
  disabled?: boolean;
  onApply: (responses: Record<string, AssessmentItemResponse>) => void;
};

export function AssessmentTranscriptDialog({
  templateId,
  disabled = false,
  onApply,
}: Props) {
  const [open, setOpen] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [applying, setApplying] = useState(false);

  async function handleApply() {
    const trimmed = transcript.trim();
    if (!trimmed) {
      toast.error("Enter a transcript first.");
      return;
    }
    setApplying(true);
    try {
      const res = await fetch("/api/assessments/fill-from-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateId, transcript: trimmed }),
      });
      const data = (await res.json().catch(() => null)) as {
        responses?: Record<string, AssessmentItemResponse>;
        error?: string;
      } | null;
      if (!res.ok) {
        toast.error(data?.error ?? "Could not apply transcript.");
        return;
      }
      const responses = data?.responses ?? {};
      onApply(responses);
      const count = Object.keys(responses).length;
      toast.success(
        count > 0
          ? `Applied transcript to ${count} field${count === 1 ? "" : "s"}.`
          : "No assessment fields matched this transcript.",
      );
      setOpen(false);
    } catch {
      toast.error("Could not apply transcript.");
    } finally {
      setApplying(false);
    }
  }

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="icon"
        disabled={disabled}
        title="Enter transcript"
        aria-label="Enter transcript"
        onClick={() => setOpen(true)}
      >
        <HugeiconsIcon icon={File01Icon} strokeWidth={2} className="size-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="flex max-h-[calc(100dvh-2rem)] w-full max-w-[calc(100%-2rem)] flex-col gap-4 overflow-hidden sm:max-w-lg"
          showCloseButton={!applying}
        >
          <DialogHeader className="shrink-0 pr-8">
            <DialogTitle>Assessment transcript</DialogTitle>
            <DialogDescription>
              Paste a clinical transcript. The clinical AI assistant will fill
              related assessment fields from the evidence in the text.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={transcript}
            disabled={applying}
            placeholder="Paste or type the assessment transcript…"
            className="field-sizing-fixed min-h-32 max-h-[calc(100dvh-14rem)] flex-1 overflow-y-auto font-mono text-xs"
            onChange={(e) => setTranscript(e.target.value)}
          />
          <DialogFooter className="shrink-0 gap-2 sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              disabled={applying}
              onClick={() => setTranscript(EXAMPLE_ASSESSMENT_TRANSCRIPT)}
            >
              Load example
            </Button>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <Button
                type="button"
                variant="outline"
                disabled={applying}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={applying || !transcript.trim()}
                onClick={() => void handleApply()}
              >
                {applying ? "Applying…" : "Apply to assessment"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
