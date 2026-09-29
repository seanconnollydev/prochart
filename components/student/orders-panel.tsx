import type { SimulationOrder } from "@/lib/types/simulation-template";
import { EmptyState } from "@/components/student/simulation-chart-shared";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export function OrdersPanel({ orders }: { orders?: SimulationOrder[] }) {
  if (!orders?.length) return <EmptyState label="No orders" />;
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[12%]">Date</TableHead>
          <TableHead className="w-[18%]">Time</TableHead>
          <TableHead>Order</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell className="align-top whitespace-pre-wrap">
              {entry.date ?? ""}
            </TableCell>
            <TableCell className="align-top whitespace-pre-wrap">
              {entry.time ?? ""}
            </TableCell>
            <TableCell className="align-top whitespace-pre-wrap">
              {entry.order}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
