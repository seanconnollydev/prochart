import type { SimulationProgressNote } from "@/lib/types/simulation-template";
import { EmptyState } from "@/components/student/simulation-chart-shared";

export function ProgressNotesPanel({
  notes,
}: {
  notes?: SimulationProgressNote[];
}) {
  if (!notes?.length) return <EmptyState label="No progress notes" />;
  return (
    <div className="space-y-6">
      {notes.map((note) => (
        <article
          key={note.id}
          className="space-y-2 border-border border-b pb-4 last:border-0"
        >
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
          <p className="text-sm whitespace-pre-wrap">{note.content ?? "—"}</p>
        </article>
      ))}
    </div>
  );
}
