import type { Metadata } from "next";
import { ContactBackButton } from "@/components/contact-back-button";
import { ContactForm } from "@/components/contact-form";

export const metadata: Metadata = {
  title: "Contact — ProChart RN",
  description:
    "Share assessment requests, usage feedback, feature ideas, or bugs with the ProChart team.",
};

export default function ContactPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center">
      <div className="w-full max-w-lg space-y-6">
        <div className="space-y-2">
          <ContactBackButton />
          <h1 className="text-2xl font-semibold">Contact</h1>
          <p className="text-muted-foreground text-sm">
            We welcome feedback from students, faculty and simulation
            coordinators. Tell us about assessment requests, how you use
            ProChart, features that would help in your curriculum, or bugs
            you&apos;ve run into.
          </p>
        </div>
        <ContactForm />
      </div>
    </div>
  );
}
