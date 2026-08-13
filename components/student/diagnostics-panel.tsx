import type {
  SimulationLabPanel,
  SimulationTemplate,
} from "@/lib/types/simulation-template";
import {
  DefinitionList,
  EmptyState,
  SectionHeading,
} from "@/components/student/simulation-chart-shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

export function DiagnosticsPanel({
  template,
}: {
  template: SimulationTemplate;
}) {
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
