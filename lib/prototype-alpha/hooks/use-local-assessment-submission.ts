"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  debounce,
  defaultMeta,
  readSubmission,
  writeSubmission,
} from "../local-storage";
import {
  emptyAssessmentSubmission,
  type AssessmentSubmission,
} from "../types/assessment-submission";
import { newId, nowIso } from "../ids";

const STUDENT_KEY = "sim-ehr:student-actor-id";

function getStudentActorId(): string {
  if (typeof window === "undefined") {
    return "student_local_anon";
  }
  let id = localStorage.getItem(STUDENT_KEY);
  if (!id) {
    id = `student_local_${newId()}`;
    localStorage.setItem(STUDENT_KEY, id);
  }
  return id;
}

export function useLocalAssessmentSubmission(templateId: string | undefined) {
  const [wrapped, setWrapped] = useState<{
    document: AssessmentSubmission;
    meta: import("../types/local-meta").LocalDocumentMeta;
  } | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const saveDebounced = useMemo(
    () =>
      debounce(
        (
          doc: AssessmentSubmission,
          meta: import("../types/local-meta").LocalDocumentMeta,
        ) => {
          if (!templateId) {
            return;
          }
          writeSubmission(templateId, { document: doc, meta });
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
    queueMicrotask(() => {
      const existing = readSubmission<AssessmentSubmission>(templateId);
      if (existing) {
        let doc = existing.document;
        let meta = existing.meta;
        if (doc.status === "submitted") {
          const updatedAt = nowIso();
          doc = {
            ...doc,
            status: "in_progress",
            submittedAt: null,
            updatedAt,
          };
          meta = {
            ...meta,
            updatedAt,
            dirty: true,
            syncedBasisAt: null,
            syncError: null,
          };
          writeSubmission(templateId, { document: doc, meta });
        }
        setWrapped({ document: doc, meta });
      } else {
        const actorId = getStudentActorId();
        const doc = emptyAssessmentSubmission(
          `assessment_sub_${newId()}`,
          templateId,
          actorId,
        );
        const meta = defaultMeta(doc.updatedAt);
        setWrapped({ document: doc, meta });
        writeSubmission(templateId, { document: doc, meta });
      }
      setHydrated(true);
    });
    return () => {
      saveDebounced.flush();
    };
  }, [templateId, saveDebounced]);

  const setDocument = useCallback(
    (updater: (prev: AssessmentSubmission) => AssessmentSubmission) => {
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
        if (!w || !templateId) {
          return w;
        }
        const meta = {
          ...w.meta,
          dirty: false,
          lastSyncedAt,
          syncedBasisAt,
          syncError: null,
        };
        writeSubmission(templateId, { document: w.document, meta });
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
