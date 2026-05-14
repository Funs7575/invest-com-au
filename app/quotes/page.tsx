import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import QuotesFilterClient from "./QuotesFilterClient";

export const revalidate = 60;

export const metadata: Metadata = {
  title: `Live Advisor Marketplace — Open Quote Requests (${CURRENT_YEAR})`,
  description:
    "Browse open quote requests from Australians who need financial, mortgage, tax, SMSF, or property advice. Verified advisors compete with quotes — the consumer picks. Free to post.",
  alternates: { canonical: `${SITE_URL}/quotes` },
};

export interface JobRow {
  id: number;
  slug: string;
  job_title: string;
  job_description: string;
  budget_band: string;
  advisor_types: string[] | null;
  location: string | null;
  status: string;
  ends_at: string;
  created_at: string;
  bid_count: number;
}

async function getOpenJobs(): Promise<JobRow[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("advisor_auctions")
    .select("id, slug, job_title, job_description, budget_band, advisor_types, location, status, ends_at, created_at")
    .eq("is_public", true)
    .eq("source", "public_job")
    .eq("flow_type", "auction")
    .eq("status", "open")
    .gt("ends_at", now)
    .order("created_at", { ascending: false })
    .limit(60);

  const jobs = (data || []) as Omit<JobRow, "bid_count">[];
  if (jobs.length === 0) return [];

  const ids = jobs.map((j) => j.id);
  const { data: bids } = await supabase
    .from("advisor_auction_bids")
    .select("auction_id")
    .in("auction_id", ids)
    .eq("status", "active");

  const bidCounts = ((bids || []) as { auction_id: number }[]).reduce<Record<number, number>>(
    (acc, row) => { acc[row.auction_id] = (acc[row.auction_id] || 0) + 1; return acc; },
    {}
  );

  return jobs.map((j) => ({ ...j, bid_count: bidCounts[j.id] || 0 }));
}

export default async function QuotesIndexPage() {
  const jobs = await getOpenJobs();
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Quotes" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <QuotesFilterClient initialJobs={jobs} />
    </>
  );
}
