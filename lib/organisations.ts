import { createClient } from "@/lib/supabase/server";

export interface PublicOrganisation {
  id: number;
  slug: string;
  name: string;
  organisation_type: string;
  logo_url: string | null;
  bio: string | null;
  location_state: string | null;
  cpd_provider_number: string | null;
  verification_status: string;
  website: string | null;
  email: string;
  course_count: number;
}

export const ORG_TYPE_LABELS: Record<string, string> = {
  training_provider: "Training Provider",
  cpd_provider: "CPD Provider",
  compliance: "Compliance",
  fintech: "Fintech",
  industry_body: "Industry Body",
  law_firm: "Law Firm",
  accounting_firm: "Accounting Firm",
  other: "Other",
};

export async function getVerifiedOrganisations(filters?: {
  type?: string;
  state?: string;
  cpd_only?: boolean;
}): Promise<PublicOrganisation[]> {
  const supabase = await createClient();
  let query = supabase
    .from("organisations")
    .select("id, slug, name, organisation_type, logo_url, bio, location_state, cpd_provider_number, verification_status, website, email")
    .eq("status", "active")
    .eq("verification_status", "verified")
    .order("name", { ascending: true });

  if (filters?.type) query = query.eq("organisation_type", filters.type);
  if (filters?.state) query = query.eq("location_state", filters.state);
  if (filters?.cpd_only) query = query.not("cpd_provider_number", "is", null);

  const { data } = await query;
  return (data ?? []).map((o) => ({ ...o, course_count: 0 }));
}

export async function getOrganisationBySlug(slug: string): Promise<PublicOrganisation | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organisations")
    .select("id, slug, name, organisation_type, logo_url, bio, location_state, cpd_provider_number, verification_status, website, email")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  if (!data) return null;
  return { ...data, course_count: 0 };
}

export async function getFeaturedOrganisations(): Promise<Pick<PublicOrganisation, "id" | "slug" | "name" | "logo_url">[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organisations")
    .select("id, slug, name, logo_url")
    .eq("status", "active")
    .eq("verification_status", "verified")
    .limit(6);
  return data ?? [];
}
