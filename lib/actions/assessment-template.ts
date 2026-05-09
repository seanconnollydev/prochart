"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getBuiltinAssessmentTemplate } from "@/lib/assessments/builtin";
import {
  normalizeAssessmentTemplate,
  type AssessmentTemplate,
} from "@/lib/prototype-alpha/types/assessment-template";

export async function getPublishedAssessmentTemplate(
  id: string,
): Promise<AssessmentTemplate | null> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return null;
  }
  const { data, error } = await supabase
    .from("assessment_templates")
    .select("document")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) {
    return null;
  }
  return normalizeAssessmentTemplate(data.document);
}

/** Published template from Supabase, or bundled built-in template (e.g. H2T). */
export async function getAssessmentTemplateById(
  id: string,
): Promise<AssessmentTemplate | null> {
  const fromDb = await getPublishedAssessmentTemplate(id);
  if (fromDb) {
    return fromDb;
  }
  return getBuiltinAssessmentTemplate(id);
}
