import type { LocalDocumentMeta, LocalWrapped } from "./types/local-meta";

const PREFIX = "prochart:prototype-alpha:";

export type StorageNamespace =
  | "case-study-draft"
  | "assessment-template-draft"
  | "assessment-submission";

function key(ns: StorageNamespace, id: string): string {
  return `${PREFIX}${ns}:${id}`;
}

function submissionKey(templateId: string): string {
  return `${PREFIX}assessment-submission:${templateId}`;
}

function normalizeMeta(
  m: Partial<LocalDocumentMeta> | undefined,
): LocalDocumentMeta {
  return {
    updatedAt: m?.updatedAt ?? new Date().toISOString(),
    dirty: m?.dirty ?? false,
    lastSyncedAt: m?.lastSyncedAt ?? null,
    syncedBasisAt: m?.syncedBasisAt ?? null,
    syncError: m?.syncError ?? null,
  };
}

export function readWrapped<T>(
  ns: StorageNamespace,
  id: string,
): LocalWrapped<T> | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = localStorage.getItem(key(ns, id));
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as LocalWrapped<T>;
    return {
      document: parsed.document,
      meta: normalizeMeta(parsed.meta),
    };
  } catch {
    return null;
  }
}

export function readSubmission<T>(templateId: string): LocalWrapped<T> | null {
  if (typeof window === "undefined") {
    return null;
  }
  const raw = localStorage.getItem(submissionKey(templateId));
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as LocalWrapped<T>;
    return {
      document: parsed.document,
      meta: normalizeMeta(parsed.meta),
    };
  } catch {
    return null;
  }
}

export function writeWrapped<T>(
  ns: StorageNamespace,
  id: string,
  wrapped: LocalWrapped<T>,
): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(key(ns, id), JSON.stringify(wrapped));
}

export function writeSubmission<T>(
  templateId: string,
  wrapped: LocalWrapped<T>,
): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.setItem(submissionKey(templateId), JSON.stringify(wrapped));
}

export function removeWrapped(ns: StorageNamespace, id: string): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(key(ns, id));
}

export function listIds(ns: StorageNamespace): string[] {
  if (typeof window === "undefined") {
    return [];
  }
  const p = `${PREFIX}${ns}:`;
  const ids: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(p)) {
      ids.push(k.slice(p.length));
    }
  }
  return ids;
}

export function listSubmissionKeys(): Array<{ templateId: string }> {
  if (typeof window === "undefined") {
    return [];
  }
  const p = `${PREFIX}assessment-submission:`;
  const out: Array<{ templateId: string }> = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k?.startsWith(p)) {
      const templateId = k.slice(p.length);
      if (templateId.length > 0) {
        out.push({ templateId });
      }
    }
  }
  return out;
}

export function defaultMeta(updatedAt: string): LocalDocumentMeta {
  return {
    updatedAt,
    dirty: true,
    lastSyncedAt: null,
    syncedBasisAt: null,
    syncError: null,
  };
}

export function debounce<TArgs extends unknown[]>(
  fn: (...args: TArgs) => void,
  ms: number,
): ((...args: TArgs) => void) & { flush: () => void; cancel: () => void } {
  let t: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: TArgs | null = null;
  const run = () => {
    t = null;
    if (lastArgs) {
      fn(...lastArgs);
      lastArgs = null;
    }
  };
  const debounced = ((...args: TArgs) => {
    lastArgs = args;
    if (t) {
      clearTimeout(t);
    }
    t = setTimeout(run, ms);
  }) as ((...args: TArgs) => void) & {
    flush: () => void;
    cancel: () => void;
  };
  debounced.flush = () => {
    if (t) {
      clearTimeout(t);
      t = null;
    }
    run();
  };
  debounced.cancel = () => {
    if (t) {
      clearTimeout(t);
      t = null;
    }
    lastArgs = null;
  };
  return debounced;
}
