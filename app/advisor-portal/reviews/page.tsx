import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
// eslint-disable-next-line no-restricted-imports -- portal page: professional lookup by email (cross-user, no auth.uid() linkage) + full-status review fetch (policy only exposes approved rows to anon). Both patterns are admin-client legitimate per CLAUDE.md.
import { createAdminClient } from "@/lib/supabase/admin";
import AdvisorReviewsClient from "./AdvisorReviewsClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "My Reviews — Advisor Portal",
  robots: "noindex, nofollow",
};

export type ReviewWithResponse = {
  id: number;
  reviewer_name: string;
  rating: number;
  title: string | null;
  body: string;
  status: string;
  created_at: string;
  is_verified_client: boolean | null;
  advisor_response: {
    id: number;
    body: string;
    created_at: string;
    updated_at: string;
  } | null;
};

export default async function AdvisorPortalReviewsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/advisor-portal?next=/advisor-portal/reviews");
  }

  const admin = createAdminClient();
  const { data: pro } = await admin
    .from("professionals")
    .select("id, name")
    .eq("email", user.email)
    .in("status", ["active", "pending"])
    .maybeSingle();

  if (!pro) {
    redirect("/advisor-portal?next=/advisor-portal/reviews");
  }

  const { data: rawReviews } = await admin
    .from("professional_reviews")
    .select(
      "id, reviewer_name, rating, title, body, status, created_at, is_verified_client, professional_review_responses(id, body, created_at, updated_at)",
    )
    .eq("professional_id", pro.id)
    .in("status", ["approved", "pending"])
    .order("created_at", { ascending: false })
    .limit(50);

  type RawReview = {
    id: number;
    reviewer_name: string;
    rating: number;
    title: string | null;
    body: string;
    status: string;
    created_at: string;
    is_verified_client: boolean | null;
    professional_review_responses: { id: number; body: string; created_at: string; updated_at: string }[];
  };
  const reviews: ReviewWithResponse[] = ((rawReviews ?? []) as unknown as RawReview[]).map((r) => ({
    id: r.id,
    reviewer_name: r.reviewer_name,
    rating: r.rating,
    title: r.title,
    body: r.body,
    status: r.status,
    created_at: r.created_at,
    is_verified_client: r.is_verified_client,
    advisor_response: r.professional_review_responses[0] ?? null,
  }));

  return (
    <AdvisorReviewsClient
      advisorName={pro.name as string}
      reviews={reviews}
    />
  );
}
