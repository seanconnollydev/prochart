"use server";

import { Resend } from "resend";
import { z } from "zod";

const MIN_SUBMIT_MS = 3_000;
const MAX_MESSAGE_LENGTH = 5_000;

const contactSchema = z.object({
  email: z.email().max(320),
  message: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
});

export type SubmitContactResult = { ok: true } | { ok: false; error: string };

function parseRecipients(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export async function submitContact(
  formData: FormData,
): Promise<SubmitContactResult> {
  const honeypot = String(formData.get("company") ?? "").trim();
  if (honeypot) {
    return { ok: true };
  }

  const formStartedAt = Number(formData.get("formStartedAt"));
  if (
    !Number.isFinite(formStartedAt) ||
    Date.now() - formStartedAt < MIN_SUBMIT_MS
  ) {
    return { ok: true };
  }

  const parsed = contactSchema.safeParse({
    email: formData.get("email"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    return { ok: false, error: "Please provide a valid email and message." };
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.CONTACT_FORM_FROM;
  const to = parseRecipients(process.env.CONTACT_FORM_TO);

  if (!apiKey || !from || to.length === 0) {
    console.error("Contact form is not configured (missing env vars).");
    return {
      ok: false,
      error: "Unable to send your message right now. Please try again later.",
    };
  }

  const { email, message } = parsed.data;
  const resend = new Resend(apiKey);
  const date = new Date().toISOString().slice(0, 10);

  const { error } = await resend.emails.send({
    from,
    to,
    replyTo: email,
    subject: `ProChart contact form — ${date}`,
    text: `Submitted by: ${email}\n\n${message}`,
  });

  if (error) {
    console.error("Resend error:", error);
    return {
      ok: false,
      error: "Unable to send your message right now. Please try again later.",
    };
  }

  return { ok: true };
}
