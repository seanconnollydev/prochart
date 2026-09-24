"use client";

import { useEffect, useState } from "react";

/** Subscribes to a CSS media query. Returns `false` until mounted (SSR-safe). */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const onChange = () => setMatches(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}

/** True when viewport is at least Tailwind `md` (768px). */
export function useIsMdUp(): boolean {
  return useMediaQuery("(min-width: 768px)");
}
