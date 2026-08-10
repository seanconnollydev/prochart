"use client";

import { useState } from "react";
import type { AssessmentItem } from "@/lib/types/assessment-template";
import type { AssessmentItemResponse } from "@/lib/types/assessment-submission";
import {
  coerceFlowsheetMultiselectValue,
  flowsheetMultiselectChoicesForItem,
  isFlowsheetMultiselectPresentationItem,
  isFlowsheetWdlGateItem,
  segmentWdlDefinitionText,
} from "@/lib/assessments/flowsheet";
import { useIsMdUp } from "@/lib/hooks/use-media-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { Cancel01Icon, QuillWrite02Icon } from "@hugeicons/core-free-icons";

const COMMENT_MAX_LENGTH = 2000;

function InfoPanelCommentSection({
  item,
  responses,
  setItemComment,
}: {
  item: AssessmentItem;
  responses: Record<string, AssessmentItemResponse>;
  setItemComment: (itemId: string, comment: string | undefined) => void;
}) {
  const [commentEditing, setCommentEditing] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");

  const storedCommentRaw = responses[item.id]?.comment;
  const storedComment =
    typeof storedCommentRaw === "string" ? storedCommentRaw.trim() : "";
  const hasStoredComment = storedComment.length > 0;

  const commentFieldId = `flowsheet-info-comment-${item.id}`;

  function beginAddComment() {
    setCommentDraft("");
    setCommentEditing(true);
  }

  function beginEditComment() {
    setCommentDraft(storedComment);
    setCommentEditing(true);
  }

  function saveComment() {
    setItemComment(item.id, commentDraft);
    setCommentEditing(false);
    setCommentDraft("");
  }

  function cancelCommentEdit() {
    setCommentEditing(false);
    setCommentDraft("");
  }

  return (
    <div className="border-border bg-background/80 shrink-0 border-t px-3 py-3 backdrop-blur-sm">
      <h2 className="text-muted-foreground mb-2 text-[10px] font-medium tracking-wide uppercase">
        Comment
      </h2>
      {commentEditing ? (
        <div className="space-y-2">
          <Label htmlFor={commentFieldId} className="sr-only">
            Comment for {item.prompt}
          </Label>
          <Textarea
            id={commentFieldId}
            rows={3}
            maxLength={COMMENT_MAX_LENGTH}
            value={commentDraft}
            onChange={(e) => setCommentDraft(e.target.value)}
            className="min-h-[72px] resize-y px-2 py-1.5 text-xs"
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-muted-foreground text-[10px] tabular-nums">
              {commentDraft.length}/{COMMENT_MAX_LENGTH}
            </p>
            <div className="flex shrink-0 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={cancelCommentEdit}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs"
                onClick={saveComment}
              >
                Save
              </Button>
            </div>
          </div>
        </div>
      ) : hasStoredComment ? (
        <div className="space-y-2">
          <div className="border-border bg-muted/40 flex gap-2 rounded-md border px-2.5 py-2">
            <p className="text-foreground min-w-0 flex-1 whitespace-pre-wrap text-xs leading-snug">
              {storedComment}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-muted-foreground hover:text-foreground shrink-0"
              aria-label="Edit comment"
              onClick={beginEditComment}
            >
              <HugeiconsIcon icon={QuillWrite02Icon} strokeWidth={2} />
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 w-full text-xs"
            onClick={beginAddComment}
          >
            Add comment
          </Button>
        </div>
      )}
    </div>
  );
}

function InfoPanelHeader({
  item,
  pathLine,
  onClose,
  titleAsSheet,
}: {
  item: AssessmentItem;
  pathLine: string;
  onClose: () => void;
  titleAsSheet?: boolean;
}) {
  const pathText = pathLine || "—";

  return (
    <div className="shrink-0 border-b px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          {titleAsSheet ? (
            <SheetDescription className="text-muted-foreground line-clamp-2 text-[10px] leading-tight">
              {pathText}
            </SheetDescription>
          ) : (
            <p className="text-muted-foreground line-clamp-2 text-[10px] leading-tight">
              {pathText}
            </p>
          )}
          {titleAsSheet ? (
            <SheetTitle className="text-foreground mt-0.5 text-xs font-semibold leading-snug">
              {item.prompt}
            </SheetTitle>
          ) : (
            <p className="text-foreground mt-0.5 text-xs font-semibold leading-snug">
              {item.prompt}
            </p>
          )}
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          aria-label="Close info panel"
          onClick={onClose}
        >
          <HugeiconsIcon icon={Cancel01Icon} strokeWidth={2} />
        </Button>
      </div>
      {isFlowsheetWdlGateItem(item) ? (
        <p className="text-muted-foreground mt-2 text-[10px] leading-snug">
          WDL = Within defined limits.
        </p>
      ) : null}
    </div>
  );
}

function InfoPanelBody({
  item,
  definition,
  responses,
  setResponse,
}: {
  item: AssessmentItem;
  definition: string | null;
  responses: Record<string, AssessmentItemResponse>;
  setResponse: (itemId: string, value: AssessmentItemResponse["value"]) => void;
}) {
  const trimmedDefinition = definition?.trim() ?? "";
  const hasWdlDefinition = trimmedDefinition !== "";
  const wdlSegments = segmentWdlDefinitionText(trimmedDefinition);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="p-3">
        {isFlowsheetMultiselectPresentationItem(item)
          ? (() => {
              const panelChoices = flowsheetMultiselectChoicesForItem(item);
              if (panelChoices.length === 0) {
                return null;
              }
              const selectedIds = coerceFlowsheetMultiselectValue(
                responses[item.id]?.value,
              );
              return (
                <>
                  <p className="text-muted-foreground mb-2 text-[10px] font-medium tracking-wide uppercase">
                    Options
                  </p>
                  <div
                    className="mb-3 space-y-2"
                    role="group"
                    aria-label={`Options for ${item.prompt}`}
                  >
                    {panelChoices.map((ch) => {
                      const checked = selectedIds.includes(ch.id);
                      return (
                        <div key={ch.id} className="flex items-center gap-2">
                          <Checkbox
                            id={`flowsheet-info-${item.id}-${ch.id}`}
                            checked={checked}
                            onCheckedChange={(c) => {
                              const next = new Set(selectedIds);
                              if (c === true) {
                                next.add(ch.id);
                              } else {
                                next.delete(ch.id);
                              }
                              setResponse(item.id, [...next]);
                            }}
                            className="cursor-pointer"
                          />
                          <Label
                            htmlFor={`flowsheet-info-${item.id}-${ch.id}`}
                            className="text-foreground cursor-pointer text-xs font-normal leading-snug"
                          >
                            {ch.label}
                          </Label>
                        </div>
                      );
                    })}
                  </div>
                  {hasWdlDefinition ? <Separator className="mb-3" /> : null}
                </>
              );
            })()
          : null}
        {hasWdlDefinition ? (
          <>
            <p className="text-muted-foreground mb-2 text-[10px] font-medium leading-snug">
              Within Defined Limits (WDL) =
            </p>
            {wdlSegments.length === 1 ? (
              <p className="text-foreground text-xs leading-relaxed">
                {wdlSegments[0]}
              </p>
            ) : (
              <ul className="text-foreground list-disc space-y-1.5 pl-4 text-xs leading-relaxed">
                {wdlSegments.map((segment, i) => (
                  <li key={i}>{segment}</li>
                ))}
              </ul>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

function InfoPanelContent({
  item,
  definition,
  pathLine,
  responses,
  setResponse,
  setItemComment,
  onClose,
  titleAsSheet,
}: {
  item: AssessmentItem;
  definition: string | null;
  pathLine: string;
  responses: Record<string, AssessmentItemResponse>;
  setResponse: (itemId: string, value: AssessmentItemResponse["value"]) => void;
  setItemComment: (itemId: string, comment: string | undefined) => void;
  onClose: () => void;
  titleAsSheet?: boolean;
}) {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <InfoPanelHeader
        item={item}
        pathLine={pathLine}
        onClose={onClose}
        titleAsSheet={titleAsSheet}
      />
      <InfoPanelBody
        item={item}
        definition={definition}
        responses={responses}
        setResponse={setResponse}
      />
      <InfoPanelCommentSection
        key={item.id}
        item={item}
        responses={responses}
        setItemComment={setItemComment}
      />
    </div>
  );
}

type Props = {
  open: boolean;
  item: AssessmentItem | null;
  definition: string | null;
  pathLine: string;
  responses: Record<string, AssessmentItemResponse>;
  setResponse: (itemId: string, value: AssessmentItemResponse["value"]) => void;
  setItemComment: (itemId: string, comment: string | undefined) => void;
  onClose: () => void;
};

export function AssessmentFlowsheetInfoPanel({
  open,
  item,
  definition,
  pathLine,
  responses,
  setResponse,
  setItemComment,
  onClose,
}: Props) {
  const isMdUp = useIsMdUp();

  const content =
    item != null ? (
      <InfoPanelContent
        item={item}
        definition={definition}
        pathLine={pathLine}
        responses={responses}
        setResponse={setResponse}
        setItemComment={setItemComment}
        onClose={onClose}
        titleAsSheet={!isMdUp}
      />
    ) : null;

  if (!isMdUp) {
    return (
      <Sheet
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) onClose();
        }}
      >
        <SheetContent
          side="right"
          showCloseButton={false}
          className="bg-background w-[min(22rem,100vw)] max-w-[22rem] gap-0 p-0 sm:max-w-[22rem]"
        >
          {content}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      className={cn(
        "border-border bg-muted/10 flex min-h-0 flex-col border-l transition-[width] duration-200 ease-out",
        open
          ? "sticky top-4 h-full max-h-[calc(100dvh-10rem)] min-h-0 w-[min(22rem,40vw)] shrink-0 overflow-hidden"
          : "w-0 shrink-0 overflow-hidden border-l-0",
      )}
      aria-hidden={!open}
    >
      {item ? (
        <div className="flex h-full min-h-0 min-w-[min(22rem,40vw)] flex-1 flex-col overflow-hidden">
          <InfoPanelContent
            item={item}
            definition={definition}
            pathLine={pathLine}
            responses={responses}
            setResponse={setResponse}
            setItemComment={setItemComment}
            onClose={onClose}
          />
        </div>
      ) : null}
    </aside>
  );
}
