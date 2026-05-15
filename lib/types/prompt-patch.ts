/** Patch operations for prompt-assisted authoring (subset of JSON Pointer paths). */
export type PatchOp = "replace" | "add";

export type FieldPatch = {
  op: PatchOp;
  /** JSON Pointer–style, e.g. /summary/hpi or /timeline/- */
  path: string;
  value: unknown;
};

export type PromptPatchEnvelope = {
  patches: FieldPatch[];
  provenance?: {
    tool?: string;
    promptSummary?: string;
    generatedAt?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};
