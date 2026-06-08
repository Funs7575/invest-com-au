import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import QuotesFilterClient from "./QuotesFilterClient";
import { faqJsonLd } from "@/lib/schema-markup";

export const revalidate = 60;

const QUOTES_FAQS = [
  {
    q: "What is the Advisor Marketplace and how does it work?",
    a: "The Advisor Marketplace is a live quote-request board where Australians who need financial, mortgage, tax, SMSF, or property advice post a brief, and verified advisers submit competitive quotes. The consumer reviews all quotes and picks the adviser they want to engage — there's no obligation to proceed with any quote. This reverse-marketplace model means advisers compete on price and fit, rather than the consumer calling around individually. Posting a request is free.",
  },
  {
    q: "Are the advisers who submit quotes verified?",
    a: "Yes. Only advisers with an approved profile on Invest.com.au can submit quotes. Profile approval requires: verification of AFSL or relevant professional registration (for tax agents, mortgage brokers, SMSF accountants), confirmation of business details, and acknowledgement of our professional conduct standards. Adviser licence numbers and registration status are displayed on their profile page. Invest.com.au does not verify the quality or suitability of any specific quote — that judgment is the consumer's to make.",
  },
  {
    q: "How do I post a quote request?",
    a: "Click 'Post a request' and describe what advice you need: your situation (briefly), the type of adviser you're looking for, your location or preference for online, and your approximate budget band. You don't need to share personal financial details at this stage — keep the brief high-level. Verified advisers in the relevant category will see your request and can submit a quote within 48 hours. You receive a notification for each quote and can compare them before deciding who to engage.",
  },
  {
    q: "Is the information in my quote request kept confidential?",
    a: "Public quote requests are visible to verified advisers on the platform but not to the general public. Your name and contact details are not shown on the public listing — advisers see only your request brief and budget band. When you accept a quote and engage an adviser, your contact details are shared with that adviser only. We do not sell your information to third parties. See our Privacy Policy (/privacy) for full details on how your data is handled.",
  },
];

const quotesFaqLd = faqJsonLd(QUOTES_FAQS);

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
      {quotesFaqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(quotesFaqLd) }}
        />
      )}
      <QuotesFilterClient initialJobs={jobs} />

      <div className="border-t border-slate-200 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-8 md:py-10">
          <h2 className="text-lg font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
          <div className="space-y-3">
            {QUOTES_FAQS.map((faq) => (
              <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                  {faq.q}
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform">▾</span>
                </summary>
                <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
