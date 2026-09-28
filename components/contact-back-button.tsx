"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const FALLBACK_HREF = "/student/assessments";

export function ContactBackButton() {
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="self-start"
      onClick={() => {
        if (typeof window !== "undefined" && window.history.length > 1) {
          router.back();
          return;
        }
        router.push(FALLBACK_HREF);
      }}
    >
      <ArrowLeft className="size-4" aria-hidden data-icon="inline-start" />
      Go back
    </Button>
  );
}
