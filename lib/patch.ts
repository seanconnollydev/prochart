import type { CaseStudyDocument } from "./types/case-study";
import type { FieldPatch, PromptPatchEnvelope } from "./types/prompt-patch";

function parsePointer(path: string): string[] {
  if (!path.startsWith("/")) {
    throw new Error(`Invalid path: ${path}`);
  }
  if (path === "/") {
    return [];
  }
  return path
    .slice(1)
    .split("/")
    .map((p) => p.replace(/~1/g, "/").replace(/~0/g, "~"));
}

function ensurePath(root: Record<string, unknown>, segments: string[]): void {
  let cur: unknown = root;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i]!;
    const nextSeg = segments[i + 1];
    if (cur === null || typeof cur !== "object") {
      throw new Error("Cannot ensure path: invalid parent");
    }
    const o = cur as Record<string, unknown>;
    if (!(seg in o) || o[seg] === undefined) {
      if (nextSeg === "-") {
        o[seg] = [];
      } else if (nextSeg !== undefined && !Number.isNaN(Number(nextSeg))) {
        o[seg] = [];
      } else {
        o[seg] = {};
      }
    }
    cur = o[seg];
  }
}

function applyOne(
  root: CaseStudyDocument,
  patch: FieldPatch,
): CaseStudyDocument {
  const segments = parsePointer(patch.path);

  if (patch.op === "replace" && segments.length === 0) {
    if (typeof patch.value !== "object" || patch.value === null) {
      throw new Error("replace root requires object");
    }
    return { ...(patch.value as CaseStudyDocument) };
  }

  const next = structuredClone(root) as Record<string, unknown>;
  ensurePath(next, segments);

  let cur: unknown = next;
  for (let i = 0; i < segments.length - 1; i++) {
    const seg = segments[i]!;
    if (Array.isArray(cur)) {
      const idx = Number(seg);
      cur = cur[idx];
    } else {
      cur = (cur as Record<string, unknown>)[seg];
    }
  }

  const last = segments[segments.length - 1]!;

  if (patch.op === "add" && Array.isArray(cur) && last === "-") {
    (cur as unknown[]).push(patch.value);
    return next as CaseStudyDocument;
  }

  if (Array.isArray(cur)) {
    const idx = Number(last);
    if (Number.isNaN(idx)) {
      throw new Error("Invalid array index in path");
    }
    if (patch.op === "add") {
      (cur as unknown[]).splice(idx, 0, patch.value);
    } else {
      (cur as unknown[])[idx] = patch.value;
    }
    return next as CaseStudyDocument;
  }

  if (cur !== null && typeof cur === "object") {
    (cur as Record<string, unknown>)[last] = patch.value;
    return next as CaseStudyDocument;
  }

  throw new Error("Invalid patch target");
}

export function applyFieldPatch(
  doc: CaseStudyDocument,
  patch: FieldPatch,
): CaseStudyDocument {
  return applyOne(doc, patch);
}

export function applyPromptPatches(
  doc: CaseStudyDocument,
  envelope: PromptPatchEnvelope,
): CaseStudyDocument {
  let cur = doc;
  for (const p of envelope.patches) {
    cur = applyOne(cur, p);
  }
  return cur;
}
