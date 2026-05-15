"use client";

import type { PromptPatchEnvelope } from "./types/prompt-patch";

export function isChromePromptLikelyAvailable(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const ai = (window as unknown as { ai?: Record<string, unknown> }).ai;
  return Boolean(
    ai &&
    (typeof ai.languageModel === "object" ||
      typeof ai.createTextSession === "function"),
  );
}

/**
 * Uses experimental Chrome Prompt / on-device AI when available.
 * API surface varies by Chrome version; this tries common shapes.
 */
export async function runPromptForPatches(
  systemHint: string,
  userMessage: string,
): Promise<string> {
  const full = `${systemHint}\n\n${userMessage}`;
  const w = window as unknown as {
    ai?: {
      languageModel?: {
        create?: () => Promise<{ prompt: (s: string) => Promise<string> }>;
      };
      createTextSession?: () => Promise<{
        prompt: (s: string) => Promise<string>;
      }>;
    };
  };
  if (w.ai?.languageModel?.create) {
    const model = await w.ai.languageModel.create();
    return model.prompt(full);
  }
  if (w.ai?.createTextSession) {
    const session = await w.ai.createTextSession();
    return session.prompt(full);
  }
  throw new Error("Chrome Prompt API is not available in this browser.");
}

export function parsePatchEnvelope(raw: string): PromptPatchEnvelope {
  const cleaned = raw
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/```\s*$/i, "");
  const parsed = JSON.parse(cleaned) as PromptPatchEnvelope;
  if (!parsed.patches || !Array.isArray(parsed.patches)) {
    throw new Error("Invalid envelope: missing patches array");
  }
  return parsed;
}
