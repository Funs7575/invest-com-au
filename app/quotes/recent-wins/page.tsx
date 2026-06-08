import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import Icon from "@/components/Icon";
import { faqJsonLd } from "@/lib/schema-markup";

export const revalidate = 600;

export const metadata: Metadata = {
  title: `Recent quote wins on Invest.com.au (${CURRENT_YEAR})`,
  description: `Anonymised feed of recently-accepted quote requests on Invest.com.au — see how the marketplace works in ${CURRENT_YEAR}.`,
  alternates: { canonical: `${SITE_URL}/quotes/recent-wins` },
};

const RECENT_WINS_FAQS = [
  {
    q: "How does the Invest.com.au quote marketplace work?",
    a: "The Invest.com.au quote marketplace lets consumers post a request for financial advice or a financial service — such as a financial planner, SMSF accountant, buyers agent, or mortgage broker. Qualified advisers in our network can then submit a quote for that job. The consumer reviews the quotes anonymously, selects the adviser they want to work with, and an introduction is made. Advisers pay a small fee only when a quote is accepted — consumers post and receive quotes for free.",
  },
  {
    q: "Are the recent wins shown on this page real jobs?",
    a: "Yes. The feed on this page shows anonymised records of jobs where a consumer accepted an adviser's quote in the last 60 days. Names, contact details, and specific job descriptions are redacted — only the adviser category, state/territory, budget band, and time-to-acceptance are shown. The data comes directly from our quote management system and is refreshed every 10 minutes. This page exists to show how the marketplace operates in practice, not to rank advisers.",
  },
  {
    q: "How long does it take to receive quotes after posting a job?",
    a: "Most jobs posted on the Invest.com.au marketplace receive their first quote within 2–24 hours during business hours (Monday–Friday, 8am–6pm AEST). The time-to-accept shown on this page reflects how long it took the consumer to choose a quote after the job was posted — not how long it took to receive the first response. Financial planning jobs tend to take longer to evaluate (1–5 days) while simpler requests (tax agents, mortgage brokers) are often accepted within a day.",
  },
  {
    q: "Who are the advisers in the Invest.com.au network?",
    a: "The Invest.com.au adviser network includes licensed financial planners (AFSL-authorised), registered tax agents (TPB-registered), licensed mortgage brokers (ACL/MFAA members), licensed buyers agents, property advisors, SMSF accountants, estate planners, aged care advisors, insurance brokers, and migration agents. All advisers who participate in the quote marketplace are verified against their relevant licence or registration before being permitted to submit quotes. Invest.com.au is not affiliated with any specific adviser and does not receive commissions from the advisers in our network.",
  },
];

const recentWinsFaqLd = faqJsonLd(RECENT_WINS_FAQS);

const TYPE_LABELS: Record<string, string> = {
  smsf_accountant: "SMSF Accountant",
  financial_planner: "Financial Planner",
  property_advisor: "Property Advisor",
  tax_agent: "Tax Agent",
  mortgage_broker: "Mortgage Broker",
  estate_planner: "Estate Planner",
  insurance_broker: "Insurance Broker",
  buyers_agent: "Buyers Agent",
  wealth_manager: "Wealth Manager",
  aged_care_advisor: "Aged Care Advisor",
  crypto_advisor: "Crypto Advisor",
  business_broker: "Business Broker",
  migration_agent: "Migration Agent",
};

interface AwardedJob {
  id: number;
  job_title: string;
  location: string | null;
  advisor_types: string[] | null;
  budget_band: string;
  updated_at: string;
  ends_at: string;
  created_at: string;
  winning_bid_id: number;
}

function timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const h = Math.floor(ms / 3600_000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function timeToAccept(created: string, awarded: string): string {
  const ms = new Date(awarded).getTime() - new Date(created).getTime();
  const h = Math.round(ms / 3600_000);
  if (h <= 1) return "within an hour";
  if (h < 24) return `in ${h}h`;
  const d = Math.round(h / 24);
  return `in ${d} day${d === 1 ? "" : "s"}`;
}

export default async function RecentWinsPage() {
  const supabase = await createClient();

  const sinceDate = new Date();
  sinceDate.setDate(sinceDate.getDate() - 60);
  const since = sinceDate.toISOString();

  const { data: jobsRaw } = await supabase
    .from("advisor_auctions")
    .select("id, job_title, location, advisor_types, budget_band, updated_at, ends_at, created_at, winning_bid_id")
    .eq("source", "public_job")
    .eq("is_public", true)
    .not("winning_bid_id", "is", null)
    .gte("updated_at", since)
    .order("updated_at", { ascending: false })
    .limit(40);

  const jobs = (jobsRaw ?? []) as AwardedJob[];

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Quotes", url: `${SITE_URL}/quotes` },
    { name: "Recent wins" },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      {recentWinsFaqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(recentWinsFaqLd) }}
        />
      )}

      <section className="bg-gradient-to-b from-slate-900 to-slate-800 text-white">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
            Live social proof
          </p>
          <h1 className="text-2xl sm:text-4xl font-extrabold mb-3">Recent wins on the marketplace</h1>
          <p className="text-slate-300 max-w-2xl text-sm sm:text-base leading-relaxed">
            Anonymised feed of jobs where consumers accepted a quote in the last 60 days. Names and details are
            redacted — only the job category, state, budget band, and time-to-accept are shown.
          </p>
          <div className="mt-5">
            <Link
              href="/quotes/post"
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl"
            >
              Post your own request
              <Icon name="arrow-right" size={14} />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-12">
        <div className="max-w-3xl mx-auto px-4">
          {jobs.length === 0 ? (
            <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center text-sm text-slate-500">
              No accepted quotes in the last 60 days yet — be the first.
            </div>
          ) : (
            <ol className="space-y-3">
              {jobs.map((j) => {
                const types = (j.advisor_types ?? []).slice(0, 2).map((t) => TYPE_LABELS[t] ?? t);
                return (
                  <li
                    key={j.id}
                    className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3"
                  >
                    <div className="w-8 h-8 bg-emerald-100 text-emerald-700 rounded-full shrink-0 flex items-center justify-center mt-0.5">
                      <Icon name="check" size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-900 line-clamp-1">
                        {types.join(" / ") || "Advisor"} job in {j.location ?? "AU"} —
                        accepted {timeToAccept(j.created_at, j.updated_at)}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {timeAgo(j.updated_at)} · Budget band: {j.budget_band.replace(/_/g, " ")}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-4 py-10 border-t border-slate-200">
        <h2 className="text-lg font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
        <div className="space-y-3">
          {RECENT_WINS_FAQS.map((faq) => (
            <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
              <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                {faq.q}
                <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>
    </>
  );
}
