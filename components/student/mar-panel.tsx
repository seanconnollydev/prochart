import type { SimulationMAREntry } from "@/lib/types/simulation-template";
import { EmptyState } from "@/components/student/simulation-chart-shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function MarPanel({ mar }: { mar?: SimulationMAREntry[] }) {
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
