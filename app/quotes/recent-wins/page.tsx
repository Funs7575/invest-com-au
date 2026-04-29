import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import Icon from "@/components/Icon";

export const revalidate = 600;

export const metadata: Metadata = {
  title: `Recent quote wins on Invest.com.au (${CURRENT_YEAR})`,
  description: `Anonymised feed of recently-accepted quote requests on Invest.com.au — see how the marketplace works in ${CURRENT_YEAR}.`,
  alternates: { canonical: `${SITE_URL}/quotes/recent-wins` },
};

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
    </>
  );
}
