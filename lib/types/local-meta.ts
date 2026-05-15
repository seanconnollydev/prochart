/** Wrapped local persistence record for any document type. */
export type LocalDocumentMeta = {
  updatedAt: string;
  dirty: boolean;
  lastSyncedAt: string | null;
  /** Last known server `document.updatedAt` after a successful publish (for conflicts). */
  syncedBasisAt: string | null;
  syncError: string | null;
};

export type LocalWrapped<T> = {
  document: T;
  meta: LocalDocumentMeta;
};
