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

export function OrdersPanel({ orders }: { orders?: SimulationOrder[] }) {
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
