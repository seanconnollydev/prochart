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

export {
  EmptyState,
  SectionHeading,
  DefinitionList,
  BulletList,
  VitalsMap,
};
