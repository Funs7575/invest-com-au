"use client";

import { useState, useCallback, useTransition } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { Select } from "@/components/ui/Select";
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
      {/* Compact light header (B10) — live count as one honest stat pill */}
      <section className="bg-white border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-4 pt-4 pb-5 md:pt-5">
          <nav aria-label="Breadcrumb" className="mb-1.5 text-[11px] md:text-xs text-slate-500">
            <Link href="/" className="hover:text-slate-700">Home</Link>
            <span className="mx-1.5" aria-hidden>/</span>
            <span className="text-slate-600">Quotes</span>
          </nav>
          <h1 className="text-2xl font-extrabold leading-tight tracking-tight text-slate-900 md:text-[1.9rem]">
            Real Australians. Real quotes. <span className="text-coral-600">Live now.</span>
          </h1>
          <p className="mt-1 max-w-2xl text-[12.5px] leading-snug text-slate-500 md:text-[13.5px]">
            Like a marketplace for advice — consumers post what they need help with, verified Australian advisors quote, the consumer picks. Free to post, free to compare, no obligation.
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
              {initialJobs.length} open {initialJobs.length === 1 ? "request" : "requests"} accepting quotes
            </span>
            <span className="text-xs text-slate-500">
              Average request gets <span className="font-semibold text-slate-700">3–5 quotes</span> within the first 24 hours.
            </span>
          </div>
          <div className="mt-4 flex flex-col sm:flex-row gap-2.5">
            <Link
              href="/quotes/post"
              className="inline-flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 text-sm font-bold px-5 py-2.5 rounded-lg"
            >
              Get a quote — free
              <Icon name="arrow-right" size={14} />
            </Link>
            <Link
              href="/advisors"
              className="inline-flex items-center justify-center gap-2 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold px-5 py-2.5 rounded-lg border border-slate-200"
            >
              Browse advisors directly
            </Link>
          </div>
        </div>
      </section>

      {/* Listings */}
      <section className="bg-slate-50 py-8">
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

          {/* Filter bar — house Select (B11) */}
          <div className="flex flex-wrap items-center gap-2 mb-6">
            <div className="w-full sm:w-52">
              <Select
                id="quotes-filter-advisor-type"
                aria-label="Filter by advisor type"
                value={advisorType}
                onChange={(e) => handleAdvisorType(e.target.value)}
                options={ADVISOR_TYPE_OPTIONS}
              />
            </div>

            <div className="w-full sm:w-36">
              <Select
                id="quotes-filter-state"
                aria-label="Filter by state"
                value={state}
                onChange={(e) => handleState(e.target.value)}
                options={STATE_OPTIONS}
              />
            </div>

            <div className="w-full sm:w-44">
              <Select
                id="quotes-filter-budget"
                aria-label="Filter by budget"
                value={budget}
                onChange={(e) => handleBudget(e.target.value)}
                options={BUDGET_OPTIONS}
              />
            </div>

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
      <section className="bg-white py-8">
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
