import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import Icon from "@/components/Icon";
import CountdownBadge from "./CountdownBadge";

export const revalidate = 60;

export const metadata: Metadata = {
  title: `Live Advisor Marketplace — Open Quote Requests (${CURRENT_YEAR})`,
  description:
    "Browse open quote requests from Australians who need financial, mortgage, tax, SMSF, or property advice. Verified advisors compete with quotes — the consumer picks. Free to post.",
  alternates: { canonical: `${SITE_URL}/quotes` },
};

const BUDGET_LABELS: Record<string, string> = {
  under_500: "Under $500",
  "500_2k": "$500 – $2k",
  "2k_5k": "$2k – $5k",
  "5k_10k": "$5k – $10k",
  "10k_plus": "$10k+",
  not_sure: "Budget TBD",
};

interface JobRow {
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
}

async function getOpenJobs(): Promise<JobRow[]> {
  const supabase = await createClient();
  const now = new Date().toISOString();
  const { data } = await supabase
    .from("advisor_auctions")
    .select("id, slug, job_title, job_description, budget_band, advisor_types, location, status, ends_at, created_at")
    .eq("is_public", true)
    .eq("source", "public_job")
    .eq("status", "open")
    .gt("ends_at", now)
    .order("created_at", { ascending: false })
    .limit(60);
  return (data as JobRow[]) || [];
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

      {/* Hero — mirrors /invest/listings live marketplace style */}
      <section className="bg-gradient-to-b from-slate-900 to-slate-800 text-white">
        <div className="max-w-6xl mx-auto px-4 py-14 sm:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                Live advisor marketplace
              </p>
              <h1 className="text-3xl sm:text-5xl font-extrabold mb-4">
                Real Australians. Real quotes. Live now.
              </h1>
              <p className="text-slate-300 leading-relaxed mb-6 max-w-xl">
                Like a marketplace for advice — consumers post what they need help with, verified Australian advisors quote, the consumer picks. Free to post, free to compare, no obligation.
              </p>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link
                  href="/quotes/post"
                  className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-7 py-3 rounded-xl"
                >
                  Get a quote — free
                  <Icon name="arrow-right" size={16} />
                </Link>
                <Link
                  href="/advisors"
                  className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-semibold px-7 py-3 rounded-xl border border-white/20"
                >
                  Browse advisors directly
                </Link>
              </div>
            </div>
            <div className="hidden lg:flex items-center justify-center">
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 w-full max-w-sm">
                <p className="text-amber-400 text-xs font-semibold uppercase tracking-widest mb-3 flex items-center gap-2">
                  <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                  Live now
                </p>
                <p className="text-5xl font-extrabold text-white mb-1">{jobs.length}</p>
                <p className="text-sm text-slate-300">open requests accepting quotes</p>
                <div className="border-t border-white/10 my-4" />
                <p className="text-xs text-slate-400 leading-relaxed">
                  Average request gets <span className="text-white font-semibold">3–5 quotes</span> within the first 24 hours.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Listings */}
      <section className="bg-slate-50 py-12 sm:py-16">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex items-end justify-between mb-6">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Open quote requests</h2>
              <p className="text-sm text-slate-500 mt-1">
                {jobs.length === 0 ? "Nothing open right now — be the first." : `${jobs.length} live ${jobs.length === 1 ? "request" : "requests"}, sorted newest first.`}
              </p>
            </div>
            <Link
              href="/quotes/post"
              className="hidden sm:inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold px-5 py-2.5 rounded-lg text-sm"
            >
              Post yours
              <Icon name="plus" size={14} />
            </Link>
          </div>

          {jobs.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
              <Icon name="inbox" size={28} className="text-slate-400 mx-auto mb-3" />
              <h2 className="text-lg font-bold text-slate-900 mb-1">No open requests right now</h2>
              <p className="text-sm text-slate-500 mb-6">Be the first to post — it&apos;s free and takes 2 minutes.</p>
              <Link
                href="/quotes/post"
                className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl"
              >
                Get a quote
                <Icon name="arrow-right" size={16} />
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {jobs.map((j) => (
                <Link
                  key={j.id}
                  href={`/quotes/${j.slug}`}
                  className="bg-white border border-slate-200 hover:border-amber-300 hover:shadow-md rounded-xl p-5 transition-all group"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="font-bold text-slate-900 text-base group-hover:text-amber-700 transition-colors line-clamp-2">
                      {j.job_title}
                    </h3>
                    <CountdownBadge endsAt={j.ends_at} />
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2 mb-3 leading-relaxed">
                    {j.job_description}
                  </p>
                  <div className="flex items-center flex-wrap gap-2 text-xs">
                    {j.location && (
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-medium">
                        <Icon name="map-pin" size={11} className="inline mr-1" />
                        {j.location}
                      </span>
                    )}
                    <span className="bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full font-medium">
                      {BUDGET_LABELS[j.budget_band] || "Budget TBD"}
                    </span>
                    {(j.advisor_types || []).slice(0, 2).map((t) => (
                      <span key={t} className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        {t.replace(/_/g, " ")}
                      </span>
                    ))}
                    {(j.advisor_types?.length || 0) > 2 && (
                      <span className="text-slate-500 font-medium">+{(j.advisor_types?.length || 0) - 2}</span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white py-12 sm:py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2 text-center">How it works</h2>
          <p className="text-sm text-slate-500 mb-10 text-center">A two-sided marketplace for financial advice — built on top of our verified advisor directory.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              { n: 1, title: "Tell us what you need", desc: "A 2-min form: your situation, advisor types, budget, state. Free to post — no account required." },
              { n: 2, title: "Advisors compete", desc: "Verified Australian advisors send fixed-fee or hourly quotes within 72 hours. You see their profile, rating, and credentials." },
              { n: 3, title: "Pick the right one", desc: "Compare bids side-by-side. Accept the one that fits. Only then does your contact info get shared with the advisor." },
            ].map((s) => (
              <div key={s.n} className="text-center">
                <div className="w-12 h-12 bg-amber-500 text-slate-900 rounded-full font-extrabold flex items-center justify-center mx-auto mb-3 text-lg">
                  {s.n}
                </div>
                <p className="font-bold text-slate-900 mb-1">{s.title}</p>
                <p className="text-sm text-slate-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
