import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import Icon from "@/components/Icon";
import { QUOTE_ADVISOR_TYPES, QUOTE_AU_STATES } from "@/lib/api-schemas";

export const revalidate = 3600;

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

interface PageProps {
  params: Promise<{ type: string; state: string }>;
}

function isValidType(t: string): t is (typeof QUOTE_ADVISOR_TYPES)[number] {
  return (QUOTE_ADVISOR_TYPES as readonly string[]).includes(t);
}
function isValidState(s: string): s is (typeof QUOTE_AU_STATES)[number] {
  return (QUOTE_AU_STATES as readonly string[]).includes(s);
}

export async function generateStaticParams() {
  const all: { type: string; state: string }[] = [];
  for (const t of QUOTE_ADVISOR_TYPES) {
    for (const s of QUOTE_AU_STATES) {
      all.push({ type: t, state: s.toLowerCase() });
    }
  }
  return all;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { type, state } = await params;
  const typeKey = type.toLowerCase();
  const stateKey = state.toUpperCase();
  if (!isValidType(typeKey) || !isValidState(stateKey)) return {};

  const label = TYPE_LABELS[typeKey] ?? typeKey;
  return {
    title: `${label} Quotes in ${stateKey} (${CURRENT_YEAR}) — Invest.com.au`,
    description: `Compare ${label} quotes from verified Australian advisors in ${stateKey}. Free quote requests, no obligation. ${CURRENT_YEAR} pricing.`,
    alternates: { canonical: `${SITE_URL}/quotes/by/${typeKey}/${stateKey.toLowerCase()}` },
  };
}

interface JobRow {
  id: number;
  slug: string;
  job_title: string;
  job_description: string;
  budget_band: string;
  ends_at: string;
}

interface AdvisorRow {
  id: number;
  slug: string;
  name: string;
  firm_name: string | null;
  rating: number | null;
  review_count: number | null;
  photo_url: string | null;
  location_display: string | null;
}

export default async function QuotesByTypeStatePage({ params }: PageProps) {
  const { type: rawType, state: rawState } = await params;
  const type = rawType.toLowerCase();
  const state = rawState.toUpperCase();
  if (!isValidType(type) || !isValidState(state)) notFound();

  const label = TYPE_LABELS[type] ?? type;

  const supabase = await createClient();

  const now = new Date().toISOString();
  const { data: jobsRaw } = await supabase
    .from("advisor_auctions")
    .select("id, slug, job_title, job_description, budget_band, ends_at")
    .eq("source", "public_job")
    .eq("is_public", true)
    .eq("status", "open")
    .eq("location", state)
    .contains("advisor_types", [type])
    .gt("ends_at", now)
    .order("created_at", { ascending: false })
    .limit(20);

  const jobs = (jobsRaw ?? []) as JobRow[];

  const { data: advisorsRaw } = await supabase
    .from("professionals")
    .select("id, slug, name, firm_name, rating, review_count, photo_url, location_display")
    .eq("type", type)
    .eq("status", "active")
    .eq("verified", true)
    .neq("accepts_new_clients", false)
    .order("rating", { ascending: false, nullsFirst: false })
    .order("review_count", { ascending: false, nullsFirst: false })
    .limit(8);

  const advisors = (advisorsRaw ?? []) as AdvisorRow[];

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Quotes", url: `${SITE_URL}/quotes` },
    { name: `${label} in ${state}` },
  ]);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />

      <section className="bg-gradient-to-b from-slate-900 to-slate-800 text-white">
        <div className="max-w-5xl mx-auto px-4 py-12">
          <div className="text-xs text-slate-400 mb-3">
            <Link href="/quotes" className="hover:text-white">Quotes</Link>
            <span className="mx-2">·</span>
            {state}
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold mb-3 max-w-3xl">
            {label} quotes in {state} ({CURRENT_YEAR})
          </h1>
          <p className="text-slate-300 max-w-2xl text-sm sm:text-base leading-relaxed">
            Compare quotes from verified {label.toLowerCase()}s servicing {state}. Post your request in 2 minutes
            and let advisors come to you — free, no obligation.
          </p>
          <div className="mt-5">
            <Link
              href={`/quotes/post?type=${type}&state=${state}`}
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl"
            >
              Get a {label} quote
              <Icon name="arrow-right" size={14} />
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-slate-50 py-12">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 mb-3">
                Open {label.toLowerCase()} requests in {state}
              </h2>
              {jobs.length === 0 ? (
                <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-8 text-center text-sm text-slate-500">
                  No open requests right now — yours could be the first.
                </div>
              ) : (
                <div className="space-y-3">
                  {jobs.map((j) => (
                    <Link
                      key={j.id}
                      href={`/quotes/${j.slug}`}
                      className="block bg-white border border-slate-200 hover:border-amber-300 hover:shadow-sm rounded-xl p-4 transition"
                    >
                      <p className="font-bold text-slate-900 text-sm mb-1 line-clamp-1">{j.job_title}</p>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{j.job_description}</p>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-3">
            <h2 className="text-base font-bold text-slate-900 mb-2">
              Top-rated {label.toLowerCase()}s in {state}
            </h2>
            {advisors.length === 0 ? (
              <p className="text-sm text-slate-500">Directory is being populated.</p>
            ) : (
              advisors.slice(0, 5).map((a) => (
                <Link
                  key={a.id}
                  href={`/advisor/${a.slug}`}
                  className="flex items-center gap-3 bg-white border border-slate-200 hover:border-amber-300 rounded-xl p-3"
                >
                  {a.photo_url ? (
                    <Image src={a.photo_url} alt={a.name} width={40} height={40} className="rounded-full object-cover border border-slate-200" />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                      <Icon name="user" size={16} className="text-slate-400" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm truncate">{a.name}</p>
                    {a.firm_name && <p className="text-xs text-slate-500 truncate">{a.firm_name}</p>}
                    {(a.review_count ?? 0) > 0 && (
                      <p className="text-xs text-slate-700 mt-0.5 flex items-center gap-1">
                        <Icon name="star" size={11} className="text-amber-500" />
                        {a.rating?.toFixed(1)} ({a.review_count})
                      </p>
                    )}
                  </div>
                </Link>
              ))
            )}
          </aside>
        </div>
      </section>
    </>
  );
}
