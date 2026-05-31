"use client";

import type { AssessmentTemplate } from "@/lib/types/assessment-template";
import type { AssessmentItemResponse } from "@/lib/types/assessment-submission";
import { groupPathLabels } from "@/lib/assessments/group-path";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Props = {
  template: AssessmentTemplate;
  responses: Record<string, AssessmentItemResponse>;
  setResponse: (itemId: string, value: AssessmentItemResponse["value"]) => void;
};

export function AssessmentWorksheetLayout({
  template,
  responses,
  setResponse,
}: Props) {
  const groups = template.groups ?? [];
  const items = template.items;

  const blocks: { groupId: string; path: string[]; items: typeof items }[] = [];
  for (const item of items) {
    const gid = item.groupId ?? "";
    const path = groupPathLabels(groups, item.groupId);
    const last = blocks[blocks.length - 1];
    if (last && last.groupId === gid) {
      last.items.push(item);
    } else {
      blocks.push({ groupId: gid, path, items: [item] });
    }
  }

  return (
    <div className="space-y-10">
      {blocks.map((block) => (
        <section key={block.groupId || "ungrouped"} className="space-y-3">
          {block.path.length > 0 && (
            <h2 className="text-foreground border-b pb-2 text-lg font-medium">
              {block.path.join(" → ")}
            </h2>
          )}
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[200px] max-w-[50%]">
                    Concept
                  </TableHead>
                  <TableHead className="min-w-[220px]">List choice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {block.items.map((item) => {
                  const selId = `adult-physical-assessment-select-${item.id}`;
                  const val = String(responses[item.id]?.value ?? "");
                  return (
                    <TableRow key={item.id}>
                      <TableCell className="align-top text-sm whitespace-normal">
                        <Label
                          htmlFor={selId}
                          className="font-normal leading-snug"
                        >
                          {item.prompt}
                        </Label>
                      </TableCell>
                      <TableCell className="align-top">
                        {(item.responseType === "choice" ||
                          item.responseType === "multiChoice") && (
                          <select
                            id={selId}
                            className="border-input bg-background ring-offset-background focus-visible:ring-ring max-w-full min-w-[12rem] rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                            value={val}
                            onChange={(e) =>
                              setResponse(item.id, e.target.value || undefined)
                            }
                            aria-label={item.prompt}
                          >
                            <option value="">Select…</option>
                            {(item.choices ?? []).map((ch) => (
                              <option key={ch.id} value={ch.id}>
                                {ch.label}
                              </option>
                            ))}
                          </select>
                        )}
                        {item.responseType === "boolean" && (
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={Boolean(
                                responses[item.id]?.value === true,
                              )}
                              onChange={(e) =>
                                setResponse(item.id, e.target.checked)
                              }
                            />
                            Yes / within limits
                          </label>
                        )}
                        {item.responseType === "text" && (
                          <textarea
                            id={selId}
                            className="border-input bg-background min-h-[80px] w-full max-w-full rounded-md border px-3 py-2 text-sm"
                            value={String(responses[item.id]?.value ?? "")}
                            onChange={(e) =>
                              setResponse(item.id, e.target.value)
                            }
                            aria-label={item.prompt}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </section>
      ))}
    </div>
  );
}
