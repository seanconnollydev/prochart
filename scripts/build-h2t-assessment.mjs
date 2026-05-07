/**
 * Reads the H2T workbook `data` sheet and emits lib/assessments/h2t-head-to-toe.generated.json
 * Run: node scripts/build-h2t-assessment.mjs
 */
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import XLSX from "xlsx";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const xlsxPath = join(
  repoRoot,
  "docs/H2T_Assessment_Workbook_5_14_2025 (2).xlsx",
);
const outDir = join(repoRoot, "lib/assessments");
const outPath = join(outDir, "h2t-head-to-toe.generated.json");

const TEMPLATE_ID = "h2t_head_to_toe_v1";
const SCHEMA_VERSION = "assessmentTemplate@0.2";

/** Body system flattened to a single root group + hierarchical gates (see NV/MSK plan). */
const NV_MSK_SYSTEM = "NeuroVascular/Musculoskeletal";
/** Concept row label for workbook section rollup (prompt / gate). */
const NV_MSK_ROLLUP_CONCEPT = "NeuroVascular/Musculoskeletal WDL";

function h16(parts) {
  return createHash("sha256").update(parts.join("\u0001")).digest("hex").slice(0, 16);
}

function grpRoot(bodySystem) {
  return `grp_${h16(["h2t", "root", bodySystem])}`;
}

function grpChild(bodySystem, bodySub) {
  return `grp_${h16(["h2t", "child", bodySystem, bodySub])}`;
}

function itemId(bodySystem, bodySub, tag) {
  return `itm_${h16(["h2t", "item", bodySystem, bodySub, tag])}`;
}

function choiceId(itemId_, label, idx) {
  return `ch_${h16(["h2t", "choice", itemId_, label, String(idx)])}`;
}

/** Matches workbook lines that carry the narrative after `WDL=` (same idea as flowsheet.ts). */
const WDL_EQUALS_PREFIX = /^\s*WDL\s*=\s*/i;

/**
 * @param {string[]} labels
 * @returns {{ wdl: string[], exc: string[] }}
 */
function partitionWdlChoices(labels) {
  const wdl = [];
  const exc = [];
  for (const label of labels) {
    if (WDL_EQUALS_PREFIX.test(label)) {
      wdl.push(label);
    } else {
      exc.push(label);
    }
  }
  return { wdl, exc };
}

/**
 * @param {string} label
 */
function narrativeAfterWdlEquals(label) {
  const t = label.trim();
  const match = t.match(WDL_EQUALS_PREFIX);
  if (match && match.index !== undefined) {
    return t.slice(match.index + match[0].length).trim();
  }
  return t;
}

/** Strip `WDL=` prefixes from workbook aggregate lines; join into side-panel narrative. */
function normalizeAggregateWdlNarrative(raw) {
  const parts = String(raw)
    .split(/\n\n/)
    .map((s) => narrativeAfterWdlEquals(s.trim()))
    .filter((s) => s.length > 0);
  return parts.join("\n\n");
}

/**
 * Label for the non-X gate `choice` (stored without `WDL=`; UI shows “WDL” only on the combobox).
 * @param {string[]} wdlLabels from partition
 * @param {string} firstPlainFallback first raw list cell when no `WDL=` line
 * @param {string} [aggregateNarrativeRaw] subsection aggregate when gate row has no WDL line
 */
function gateWdlChoiceLabel(wdlLabels, firstPlainFallback, aggregateNarrativeRaw) {
  const primary =
    wdlLabels[0] ?? (firstPlainFallback ? `WDL= ${firstPlainFallback}` : "");
  let body = narrativeAfterWdlEquals(primary);
  if (!body && aggregateNarrativeRaw) {
    const firstPara =
      String(aggregateNarrativeRaw).split(/\n\n/).find((line) => line.trim()) ?? "";
    body = narrativeAfterWdlEquals(firstPara.trim());
  }
  return body || "Within defined limits";
}

const LICENSE_NOTICE =
  "This document created by NKBDS H2T Task Force is licensed under the Creative Commons Attribution Non-Commercial Share Alike 4.0 International License in January, 2020. To view a summary of the license, go to https://creativecommons.org/licenses/by-nc-sa/4.0/legalcode";

const wb = XLSX.readFile(xlsxPath);
const sheetName = wb.SheetNames.includes("data") ? "data" : wb.SheetNames[2];
const ws = wb.Sheets[sheetName];
if (!ws) {
  throw new Error(`No sheet found (tried "data" and index): ${wb.SheetNames.join(", ")}`);
}

const matrix = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false });
if (matrix.length < 2) {
  throw new Error("Sheet has no data rows");
}

/** @type {Map<string, { choices: string[], order: number }>} */
const byConcept = new Map();
let orderSeq = 0;

for (let i = 1; i < matrix.length; i++) {
  const row = matrix[i];
  if (!Array.isArray(row)) {
    continue;
  }
  const bodySystem = String(row[0] ?? "").trim();
  const bodySub = String(row[1] ?? "").trim();
  const conceptRow = String(row[2] ?? "").trim();
  const listChoice = String(row[3] ?? "").trim();

  if (!bodySystem || !conceptRow) {
    continue;
  }
  const sub = bodySub || bodySystem;
  const key = `${bodySystem}\u0000${sub}\u0000${conceptRow}`;
  if (!byConcept.has(key)) {
    byConcept.set(key, { choices: [], order: orderSeq++ });
  }
  const entry = byConcept.get(key);
  if (listChoice && !entry.choices.includes(listChoice)) {
    entry.choices.push(listChoice);
  }
}

const sortedKeys = [...byConcept.keys()].sort(
  (a, b) => byConcept.get(a).order - byConcept.get(b).order,
);

/** @type {Set<string>} */
const systems = new Set();
/** @type {Set<string>} */
const pairs = new Set();

for (const key of sortedKeys) {
  const [bodySystem, sub] = key.split("\u0000");
  systems.add(bodySystem);
  pairs.add(`${bodySystem}\u0000${sub}`);
}

/** @type {Array<{ id: string; label: string; parentGroupId: string | null }>} */
const groups = [];

for (const sys of [...systems].sort()) {
  groups.push({
    id: grpRoot(sys),
    label: sys,
    parentGroupId: null,
  });
}

for (const pair of [...pairs].sort()) {
  const [bodySystem, bodySub] = pair.split("\u0000");
  if (bodySystem === NV_MSK_SYSTEM) {
    continue;
  }
  groups.push({
    id: grpChild(bodySystem, bodySub),
    label: bodySub,
    parentGroupId: grpRoot(bodySystem),
  });
}

/** @type {Map<string, { L: string[]; primaryConceptRow: string; head: string }>} */
const wdlClusterByPair = new Map();
for (const pair of pairs) {
  const [bodySystem, bodySub] = pair.split("\u0000");
  const L = [];
  for (const k of sortedKeys) {
    const p = k.split("\u0000");
    if (p[0] !== bodySystem || p[1] !== bodySub) {
      continue;
    }
    const { choices } = byConcept.get(k);
    const { wdl, exc } = partitionWdlChoices(choices);
    if (wdl.length === 1 && exc.length >= 1) {
      L.push(k);
    }
  }
  if (L.length === 0) {
    continue;
  }
  L.sort((a, b) => byConcept.get(a).order - byConcept.get(b).order);
  const preferredKey = `${bodySystem}\u0000${bodySub}\u0000${bodySub} WDL`;
  /** WDL+exception row: stem after stripping ` WDL` matches subsection. */
  const primaryWdlSubsectionInL = L.find((k) => {
    const cr = k.split("\u0000")[2];
    return cr.endsWith(" WDL") && cr.replace(/ WDL$/, "") === bodySub;
  });
  const primaryConceptRow = byConcept.has(preferredKey)
    ? `${bodySub} WDL`
    : primaryWdlSubsectionInL
      ? primaryWdlSubsectionInL.split("\u0000")[2]
      : L[0].split("\u0000")[2];
  const head =
    L.find((k) => k.split("\u0000")[2] === primaryConceptRow) ??
    sortedKeys.find((sk) => L.includes(sk)) ??
    L[0];
  wdlClusterByPair.set(pair, { L, primaryConceptRow, head });
}

/** Subsection-level `Sub WDL` workbook rows (strip === bodySub): narrative for rollup WDL panel. */
/** @type {Map<string, string>} */
const aggregateWdlNarrativeByPair = new Map();
for (const key of sortedKeys) {
  const [bodySystem, bodySub, conceptRow] = key.split("\u0000");
  if (!conceptRow.endsWith(" WDL")) {
    continue;
  }
  if (conceptRow.replace(/ WDL$/, "") !== bodySub) {
    continue;
  }
  const { choices } = byConcept.get(key);
  const parts = choices.map((c) => String(c).trim()).filter(Boolean);
  if (parts.length === 0) {
    continue;
  }
  aggregateWdlNarrativeByPair.set(
    `${bodySystem}\u0000${bodySub}`,
    normalizeAggregateWdlNarrative(parts.join("\n\n")),
  );
}

/**
 * Subsection rollup workbook row: concept ends with ` WDL` and stem matches `bodySub`.
 * @param {string} conceptRow
 * @param {string} bodySub
 */
function isSubsectionWdlAggregateConcept(conceptRow, bodySub) {
  return (
    conceptRow.endsWith(" WDL") &&
    conceptRow.replace(/ WDL$/, "") === bodySub
  );
}

/** Pairs where WDL narrative and exceptions are on separate rows (no same-row wdl+exc). */
for (const pair of pairs) {
  if (wdlClusterByPair.has(pair)) {
    continue;
  }
  const [bodySystem, bodySub] = pair.split("\u0000");
  /** @type {string[]} */
  const aggregateKeys = [];
  /** @type {string[]} */
  const exceptionOnlyKeys = [];
  for (const k of sortedKeys) {
    const p = k.split("\u0000");
    if (p[0] !== bodySystem || p[1] !== bodySub) {
      continue;
    }
    const conceptRow = p[2];
    const { choices } = byConcept.get(k);
    const { wdl, exc } = partitionWdlChoices(choices);
    if (
      isSubsectionWdlAggregateConcept(conceptRow, bodySub) &&
      exc.length === 0 &&
      wdl.length >= 1
    ) {
      aggregateKeys.push(k);
    } else if (
      wdl.length === 0 &&
      exc.length >= 1 &&
      !isSubsectionWdlAggregateConcept(conceptRow, bodySub)
    ) {
      exceptionOnlyKeys.push(k);
    }
  }
  if (aggregateKeys.length < 1 || exceptionOnlyKeys.length < 1) {
    continue;
  }
  aggregateKeys.sort((a, b) => byConcept.get(a).order - byConcept.get(b).order);
  exceptionOnlyKeys.sort(
    (a, b) => byConcept.get(a).order - byConcept.get(b).order,
  );
  const aggregateKey = aggregateKeys[0];
  const primaryConceptRow = aggregateKey.split("\u0000")[2];
  const L = [aggregateKey, ...exceptionOnlyKeys];
  const head = aggregateKey;
  wdlClusterByPair.set(pair, { L, primaryConceptRow, head });
}

/** @type {Set<string>} */
const keyEmitted = new Set();

/** @type {Array<Record<string, unknown>>} */
const items = [];

/**
 * WDL/exception cluster for one (body system, sub-system): one section gate + multiChoice per
 * wdl+exception concept (row may or may not end with " WDL").
 * @param {string} primaryConceptRow
 * @param {string[]} wdlLKeys  ordered keys, each `body\0sub\0concept` with wdl+exc partition
 */
function pushWdlCluster(bodySystem, bodySub, primaryConceptRow, wdlLKeys) {
  const gid = grpChild(bodySystem, bodySub);
  const kPreferred = `${bodySystem}\u0000${bodySub}\u0000${primaryConceptRow}`;
  const primaryKey =
    wdlLKeys.find((k) => k.split("\u0000")[2] === primaryConceptRow) ??
    (byConcept.has(kPreferred) ? kPreferred : wdlLKeys[0]);
  const rawChoices = byConcept.get(primaryKey).choices;
  const { wdl } = partitionWdlChoices(rawChoices);
  const firstPlain = String(rawChoices[0] ?? "").trim();
  const cr = primaryKey.split("\u0000")[2];
  const gateId = itemId(
    bodySystem,
    bodySub,
    `${cr}\0section_rollup`,
  );
  const pairKey = `${bodySystem}\u0000${bodySub}`;
  const aggregateNarrative = aggregateWdlNarrativeByPair.get(pairKey);
  const gateChoiceLabel = gateWdlChoiceLabel(wdl, firstPlain, aggregateNarrative);

  const gate = {
    id: gateId,
    groupId: gid,
    prompt: cr.endsWith(" WDL") ? cr : `${cr} WDL`,
    responseType: "choice",
    x_flowsheetSectionRollup: true,
    definedLimits: { type: "none" },
    choices: [
      {
        id: choiceId(gateId, gateChoiceLabel, 0),
        label: gateChoiceLabel,
      },
    ],
  };
  if (aggregateNarrative) {
    gate.x_flowsheetSectionAggregateWdlDefinition = aggregateNarrative;
  }
  items.push(gate);

  for (const k of wdlLKeys) {
    const conceptRow = k.split("\u0000")[2];
    if (
      conceptRow.endsWith(" WDL") &&
      conceptRow.replace(/ WDL$/, "") === bodySub
    ) {
      keyEmitted.add(k);
      continue;
    }
    const { choices: rawChoices } = byConcept.get(k);
    const { wdl, exc } = partitionWdlChoices(rawChoices);
    let wdlNarrative;
    if (wdl.length >= 1) {
      wdlNarrative = narrativeAfterWdlEquals(wdl[0]);
    } else {
      const agg = aggregateWdlNarrativeByPair.get(pairKey);
      if (!agg) {
        throw new Error(`Expected WDL= row or subsection aggregate for key ${k}`);
      }
      const firstAgg = agg.split(/\n\n/).find((line) => line.trim()) ?? "";
      wdlNarrative = narrativeAfterWdlEquals(firstAgg);
    }
    const mid = itemId(bodySystem, bodySub, `${conceptRow}\0exc_multi`);
    const choiceObjs = exc.map((label, idx) => ({
      id: choiceId(mid, label, idx),
      label,
    }));
    const prompt = conceptRow.replace(/ WDL$/, "");
    items.push({
      id: mid,
      groupId: gid,
      prompt,
      responseType: "multiChoice",
      definedLimits: { type: "none" },
      choices: choiceObjs,
      x_wdlListDefinition: wdlNarrative,
    });
    keyEmitted.add(k);
  }
}

const nvMskRollupPairKey = `${NV_MSK_SYSTEM}\u0000${NV_MSK_ROLLUP_CONCEPT}`;

/**
 * @param {string} conceptRow
 * @param {string} bodySub
 */
function nvMskIsSubsectionWdlAggregateRow(conceptRow, bodySub) {
  const cr = conceptRow.trim();
  if (!cr.endsWith(" WDL")) {
    return false;
  }
  return cr.replace(/ WDL$/, "") === bodySub;
}

/** Flat NV/MSK: one root group, section rollup → per extremity gates → detail `choice` rows. */
function pushNvMskBlock() {
  const gid = grpRoot(NV_MSK_SYSTEM);

  /** Prefer workbook rollup row keyed as (NV/MSK × NeuroVascular/Musculoskeletal WDL × …). */
  let rollupKey = sortedKeys.find((kk) => {
    const [bs, sub, cr] = kk.split("\u0000");
    return (
      `${bs}\u0000${sub}` === nvMskRollupPairKey &&
      cr.trim() === NV_MSK_ROLLUP_CONCEPT.trim()
    );
  });
  if (!rollupKey) {
    rollupKey = sortedKeys.find((kk) => {
      const [bs, , cr] = kk.split("\u0000");
      return bs === NV_MSK_SYSTEM && cr.trim() === NV_MSK_ROLLUP_CONCEPT.trim();
    });
  }

  /** @type {string[]} extremity subs in workbook order */
  const extremitySubs = [];
  /** @type {Set<string>} */
  const subsSeen = new Set();
  for (const kk of sortedKeys) {
    const [bs, sub] = kk.split("\u0000");
    if (bs !== NV_MSK_SYSTEM) {
      continue;
    }
    if (`${bs}\u0000${sub}` === nvMskRollupPairKey) {
      continue;
    }
    if (!subsSeen.has(sub)) {
      subsSeen.add(sub);
      extremitySubs.push(sub);
    }
  }

  if (!rollupKey) {
    throw new Error(
      `[h2t] Missing NeuroVascular/Musculoskeletal section rollup (${NV_MSK_ROLLUP_CONCEPT})`,
    );
  }

  {
    const [, rollupSub] = rollupKey.split("\u0000");
    const rawChoicesRollup = byConcept.get(rollupKey).choices;
    const gateId = itemId(
      NV_MSK_SYSTEM,
      rollupSub,
      `${NV_MSK_ROLLUP_CONCEPT}\0section_rollup`,
    );
    const primaryWdlFromPartition = partitionWdlChoices(rawChoicesRollup);
    const wdlRollup = primaryWdlFromPartition.wdl;
    const firstPlainRollup = String(rawChoicesRollup[0] ?? "").trim();
    const rollupPairKey = rollupKey.split("\u0000").slice(0, 2).join("\u0000");
    const narrative = aggregateWdlNarrativeByPair.get(rollupPairKey);
    const gateChoiceLabel = gateWdlChoiceLabel(
      wdlRollup,
      firstPlainRollup,
      narrative ?? rawChoicesRollup.join("\n\n"),
    );
    const gateCr = rollupKey.split("\u0000")[2].trimEnd();
    if (
      gateChoiceLabel === "Within defined limits" &&
      !narrative &&
      wdlRollup.length === 0 &&
      !firstPlainRollup
    ) {
      throw new Error(
        `[h2t] NeuroVascular/Musculoskeletal rollup row has empty WDL / list choices`,
      );
    }
    const gate = {
      id: gateId,
      groupId: gid,
      prompt: gateCr.endsWith(" WDL") ? gateCr : `${gateCr} WDL`,
      responseType: "choice",
      x_flowsheetSectionRollup: true,
      definedLimits: { type: "none" },
      choices: [{ id: choiceId(gateId, gateChoiceLabel, 0), label: gateChoiceLabel }],
    };
    if (narrative) {
      gate.x_flowsheetSectionAggregateWdlDefinition = narrative;
    } else if (primaryWdlFromPartition.exc.length >= 1) {
      gate.x_flowsheetSectionAggregateWdlDefinition =
        normalizeAggregateWdlNarrative(rawChoicesRollup.join("\n\n"));
    }
    items.push(gate);
    keyEmitted.add(rollupKey);
  }

  for (const sub of extremitySubs) {
    const extGatePrompt = `${sub} WDL`;
    const extGateId = itemId(NV_MSK_SYSTEM, sub, `${sub}\0nvmsk_extremity_gate`);
    const extPairKey = `${NV_MSK_SYSTEM}\u0000${sub}`;
    const extAgg = aggregateWdlNarrativeByPair.get(extPairKey) ?? "";
    const extGateChoiceLabel = gateWdlChoiceLabel([], "", extAgg);
    /** @type {Record<string, unknown>} */
    const extGate = {
      id: extGateId,
      groupId: gid,
      prompt: extGatePrompt,
      responseType: "choice",
      definedLimits: { type: "none" },
      choices: [
        {
          id: choiceId(extGateId, extGateChoiceLabel, 0),
          label: extGateChoiceLabel,
        },
      ],
    };
    if (extAgg) {
      extGate.x_wdlListDefinition = extAgg;
    }
    items.push(extGate);

    /** @type {string[]} keys for this extremity, sheet order */
    const subKeys = sortedKeys.filter((kk) => {
      const [bs, bodySub] = kk.split("\u0000");
      return bs === NV_MSK_SYSTEM && bodySub === sub;
    });

    for (const kk of subKeys) {
      if (keyEmitted.has(kk)) {
        continue;
      }
      const conceptRowRaw = kk.split("\u0000")[2];
      const conceptTrim = conceptRowRaw.trimEnd();
      const { choices: rawChoicesRaw } = byConcept.get(kk);
      const { wdl, exc } = partitionWdlChoices(rawChoicesRaw);

      if (
        nvMskIsSubsectionWdlAggregateRow(conceptTrim, sub) &&
        exc.length === 0 &&
        wdl.length >= 1
      ) {
        keyEmitted.add(kk);
        continue;
      }

      if (conceptTrim === NV_MSK_ROLLUP_CONCEPT.trim()) {
        keyEmitted.add(kk);
        continue;
      }

      const pairAggKey = `${NV_MSK_SYSTEM}\u0000${sub}`;
      const mid = itemId(NV_MSK_SYSTEM, sub, `${conceptRowRaw}\0exc_choice`);

      if (conceptTrim.endsWith(" WDL") && wdl.length === 0 && exc.length === 0) {
        keyEmitted.add(kk);
        continue;
      }

      if (wdl.length >= 1 && exc.length >= 1) {
        const choiceObjs = exc.map((label, idx) => ({
          id: choiceId(mid, label, idx),
          label,
        }));
        items.push({
          id: mid,
          groupId: gid,
          prompt: conceptTrim.replace(/ WDL$/, ""),
          responseType: "choice",
          definedLimits: { type: "none" },
          choices: choiceObjs,
          x_wdlListDefinition: narrativeAfterWdlEquals(wdl[0]),
        });
        keyEmitted.add(kk);
        continue;
      }

      if (wdl.length === 0 && exc.length >= 1) {
        const agg = aggregateWdlNarrativeByPair.get(pairAggKey);
        if (!agg) {
          throw new Error(
            `[h2t] NV/MSK exception-only row lacks subsection aggregate: ${kk}`,
          );
        }
        const firstAgg =
          agg
            .split(/\n\n/)
            .find((line) => String(line).trim() !== "") ?? "";
        const wdlListDef = narrativeAfterWdlEquals(firstAgg.trim());
        const choiceObjs = exc.map((label, idx) => ({
          id: choiceId(mid, label, idx),
          label,
        }));
        items.push({
          id: mid,
          groupId: gid,
          prompt: conceptTrim.replace(/ WDL$/, ""),
          responseType: "choice",
          definedLimits: { type: "none" },
          choices: choiceObjs,
          x_wdlListDefinition: wdlListDef,
        });
        keyEmitted.add(kk);
        continue;
      }

      if (conceptTrim.endsWith(" WDL")) {
        keyEmitted.add(kk);
        continue;
      }

      const iid = itemId(NV_MSK_SYSTEM, sub, conceptRowRaw);
      const choiceObjs = rawChoicesRaw.map((label, idx) => ({
        id: choiceId(iid, label, idx),
        label,
      }));
      items.push({
        id: iid,
        groupId: gid,
        prompt: conceptTrim,
        responseType: "choice",
        definedLimits: { type: "none" },
        choices: choiceObjs,
      });
      keyEmitted.add(kk);
    }
  }

  /** Mark rollup pair keys not matched above (sparse rows). */
  for (const kk of sortedKeys) {
    const [bs] = kk.split("\u0000");
    if (bs !== NV_MSK_SYSTEM) {
      continue;
    }
    if (!keyEmitted.has(kk)) {
      /** No choices or structural skip */
      keyEmitted.add(kk);
    }
  }
}

let nvmskBlockEmitted = false;

for (const key of sortedKeys) {
  const [bodySystemPre] = key.split("\u0000");
  if (bodySystemPre === NV_MSK_SYSTEM && !nvmskBlockEmitted) {
    pushNvMskBlock();
    nvmskBlockEmitted = true;
  }
  if (keyEmitted.has(key)) {
    continue;
  }
  const [bodySystem, bodySub, conceptRow] = key.split("\u0000");
  if (bodySystem === NV_MSK_SYSTEM) {
    continue;
  }
  const pair = `${bodySystem}\u0000${bodySub}`;
  const cl = wdlClusterByPair.get(pair);
  if (cl && cl.L.includes(key) && key !== cl.head) {
    continue;
  }
  if (cl && key === cl.head) {
    const [bs, su] = pair.split("\u0000");
    pushWdlCluster(bs, su, cl.primaryConceptRow, cl.L);
    continue;
  }

  const { choices } = byConcept.get(key);
  if (choices.length === 0) {
    continue;
  }
  const { wdl, exc } = partitionWdlChoices(choices);
  if (wdl.length === 1 && exc.length >= 1) {
    pushWdlCluster(bodySystem, bodySub, conceptRow, [key]);
    continue;
  }
  if (conceptRow.endsWith(" WDL")) {
    continue;
  }

  const iid = itemId(bodySystem, bodySub, conceptRow);
  const choiceObjs = choices.map((label, idx) => ({
    id: choiceId(iid, label, idx),
    label,
  }));
  items.push({
    id: iid,
    groupId: grpChild(bodySystem, bodySub),
    prompt: conceptRow,
    responseType: "choice",
    definedLimits: { type: "none" },
    choices: choiceObjs,
  });
  keyEmitted.add(key);
}

const now = new Date().toISOString();

const doc = {
  schemaVersion: SCHEMA_VERSION,
  id: TEMPLATE_ID,
  title: "Head-to-Toe Assessment (H2T)",
  description:
    "NKBDS H2T head-to-toe assessment workbook — grouped by body system and sub-system.",
  createdAt: now,
  updatedAt: now,
  status: "published",
  groups,
  items,
  x_presentation: { layout: "flowsheet" },
  x_licenseNotice: LICENSE_NOTICE,
  provenance: {
    authoredBy: { actorType: "repository", actorId: "h2t_workbook" },
  },
  x_extensions: {},
};

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
console.log(`Wrote ${items.length} items, ${groups.length} groups -> ${outPath}`);
