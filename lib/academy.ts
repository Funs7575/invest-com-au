import { createClient } from "@/lib/supabase/server";
import { createStaticClient } from "@/lib/supabase/static";

export interface AcademyCourse {
  id: number;
  slug: string;
  title: string;
  description: string | null;
  cover_image_url: string | null;
  price_cents: number;
  status: string;
  creator_kind: "organisation" | "advisor";
  organisation_id: number | null;
  professional_id: number | null;
  avg_rating: number | null;
  review_count: number;
  cpd_hours: number | null;
  created_at: string;
  organisation: {
    slug: string;
    name: string;
    logo_url: string | null;
  } | null;
  professional: {
    slug: string;
    name: string;
    photo_url: string | null;
  } | null;
}

export async function getAcademyCourses(): Promise<AcademyCourse[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select(
      "id, slug, title, description, cover_image_url, price_cents, status, creator_kind, organisation_id, professional_id, avg_rating, review_count, cpd_hours, created_at, organisation:organisations(slug, name, logo_url), professional:professionals(slug, name, photo_url)"
    )
    .eq("status", "published")
    .order("avg_rating", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  return (data as unknown as AcademyCourse[]) ?? [];
}

export async function getAcademyCourse(slug: string): Promise<AcademyCourse | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("courses")
    .select(
      "id, slug, title, description, cover_image_url, price_cents, status, creator_kind, organisation_id, professional_id, avg_rating, review_count, cpd_hours, created_at, organisation:organisations(slug, name, logo_url), professional:professionals(slug, name, photo_url)"
    )
    .eq("slug", slug)
    .maybeSingle();
  return (data as AcademyCourse | null) ?? null;
}

export async function getTopAcademyCourseSlugs(): Promise<string[]> {
  // generateStaticParams runs at build time with no HTTP request context, so
  // cookies() is unavailable. Use the static (anon-key, cookie-free) client.
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return [];
  }
  const supabase = createStaticClient();
  const { data } = await supabase
    .from("courses")
    .select("slug")
    .eq("status", "published")
    .order("avg_rating", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(20);
  return (data ?? []).map((r: { slug: string }) => r.slug);
}

export function creatorName(course: AcademyCourse): string {
  if (course.creator_kind === "organisation" && course.organisation) {
    return course.organisation.name;
  }
  if (course.creator_kind === "advisor" && course.professional) {
    return course.professional.name;
  }
  return "Unknown";
}

export function creatorSlug(course: AcademyCourse): string | null {
  if (course.creator_kind === "organisation" && course.organisation) {
    return `/providers/${course.organisation.slug}`;
  }
  if (course.creator_kind === "advisor" && course.professional) {
    return `/advisor/${course.professional.slug}`;
  }
  return null;
}

export function creatorLogoUrl(course: AcademyCourse): string | null {
  if (course.creator_kind === "organisation" && course.organisation) {
    return course.organisation.logo_url;
  }
  if (course.creator_kind === "advisor" && course.professional) {
    return course.professional.photo_url;
  }
  return null;
}
