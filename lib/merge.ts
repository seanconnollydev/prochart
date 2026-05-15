/**
 * Deep merge: `patch` wins on conflicts; arrays are replaced (not concatenated)
 * unless caller handles separately. Unknown keys on `base` are preserved when
 * not overridden by `patch`.
 */
export function deepMerge<T extends Record<string, unknown>>(
  base: T,
  patch: Record<string, unknown>,
): T {
  const out = { ...base } as T;
  for (const key of Object.keys(patch)) {
    const pv = patch[key];
    const bv = (base as Record<string, unknown>)[key];
    if (
      pv !== null &&
      typeof pv === "object" &&
      !Array.isArray(pv) &&
      bv !== null &&
      typeof bv === "object" &&
      !Array.isArray(bv)
    ) {
      (out as Record<string, unknown>)[key] = deepMerge(
        bv as Record<string, unknown>,
        pv as Record<string, unknown>,
      );
    } else {
      (out as Record<string, unknown>)[key] = pv;
    }
  }
  return out;
}
