/**
 * Reads the H2T workbook `data` sheet and emits lib/assessments/adult-physical-assessment.generated.json
 * Run: node scripts/build-adult-physical-assessment.mjs
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
const outPath = join(outDir, "adult-physical-assessment.generated.json");

const TEMPLATE_ID = "adult_physical_assessment_v1";
const SCHEMA_VERSION = "assessmentTemplate@0.1";

/** Body system flattened to a single root group + hierarchical gates (see NV/MSK plan). */
const NV_MSK_SYSTEM = "NeuroVascular/Musculoskeletal";
/** Concept row label for workbook section rollup (prompt / gate). */
const NV_MSK_ROLLUP_CONCEPT = "NeuroVascular/Musculoskeletal WDL";

/** Clinical display order for root body systems (flowsheet rail + section sequence). */
const ROOT_SYSTEM_ORDER = [
  "Neuro",
  NV_MSK_SYSTEM,
  "HEENT",
  "Respiratory",
  "Cardiac",
  "GI",
  "Urinary Symptoms",
  "Skin",
  "Behavioral",
];

/**
 * @param {string} a
 * @param {string} b
 */
function compareByRootSystemOrder(a, b) {
  const ia = ROOT_SYSTEM_ORDER.indexOf(a);
  const ib = ROOT_SYSTEM_ORDER.indexOf(b);
  const ai = ia === -1 ? ROOT_SYSTEM_ORDER.length : ia;
  const bi = ib === -1 ? ROOT_SYSTEM_ORDER.length : ib;
  return ai - bi || a.localeCompare(b);
}

function h16(parts) {
  return createHash("sha256").update(parts.join("\u0001")).digest("hex").slice(0, 16);
}

function grpRoot(bodySystem) {
  return `grp_${h16(["adult_physical_assessment", "root", bodySystem])}`;
}

function grpChild(bodySystem, bodySub) {
  return `grp_${h16(["adult_physical_assessment", "child", bodySystem, bodySub])}`;
}

function itemId(bodySystem, bodySub, tag) {
  return `itm_${h16(["adult_physical_assessment", "item", bodySystem, bodySub, tag])}`;
}

function choiceId(itemId_, label, idx) {
  return `ch_${h16(["adult_physical_assessment", "choice", itemId_, label, String(idx)])}`;
}

/** Matches workbook lines that carry the narrative after `WDL=` (same idea as flowsheet.ts). */
const WDL_EQUALS_PREFIX = /^\s*WDL\s*=\s*/i;

/**
 * Normalize spacing on grading-style list labels from the workbook.
 * Prefer `+ N` (space after plus) and ` = ` (spaces around equals).
 * Insert a missing `=` after `+ N` when followed by description text
 * (e.g. `+ 1 Mild pitting…` → `+ 1 = Mild pitting…`).
 * Do not apply to raw cells that still contain a `WDL=` prefix.
 * @param {string} label
 */
function normalizeListChoiceLabel(label) {
  const t = String(label).trim();
  if (WDL_EQUALS_PREFIX.test(t)) {
    return t;
  }
  return t
    .replace(/\s*=\s*/g, " = ")
    .replace(/\+\s*(?=\d)/g, "+ ")
    .replace(/^(\+\s*\d+)\s+(?!=)/, "$1 = ");
}

/**
 * Sort key for grading-style choices: +N by grade, then 0=…, then other text.
 * @param {string} label
 * @returns {[number, number]}
 */
function listChoiceSortKey(label) {
  const t = normalizeListChoiceLabel(label);
  const plus = t.match(/^\+\s*(\d+)/);
  if (plus) {
    return [0, Number(plus[1])];
  }
  if (/^0(\s|=|$)/.test(t)) {
    return [1, 0];
  }
  return [2, 0];
}

/**
 * When 2+ labels are +N grades, sort by grade number (fixes workbook row-order
 * mistakes such as Radial Pulse R and edema +2 after +4). Stable for other text.
 * @param {string[]} labels
 */
function sortListChoiceLabels(labels) {
  const gradeCount = labels.filter((l) =>
    /^\+\s*\d/.test(normalizeListChoiceLabel(l)),
  ).length;
  if (gradeCount < 2) {
    return labels;
  }
  return [...labels].sort((a, b) => {
    const ka = listChoiceSortKey(a);
    const kb = listChoiceSortKey(b);
    return ka[0] - kb[0] || ka[1] - kb[1];
  });
}

/**
 * @param {string} itemId_
 * @param {string[]} labels
 */
function choiceObjsFromLabels(itemId_, labels) {
  return sortListChoiceLabels(labels).map((raw, idx) => {
    const label = normalizeListChoiceLabel(raw);
    return { id: choiceId(itemId_, label, idx), label };
  });
}

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
  const body =
    match && match.index !== undefined
      ? t.slice(match.index + match[0].length).trim()
      : t;
  return normalizeListChoiceLabel(body);
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

/**
 * Body sub-system sequence follows first appearance on the `data` sheet.
 * Concepts within each sub-system follow Pivot A–Z Concept Row order.
 * @type {Map<string, number>}
 */
const pairFirstOrder = new Map();
for (const key of byConcept.keys()) {
  const pair = key.split("\u0000").slice(0, 2).join("\u0000");
  const sheetOrder = byConcept.get(key).order;
  if (!pairFirstOrder.has(pair) || sheetOrder < pairFirstOrder.get(pair)) {
    pairFirstOrder.set(pair, sheetOrder);
  }
}

const sortedKeys = [...byConcept.keys()].sort((a, b) => {
  const [sysA, subA, conceptA] = a.split("\u0000");
  const [sysB, subB, conceptB] = b.split("\u0000");
  const sysCmp = compareByRootSystemOrder(sysA, sysB);
  if (sysCmp !== 0) {
    return sysCmp;
  }
  const pairCmp =
    (pairFirstOrder.get(`${sysA}\u0000${subA}`) ?? 0) -
    (pairFirstOrder.get(`${sysB}\u0000${subB}`) ?? 0);
  if (pairCmp !== 0) {
    return pairCmp;
  }
  return conceptA.localeCompare(conceptB);
});

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

/**
 * @param {string} a pair key `bodySystem\0bodySub`
 * @param {string} b
 */
function comparePairs(a, b) {
  const [sysA] = a.split("\u0000");
  const [sysB] = b.split("\u0000");
  const cmp = compareByRootSystemOrder(sysA, sysB);
  if (cmp !== 0) {
    return cmp;
  }
  return (pairFirstOrder.get(a) ?? 0) - (pairFirstOrder.get(b) ?? 0);
}

for (const sys of [...systems].sort(compareByRootSystemOrder)) {
  groups.push({
    id: grpRoot(sys),
    label: sys,
    parentGroupId: null,
  });
}

for (const pair of [...pairs].sort(comparePairs)) {
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
    const conceptRow = p[2];
    const { choices } = byConcept.get(k);
    const { wdl, exc } = partitionWdlChoices(choices);
    if (wdl.length === 1 && exc.length >= 1) {
      L.push(k);
    } else if (conceptRow.endsWith(" WDL") && wdl.length >= 1) {
      /** Composite section rollup row (WDL narrative only, no exception lines on same concept). */
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
  /** Prefer latest sheet-order `* WDL` row when subsection label differs (e.g. Behavioral × Behavior WDL). */
  const rollupWdlKeys = L.filter((kk) => kk.split("\u0000")[2].endsWith(" WDL"));
  const rollupPrimaryKey =
    rollupWdlKeys.length === 0
      ? null
      : rollupWdlKeys.reduce((a, b) =>
          byConcept.get(b).order > byConcept.get(a).order ? b : a,
        );
  const primaryConceptRow = byConcept.has(preferredKey)
    ? `${bodySub} WDL`
    : primaryWdlSubsectionInL
      ? primaryWdlSubsectionInL.split("\u0000")[2]
      : rollupPrimaryKey
        ? rollupPrimaryKey.split("\u0000")[2]
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
  const primaryWdlAggregateFallback =
    wdl.length > 0 ? normalizeAggregateWdlNarrative(wdl.join("\n\n")) : "";
  const gateChoiceLabel = gateWdlChoiceLabel(wdl, firstPlain, aggregateNarrative);

  const gate = {
    id: gateId,
    groupId: gid,
    prompt: cr.endsWith(" WDL") ? cr : `${cr} WDL`,
    responseType: "choice",
    flowsheetSectionRollup: true,
    choices: [
      {
        id: choiceId(gateId, gateChoiceLabel, 0),
        label: gateChoiceLabel,
      },
    ],
  };
  if (aggregateNarrative) {
    gate.flowsheetSectionAggregateWdlDefinition = aggregateNarrative;
  } else if (primaryWdlAggregateFallback) {
    gate.flowsheetSectionAggregateWdlDefinition = primaryWdlAggregateFallback;
  }
  items.push(gate);

  for (const k of wdlLKeys) {
    const conceptRow = k.split("\u0000")[2];
    if (
      conceptRow.endsWith(" WDL") &&
      (conceptRow.replace(/ WDL$/, "") === bodySub ||
        conceptRow === primaryConceptRow)
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
    const choiceObjs = choiceObjsFromLabels(mid, exc);
    const prompt = conceptRow.replace(/ WDL$/, "");
    items.push({
      id: mid,
      groupId: gid,
      prompt,
      responseType: "multiChoice",
      choices: choiceObjs,
      wdlListDefinition: wdlNarrative,
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
      `[adult-physical-assessment] Missing NeuroVascular/Musculoskeletal section rollup (${NV_MSK_ROLLUP_CONCEPT})`,
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
        `[adult-physical-assessment] NeuroVascular/Musculoskeletal rollup row has empty WDL / list choices`,
      );
    }
    const gate = {
      id: gateId,
      groupId: gid,
      prompt: gateCr.endsWith(" WDL") ? gateCr : `${gateCr} WDL`,
      responseType: "choice",
      flowsheetSectionRollup: true,
      choices: [{ id: choiceId(gateId, gateChoiceLabel, 0), label: gateChoiceLabel }],
    };
    if (narrative) {
      gate.flowsheetSectionAggregateWdlDefinition = narrative;
    } else if (primaryWdlFromPartition.exc.length >= 1) {
      gate.flowsheetSectionAggregateWdlDefinition =
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
      choices: [
        {
          id: choiceId(extGateId, extGateChoiceLabel, 0),
          label: extGateChoiceLabel,
        },
      ],
    };
    if (extAgg) {
      extGate.wdlListDefinition = extAgg;
    }
    items.push(extGate);

    /** @type {string[]} keys for this extremity, A–Z Concept Row within sub */
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
        const choiceObjs = choiceObjsFromLabels(mid, exc);
        items.push({
          id: mid,
          groupId: gid,
          prompt: conceptTrim.replace(/ WDL$/, ""),
          responseType: "choice",
          choices: choiceObjs,
          wdlListDefinition: narrativeAfterWdlEquals(wdl[0]),
        });
        keyEmitted.add(kk);
        continue;
      }

      if (wdl.length === 0 && exc.length >= 1) {
        const agg = aggregateWdlNarrativeByPair.get(pairAggKey);
        if (!agg) {
          throw new Error(
            `[adult-physical-assessment] NV/MSK exception-only row lacks subsection aggregate: ${kk}`,
          );
        }
        const firstAgg =
          agg
            .split(/\n\n/)
            .find((line) => String(line).trim() !== "") ?? "";
        const wdlListDef = narrativeAfterWdlEquals(firstAgg.trim());
        const choiceObjs = choiceObjsFromLabels(mid, exc);
        items.push({
          id: mid,
          groupId: gid,
          prompt: conceptTrim.replace(/ WDL$/, ""),
          responseType: "choice",
          choices: choiceObjs,
          wdlListDefinition: wdlListDef,
        });
        keyEmitted.add(kk);
        continue;
      }

      if (conceptTrim.endsWith(" WDL")) {
        keyEmitted.add(kk);
        continue;
      }

      const iid = itemId(NV_MSK_SYSTEM, sub, conceptRowRaw);
      const choiceObjs = choiceObjsFromLabels(iid, rawChoicesRaw);
      items.push({
        id: iid,
        groupId: gid,
        prompt: conceptTrim,
        responseType: "choice",
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

/**
 * Emit all items for one non-NV/MSK body system in workbook row order.
 * @param {string} bodySystem
 */
function pushItemsForSystem(bodySystem) {
  for (const key of sortedKeys) {
    const [bs] = key.split("\u0000");
    if (bs !== bodySystem) {
      continue;
    }
    if (keyEmitted.has(key)) {
      continue;
    }
    const [, bodySub, conceptRow] = key.split("\u0000");
    const pair = `${bodySystem}\u0000${bodySub}`;
    const cl = wdlClusterByPair.get(pair);
    if (cl && cl.L.includes(key) && key !== cl.head) {
      continue;
    }
    if (cl && key === cl.head) {
      const [pairBs, su] = pair.split("\u0000");
      pushWdlCluster(pairBs, su, cl.primaryConceptRow, cl.L);
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
    const choiceObjs = choiceObjsFromLabels(iid, choices);
    items.push({
      id: iid,
      groupId: grpChild(bodySystem, bodySub),
      prompt: conceptRow,
      responseType: "choice",
      choices: choiceObjs,
    });
    keyEmitted.add(key);
  }
}

const SKIN_SYSTEM = "Skin";

/**
 * Skin: section rollup + one locationScoped composite (locations first, then
 * Integrity / Symptom / Color / Temp per selected site).
 */
function pushSkinBlock() {
  const bodySystem = SKIN_SYSTEM;
  const bodySub = SKIN_SYSTEM;
  const pair = `${bodySystem}\u0000${bodySub}`;
  const gid = grpChild(bodySystem, bodySub);

  /** @type {Map<string, string>} conceptRow -> key */
  const keyByConcept = new Map();
  for (const k of sortedKeys) {
    const [bs, sub, cr] = k.split("\u0000");
    if (bs !== bodySystem || sub !== bodySub) {
      continue;
    }
    keyByConcept.set(cr, k);
  }

  const wdlKey = keyByConcept.get("Skin WDL");
  if (!wdlKey) {
    throw new Error("[adult-physical-assessment] Missing Skin WDL concept row");
  }
  const locationsKey = keyByConcept.get("Locations");
  if (!locationsKey) {
    throw new Error("[adult-physical-assessment] Missing Skin Locations concept row");
  }

  const fieldSpecs = [
    {
      key: "integrity",
      conceptRow: "Skin Integrity Exceptions (Minor findings when LDA not needed)",
    },
    { key: "symptom", conceptRow: "Skin Symptom" },
    { key: "color", conceptRow: "General Skin Color" },
    { key: "temp", conceptRow: "Skin Temp" },
  ];

  for (const spec of fieldSpecs) {
    if (!keyByConcept.has(spec.conceptRow)) {
      throw new Error(
        `[adult-physical-assessment] Missing Skin concept row: ${spec.conceptRow}`,
      );
    }
  }

  const rawWdlChoices = byConcept.get(wdlKey).choices;
  const { wdl } = partitionWdlChoices(rawWdlChoices);
  const firstPlain = String(rawWdlChoices[0] ?? "").trim();
  const aggregateNarrative = aggregateWdlNarrativeByPair.get(pair);
  const primaryWdlAggregateFallback =
    wdl.length > 0 ? normalizeAggregateWdlNarrative(wdl.join("\n\n")) : "";
  const gateChoiceLabel = gateWdlChoiceLabel(
    wdl,
    firstPlain,
    aggregateNarrative,
  );
  const gateId = itemId(bodySystem, bodySub, "Skin WDL\0section_rollup");
  const gate = {
    id: gateId,
    groupId: gid,
    prompt: "Skin WDL",
    responseType: "choice",
    flowsheetSectionRollup: true,
    choices: [
      {
        id: choiceId(gateId, gateChoiceLabel, 0),
        label: gateChoiceLabel,
      },
    ],
  };
  if (aggregateNarrative) {
    gate.flowsheetSectionAggregateWdlDefinition = aggregateNarrative;
  } else if (primaryWdlAggregateFallback) {
    gate.flowsheetSectionAggregateWdlDefinition = primaryWdlAggregateFallback;
  }
  items.push(gate);
  keyEmitted.add(wdlKey);

  const compositeId = itemId(bodySystem, bodySub, "location_scoped");
  const locationLabels = partitionWdlChoices(
    byConcept.get(locationsKey).choices,
  ).exc;
  const locationChoices = choiceObjsFromLabels(compositeId, locationLabels);

  /** @type {Array<Record<string, unknown>>} */
  const locationScopedFields = [];
  for (const spec of fieldSpecs) {
    const fk = keyByConcept.get(spec.conceptRow);
    const { choices: rawChoices } = byConcept.get(fk);
    const { wdl: fieldWdl, exc } = partitionWdlChoices(rawChoices);
    const fieldItemId = itemId(
      bodySystem,
      bodySub,
      `location_scoped\0${spec.key}`,
    );
    /** @type {Record<string, unknown>} */
    const field = {
      key: spec.key,
      prompt: spec.conceptRow,
      choices: choiceObjsFromLabels(fieldItemId, exc),
    };
    if (fieldWdl.length >= 1) {
      field.wdlListDefinition = narrativeAfterWdlEquals(fieldWdl[0]);
    }
    locationScopedFields.push(field);
    keyEmitted.add(fk);
  }
  keyEmitted.add(locationsKey);

  items.push({
    id: compositeId,
    groupId: gid,
    prompt: "Skin findings by location",
    responseType: "locationScoped",
    locationChoices,
    locationScopedFields,
  });

  for (const k of sortedKeys) {
    const [bs, sub] = k.split("\u0000");
    if (bs === bodySystem && sub === bodySub && !keyEmitted.has(k)) {
      keyEmitted.add(k);
    }
  }
}

for (const sys of ROOT_SYSTEM_ORDER) {
  if (sys === NV_MSK_SYSTEM) {
    pushNvMskBlock();
  } else if (sys === SKIN_SYSTEM) {
    pushSkinBlock();
  } else if (systems.has(sys)) {
    pushItemsForSystem(sys);
  }
}

const now = new Date().toISOString();

const doc = {
  schemaVersion: SCHEMA_VERSION,
  id: TEMPLATE_ID,
  title: "Adult Physical Assessment",
  description:
    "Adult physical assessment — grouped by body system and sub-system.",
  createdAt: now,
  updatedAt: now,
  status: "published",
  groups,
  items,
  presentation: { layout: "flowsheet" },
  licenseNotice: LICENSE_NOTICE,
};

mkdirSync(outDir, { recursive: true });
writeFileSync(outPath, `${JSON.stringify(doc, null, 2)}\n`, "utf8");
console.log(`Wrote ${items.length} items, ${groups.length} groups -> ${outPath}`);
