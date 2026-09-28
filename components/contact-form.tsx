"use client";

import * as React from "react";
import { toast } from "sonner";
import { submitContact } from "@/lib/actions/contact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ContactForm() {
  const [pending, setPending] = React.useState(false);
  const [formStartedAt] = React.useState(() => Date.now());

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const form = event.currentTarget;
    const formData = new FormData(form);
    formData.set("formStartedAt", String(formStartedAt));

    setPending(true);
    try {
      const result = await submitContact(formData);
      if (result.ok) {
        toast.success("Message sent. Thank you.");
        form.reset();
      } else {
        toast.error(result.error);
      }
    } catch {
      toast.error(
        "Unable to send your message right now. Please try again later.",
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={onSubmit}
      className="relative flex max-w-lg flex-col gap-4"
      noValidate
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden opacity-0"
      >
        <label htmlFor="contact-company">Company</label>
        <input
          id="contact-company"
          name="company"
          type="text"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="contact-email">Email</Label>
        <Input
          id="contact-email"
          name="email"
          type="email"
          required
          autoComplete="email"
          disabled={pending}
        />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="contact-message">Message</Label>
        <Textarea
          id="contact-message"
          name="message"
          required
          rows={6}
          maxLength={5000}
          disabled={pending}
        />
      </div>

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Sending…" : "Send message"}
      </Button>
    </form>
  );
}
