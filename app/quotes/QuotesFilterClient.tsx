"use client";

import { useState, useCallback, useTransition } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import CountdownBadge from "./CountdownBadge";
import type { JobRow } from "./page";

const BUDGET_LABELS: Record<string, string> = {
  under_500: "Under $500",
  "500_2k": "$500 – $2k",
  "2k_5k": "$2k – $5k",
  "5k_10k": "$5k – $10k",
  "10k_plus": "$10k+",
  not_sure: "Budget TBD",
};

const ADVISOR_TYPE_OPTIONS = [
  { value: "", label: "All types" },
  { value: "mortgage_broker", label: "Mortgage Broker" },
  { value: "financial_planner", label: "Financial Planner" },
  { value: "buyers_agent", label: "Buyers Agent" },
  { value: "tax_agent", label: "Tax Agent" },
  { value: "smsf_accountant", label: "SMSF Accountant" },
  { value: "property_advisor", label: "Property Advisor" },
  { value: "insurance_broker", label: "Insurance Broker" },
  { value: "estate_planner", label: "Estate Planner" },
  { value: "wealth_manager", label: "Wealth Manager" },
  { value: "crypto_advisor", label: "Crypto Advisor" },
  { value: "business_broker", label: "Business Broker" },
  { value: "migration_agent", label: "Migration Agent" },
  { value: "aged_care_advisor", label: "Aged Care Advisor" },
];

const STATE_OPTIONS = [
  { value: "", label: "All states" },
  { value: "NSW", label: "NSW" },
  { value: "VIC", label: "VIC" },
  { value: "QLD", label: "QLD" },
  { value: "WA", label: "WA" },
  { value: "SA", label: "SA" },
  { value: "TAS", label: "TAS" },
  { value: "ACT", label: "ACT" },
  { value: "NT", label: "NT" },
];

const BUDGET_OPTIONS = [
  { value: "", label: "All budgets" },
  { value: "under_500", label: "Under $500" },
  { value: "500_2k", label: "$500 – $2k" },
  { value: "2k_5k", label: "$2k – $5k" },
  { value: "5k_10k", label: "$5k – $10k" },
  { value: "10k_plus", label: "$10k+" },
  { value: "not_sure", label: "Budget TBD" },
];

interface Props {
  initialJobs: JobRow[];
}

export default function QuotesFilterClient({ initialJobs }: Props) {
  const [jobs, setJobs] = useState<JobRow[]>(initialJobs);
  const [advisorType, setAdvisorType] = useState("");
  const [state, setState] = useState("");
  const [budget, setBudget] = useState("");
  const [isPending, startTransition] = useTransition();

  const fetchFiltered = useCallback(
    (type: string, st: string, bgt: string) => {
      startTransition(async () => {
        const params = new URLSearchParams();
        if (type) params.set("advisor_type", type);
        if (st) params.set("state", st);
        if (bgt) params.set("budget_band", bgt);
        params.set("limit", "60");

        try {
          const res = await fetch(`/api/quotes?${params.toString()}`);
          if (res.ok) {
            const data = await res.json();
            setJobs(data.jobs || []);
          }
        } catch {
          // keep current jobs on network error
        }
      });
    },
    []
  );

  function handleAdvisorType(v: string) {
    setAdvisorType(v);
    fetchFiltered(v, state, budget);
  }
  function handleState(v: string) {
    setState(v);
    fetchFiltered(advisorType, v, budget);
  }
  function handleBudget(v: string) {
    setBudget(v);
    fetchFiltered(advisorType, state, v);
  }
  function clearFilters() {
    setAdvisorType("");
    setState("");
    setBudget("");
    setJobs(initialJobs);
  }

  const hasFilters = !!(advisorType || state || budget);

  return (
    <>
      {/* Hero */}
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
                <p className="text-5xl font-extrabold text-white mb-1">{initialJobs.length}</p>
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
          <div className="flex items-end justify-between mb-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Open quote requests</h2>
              <p className="text-sm text-slate-500 mt-1">
                {isPending
                  ? "Filtering…"
                  : jobs.length === 0
                  ? "Nothing matched. Try clearing filters."
                  : `${jobs.length} live ${jobs.length === 1 ? "request" : "requests"}${hasFilters ? " (filtered)" : ", sorted newest first."}`}
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

          {/* Filter bar */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <select
              value={advisorType}
              onChange={(e) => handleAdvisorType(e.target.value)}
              className="text-sm border border-slate-200 bg-white rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
              aria-label="Filter by advisor type"
            >
              {ADVISOR_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            <select
              value={state}
              onChange={(e) => handleState(e.target.value)}
              className="text-sm border border-slate-200 bg-white rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
              aria-label="Filter by state"
            >
              {STATE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            <select
              value={budget}
              onChange={(e) => handleBudget(e.target.value)}
              className="text-sm border border-slate-200 bg-white rounded-lg px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-400"
              aria-label="Filter by budget"
            >
              {BUDGET_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            {hasFilters && (
              <button
                onClick={clearFilters}
                className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2 py-2"
              >
                <Icon name="x" size={14} />
                Clear
              </button>
            )}
          </div>

          {jobs.length === 0 && !isPending ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-10 text-center">
              <Icon name="inbox" size={28} className="text-slate-400 mx-auto mb-3" />
              {hasFilters ? (
                <>
                  <h2 className="text-lg font-bold text-slate-900 mb-1">No requests match your filters</h2>
                  <p className="text-sm text-slate-500 mb-4">Try adjusting or clearing the filters above.</p>
                  <button
                    onClick={clearFilters}
                    className="inline-flex items-center gap-2 bg-slate-900 text-white font-bold px-5 py-2.5 rounded-xl text-sm"
                  >
                    Clear filters
                  </button>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-bold text-slate-900 mb-1">No open requests right now</h2>
                  <p className="text-sm text-slate-500 mb-6">Be the first to post — it&apos;s free and takes 2 minutes.</p>
                  <Link
                    href="/quotes/post"
                    className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl"
                  >
                    Get a quote
                    <Icon name="arrow-right" size={16} />
                  </Link>
                </>
              )}
            </div>
          ) : (
            <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 transition-opacity ${isPending ? "opacity-60 pointer-events-none" : ""}`}>
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
                    {j.bid_count > 0 && (
                      <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1">
                        <Icon name="message-circle" size={11} />
                        {j.bid_count} {j.bid_count === 1 ? "quote" : "quotes"}
                      </span>
                    )}
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
