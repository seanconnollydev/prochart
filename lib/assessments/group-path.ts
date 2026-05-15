import type { AssessmentGroup } from "@/lib/types/assessment-template";

/**
 * Labels from root → leaf for a group's ancestry.
 * Consecutive duplicate labels are collapsed so display strings stay readable when a nested group
 * reuses its parent's name (semantic hierarchy is unchanged).
 */
export function groupPathLabels(
  groups: AssessmentGroup[],
  groupId: string | undefined,
): string[] {
  if (!groupId) {
    return [];
  }
  const byId = new Map(groups.map((g) => [g.id, g] as const));
  const path: string[] = [];
  let gid: string | null | undefined = groupId;
  while (gid) {
    const g: AssessmentGroup | undefined = byId.get(gid);
    if (!g) {
      break;
    }
    path.push(g.label);
    gid = g.parentGroupId ?? null;
  }
  return collapseConsecutiveEqual(path.reverse());
}

function collapseConsecutiveEqual(labels: string[]): string[] {
  const out: string[] = [];
  for (const label of labels) {
    if (out.length === 0 || out[out.length - 1] !== label) {
      out.push(label);
    }
  }
  return out;
}
