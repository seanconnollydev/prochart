import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

type StudentPageHeaderProps = {
  title: string;
  description?: string;
  backHref: string;
  backLabel: string;
};

export function StudentPageHeader({
  title,
  description,
  backHref,
  backLabel,
}: StudentPageHeaderProps) {
  return (
    <div className="flex min-w-0 gap-2">
      <Button
        asChild
        variant="ghost"
        size="icon"
        className="mt-1 size-9 shrink-0 sm:mt-0.5"
      >
        <Link href={backHref} aria-label={backLabel}>
          <ArrowLeft className="size-4" aria-hidden />
        </Link>
      </Button>
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-semibold break-words">{title}</h1>
        {description ? (
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        ) : null}
      </div>
    </div>
  );
}
