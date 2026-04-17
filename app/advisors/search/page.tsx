import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import AdvisorSearchClient from "./AdvisorSearchClient";

const log = logger("advisors-search");

export const metadata: Metadata = {
  title: "Advanced Advisor Search — Find Your Advisor",
  description:
    "Filter ASIC-registered Australian advisors by specialty, location, language, availability and international-client status. Independent matching from Invest.com.au.",
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
  accepts_international_clients: boolean | null;
  languages: string[] | null;
  response_time_hours: number | null;
  advisor_tier: string | null;
  intro_video_url: string | null;
  booking_link: string | null;
  featured_until: string | null;
  created_at: string;
}

/**
 * /advisors/search — Advanced advisor filter experience.
 *
 * Server-renders the initial dataset (every active advisor) and
 * hands it to the client component, which does filter + sort
 * entirely in the browser. Failure-tolerant: DB errors return an
 * empty list so the page still responds 200 with a "No advisors
 * available" state instead of 503.
 *
 * For a 10,000-advisor-scale future we'd move to server-side
 * filter — but for the current couple-hundred directory, client
 * filter wins on responsiveness.
 */
export default async function AdvisorSearchPage() {
  let advisors: AdvisorRow[] = [];
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("professionals")
      .select(
        "id, slug, name, firm_name, type, specialties, location_state, location_suburb, location_display, rating, review_count, fee_structure, fee_description, photo_url, verified, accepts_new_clients, accepts_international_clients, languages, response_time_hours, advisor_tier, intro_video_url, booking_link, featured_until, created_at",
      )
      .eq("status", "active")
      .order("rating", { ascending: false, nullsFirst: false })
      .limit(500);
    if (error) {
      log.warn("professionals fetch failed", { error: error.message });
    } else {
      advisors = (data as AdvisorRow[] | null) ?? [];
    }
  } catch (err) {
    log.error("professionals fetch threw", {
      err: err instanceof Error ? err.message : String(err),
    });
  }

  return <AdvisorSearchClient initialAdvisors={advisors} />;
}
