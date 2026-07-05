import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StudentSimulationsPage() {
  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link href="/student">
          <ArrowLeft className="size-4" aria-hidden />
          Back to practice modes
        </Link>
      </Button>
      <div>
        <h1 className="text-2xl font-semibold">Simulations</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Case-study EHR simulations are coming soon.
        </p>
      </div>
    </div>
  );
}
