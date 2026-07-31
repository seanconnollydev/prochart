import Link from "next/link";
import { ClipboardList, Monitor } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";

const practiceModes = [
  {
    title: "Assessments",
    description: "Practice individual assessments outside a case study.",
    href: "/student/assessments",
    icon: ClipboardList,
    iconBg: "bg-pink-500",
  },
  {
    title: "Simulations",
    description: "Case-study EHR simulations.",
    href: "/student/simulations",
    icon: Monitor,
    iconBg: "bg-indigo-500",
  },
] as const;

export default function StudentPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="w-full space-y-6 md:max-w-2xl">
          <div>
            <h1 className="text-2xl font-semibold">Choose a practice mode</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Select assessments or simulations to begin practicing.
            </p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {practiceModes.map((mode) => (
              <Link
                key={mode.title}
                href={mode.href}
                className="group relative flex gap-x-4 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${mode.iconBg}`}
                >
                  <mode.icon className="size-5 text-white" aria-hidden="true" />
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-foreground group-hover:text-foreground/80">
                    {mode.title}
                    <span aria-hidden="true"> →</span>
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {mode.description}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
      <SiteFooter className="border-0 px-0" />
    </div>
  );
}
