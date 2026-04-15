import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import AdvisorSearchClient from "./AdvisorSearchClient";

export const metadata: Metadata = {
  title: "Find an Advisor — Advanced Search",
  description:
    "Filter ASIC-registered advisors by specialty, location, fee structure and accepting-new-clients status. Independent matching from Invest.com.au.",
  alternates: { canonical: "/advisors/search" },
};

export const dynamic = "force-dynamic";

interface AdvisorRow {
  id: number;
  slug: string;
  name: string;
  firm_name: string | null;
  type: string;
  specialties: string[] | null;
  location_state: string | null;
  location_suburb: string | null;
  location_display: string | null;
  rating: number | null;
  review_count: number | null;
  fee_structure: string | null;
  fee_description: string | null;
  photo_url: string | null;
  verified: boolean | null;
  accepts_new_clients: boolean | null;
  response_time_hours: number | null;
  advisor_tier: string | null;
  intro_video_url: string | null;
  booking_link: string | null;
}

/**
 * /advisors/search — Wave 17 filtered advisor search.
 *
 * Server-renders the initial dataset (every active advisor) and
 * hands it to the client component, which does filter + sort
 * entirely in the browser. This keeps the UX snappy without
 * needing an API round-trip on every filter tweak.
 *
 * For a 10,000-advisor-scale future we'd move to server-side
 * filter — but for the current couple-hundred directory, client
 * filter wins on responsiveness.
 */
export default async function AdvisorSearchPage() {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("professionals")
    .select(
      "id, slug, name, firm_name, type, specialties, location_state, location_suburb, location_display, rating, review_count, fee_structure, fee_description, photo_url, verified, accepts_new_clients, response_time_hours, advisor_tier, intro_video_url, booking_link",
    )
    .eq("status", "active")
    .order("rating", { ascending: false, nullsFirst: false })
    .limit(500);

  const advisors = (data as AdvisorRow[] | null) || [];

  return <AdvisorSearchClient initialAdvisors={advisors} />;
}
