"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  debounce,
  defaultMeta,
  readWrapped,
  writeWrapped,
  type StorageNamespace,
} from "../local-storage";
import { isBuiltinTemplateId } from "@/lib/assessments/builtin";
import {
  emptyAssessmentTemplate,
  tryNormalizeAssessmentTemplate,
  type AssessmentTemplate,
} from "../types/assessment-template";
import { nowIso } from "../ids";

const NS: StorageNamespace = "assessment-template-draft";

export function useLocalAssessmentTemplate(templateId: string | undefined) {
  const [wrapped, setWrapped] = useState<{
    document: AssessmentTemplate;
    meta: import("../types/local-meta").LocalDocumentMeta;
  } | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const saveDebounced = useMemo(
    () =>
      debounce(
        (
          doc: AssessmentTemplate,
          meta: import("../types/local-meta").LocalDocumentMeta,
        ) => {
          if (!templateId) {
            return;
          }
          writeWrapped(NS, templateId, { document: doc, meta });
        },
        400,
      ),
    [templateId],
  );

  useEffect(() => {
    saveDebounced.cancel();
    if (!templateId) {
      queueMicrotask(() => {
        setWrapped(null);
        setHydrated(true);
      });
      return;
    }
    if (isBuiltinTemplateId(templateId)) {
      queueMicrotask(() => {
        setWrapped(null);
        setHydrated(true);
      });
      return;
    }
    queueMicrotask(() => {
      const existing = readWrapped<AssessmentTemplate>(NS, templateId);
      if (existing) {
        const parsed =
          tryNormalizeAssessmentTemplate(existing.document) ??
          emptyAssessmentTemplate(templateId);
        setWrapped({
          document: parsed,
          meta: existing.meta,
        });
      } else {
        const doc = emptyAssessmentTemplate(templateId);
        const meta = defaultMeta(doc.updatedAt);
        setWrapped({ document: doc, meta });
        writeWrapped(NS, templateId, { document: doc, meta });
      }
      setHydrated(true);
    });
    return () => {
      saveDebounced.flush();
    };
  }, [templateId, saveDebounced]);

  const setDocument = useCallback(
    (updater: (prev: AssessmentTemplate) => AssessmentTemplate) => {
      setWrapped((w) => {
        if (!w || !templateId) {
          return w;
        }
        const nextDoc = updater(w.document);
        const updatedAt = nowIso();
        const meta = { ...w.meta, updatedAt, dirty: true };
        const next = { document: { ...nextDoc, updatedAt }, meta };
        saveDebounced(next.document, meta);
        return next;
      });
    },
    [templateId, saveDebounced],
  );

  const markSynced = useCallback(
    (lastSyncedAt: string, syncedBasisAt: string) => {
      setWrapped((w) => {
        if (!w) {
          return w;
        }
        const meta = {
          ...w.meta,
          dirty: false,
          lastSyncedAt,
          syncedBasisAt,
          syncError: null,
        };
        if (templateId) {
          writeWrapped(NS, templateId, { document: w.document, meta });
        }
        return { document: w.document, meta };
      });
    },
    [templateId],
  );

  const setSyncError = useCallback((message: string | null) => {
    setWrapped((w) => {
      if (!w) {
        return w;
      }
      const meta = { ...w.meta, syncError: message };
      return { document: w.document, meta };
    });
  }, []);

  useEffect(() => {
    const flush = () => saveDebounced.flush();
    window.addEventListener("beforeunload", flush);
    return () => {
      window.removeEventListener("beforeunload", flush);
    };
  }, [saveDebounced]);

  return {
    document: wrapped?.document ?? null,
    meta: wrapped?.meta ?? null,
    setDocument,
    markSynced,
    setSyncError,
    hydrated,
  };
}
