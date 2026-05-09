"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { CaseStudyDocument } from "@/lib/prototype-alpha/types/case-study";

export async function getPublishedCaseStudy(
  id: string,
): Promise<CaseStudyDocument | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return null;
  }
  const { data, error } = await supabase
    .from("case_studies")
    .select("document")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) {
    return null;
  }
  return data.document as CaseStudyDocument;
}

export async function listPublishedCaseStudies(): Promise<
  Array<{
    id: string;
    title: string;
    updatedAt: string;
    status: string;
    tags: string[];
  }>
> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return [];
  }
  const { data, error } = await supabase
    .from("case_studies")
    .select("id, title, updated_at, status, tags")
    .eq("status", "published")
    .order("updated_at", { ascending: false });
  if (error || !data) {
    return [];
  }
  return data.map((r) => ({
    id: r.id,
    title: r.title,
    updatedAt: r.updated_at,
    status: r.status,
    tags: r.tags ?? [],
  }));
}
