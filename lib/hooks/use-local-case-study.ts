"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  debounce,
  defaultMeta,
  readWrapped,
  writeWrapped,
  type StorageNamespace,
} from "../local-storage";
import {
  emptyCaseStudyDocument,
  type CaseStudyDocument,
} from "../types/case-study";
import { nowIso } from "../ids";

const NS: StorageNamespace = "case-study-draft";

export function useLocalCaseStudy(caseStudyId: string | undefined) {
  const [wrapped, setWrapped] = useState<{
    document: CaseStudyDocument;
    meta: import("../types/local-meta").LocalDocumentMeta;
  } | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const saveDebounced = useMemo(
    () =>
      debounce(
        (doc: CaseStudyDocument, meta: import("../types/local-meta").LocalDocumentMeta) => {
          if (!caseStudyId) {
            return;
          }
          writeWrapped(NS, caseStudyId, { document: doc, meta });
        },
        400,
      ),
    [caseStudyId],
  );

  useEffect(() => {
    saveDebounced.cancel();
    if (!caseStudyId) {
      queueMicrotask(() => {
        setWrapped(null);
        setHydrated(true);
      });
      return;
    }
    queueMicrotask(() => {
      const existing = readWrapped<CaseStudyDocument>(NS, caseStudyId);
      if (existing) {
        setWrapped(existing);
      } else {
        const doc = emptyCaseStudyDocument(caseStudyId);
        const meta = defaultMeta(doc.updatedAt);
        setWrapped({ document: doc, meta });
        writeWrapped(NS, caseStudyId, { document: doc, meta });
      }
      setHydrated(true);
    });
    return () => {
      saveDebounced.flush();
    };
  }, [caseStudyId, saveDebounced]);

  const setDocument = useCallback(
    (updater: (prev: CaseStudyDocument) => CaseStudyDocument) => {
      setWrapped((w) => {
        if (!w || !caseStudyId) {
          return w;
        }
        const nextDoc = updater(w.document);
        const updatedAt = nowIso();
        const meta = {
          ...w.meta,
          updatedAt,
          dirty: true,
        };
        const next = { document: { ...nextDoc, updatedAt }, meta };
        saveDebounced(next.document, meta);
        return next;
      });
    },
    [caseStudyId, saveDebounced],
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
        if (caseStudyId) {
          writeWrapped(NS, caseStudyId, { document: w.document, meta });
        }
        return { document: w.document, meta };
      });
    },
    [caseStudyId],
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
    const onUnload = () => saveDebounced.flush();
    const onVis = () => {
      if (document.visibilityState === "hidden") {
        saveDebounced.flush();
      }
    };
    window.addEventListener("beforeunload", onUnload);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      document.removeEventListener("visibilitychange", onVis);
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
