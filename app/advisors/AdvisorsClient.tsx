"use client";

import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import type { Professional, ProfessionalType } from "@/lib/types";
import { PROFESSIONAL_TYPE_LABELS, AU_STATES } from "@/lib/types";
import Icon from "@/components/Icon";

const TYPE_FILTERS: { key: ProfessionalType | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "smsf_accountant", label: "SMSF Accountants" },
  { key: "financial_planner", label: "Financial Planners" },
  { key: "property_advisor", label: "Property Advisors" },
  { key: "tax_agent", label: "Tax Agents" },
  { key: "mortgage_broker", label: "Mortgage Brokers" },
  { key: "estate_planner", label: "Estate Planners" },
];

function renderStars(rating: number) {
  return "★".repeat(Math.floor(rating)) + (rating % 1 >= 0.5 ? "½" : "");
}

export default function AdvisorsClient({ professionals, initialType, initialState, pageTitle, pageDescription, faqs = [] }: {
  professionals: Professional[];
  initialType?: ProfessionalType;
  initialState?: string;
  pageTitle?: string;
  pageDescription?: string;
  faqs?: { q: string; a: string }[];
}) {
  const searchParams = useSearchParams();
  const [typeFilter, setTypeFilter] = useState<ProfessionalType | "all">(initialType || "all");
  const [stateFilter, setStateFilter] = useState<string>(initialState || "all");
  const [search, setSearch] = useState("");

  // Sync filters from URL params on mount (only if no initial props)
  useEffect(() => {
    if (initialType || initialState) return; // Skip if props already set
    const typeParam = searchParams.get("type");
    const stateParam = searchParams.get("state");
    if (typeParam && TYPE_FILTERS.some(f => f.key === typeParam)) {
      setTypeFilter(typeParam as ProfessionalType);
    }
    if (stateParam && AU_STATES.includes(stateParam as typeof AU_STATES[number])) {
      setStateFilter(stateParam);
    }
  }, [searchParams, initialType, initialState]);

  const filtered = useMemo(() => {
    return professionals.filter((p) => {
      if (typeFilter !== "all" && p.type !== typeFilter) return false;
      if (stateFilter !== "all" && p.location_state !== stateFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          p.name.toLowerCase().includes(q) ||
          p.firm_name?.toLowerCase().includes(q) ||
          p.specialties.some((s) => s.toLowerCase().includes(q)) ||
          p.location_display?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [professionals, typeFilter, stateFilter, search]);

  // Count per type for badges
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = { all: professionals.length };
    professionals.forEach((p) => { counts[p.type] = (counts[p.type] || 0) + 1; });
    return counts;
  }, [professionals]);

  return (
    <div className="py-5 md:py-12">
      <div className="container-custom max-w-4xl">
        {/* Breadcrumb */}
        <nav className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <span className="text-slate-700">Find an Advisor</span>
        </nav>

        {/* Header */}
        <div className="mb-4 md:mb-8">
          <h1 className="text-xl md:text-4xl font-extrabold mb-1 md:mb-3 text-slate-900">
            {pageTitle || "Find a Financial Advisor"}
          </h1>
          <p className="text-xs md:text-base text-slate-500">
            <span className="md:hidden">{pageDescription ? pageDescription.slice(0, 60) + '...' : "Verified Australian financial professionals"}</span>
            <span className="hidden md:inline">{pageDescription || "Browse verified Australian financial professionals. Free consultation requests — no obligation."}</span>
          </p>
        </div>

        {/* Search bar */}
        <div className="relative mb-3 md:mb-4">
          <Icon name="search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, firm, or specialty..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 md:py-3 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              <Icon name="x" size={16} />
            </button>
          )}
        </div>

        {/* Type filter pills */}
        <div className="flex gap-1.5 md:gap-2 overflow-x-auto pb-1 mb-2 md:mb-3 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setTypeFilter(f.key)}
              className={`shrink-0 px-3 py-1.5 md:px-4 md:py-2 text-[0.65rem] md:text-xs font-semibold rounded-full transition-all ${
                typeFilter === f.key
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {f.label}
              {typeCounts[f.key] ? ` (${typeCounts[f.key]})` : ""}
            </button>
          ))}
        </div>

        {/* State filter */}
        <div className="flex gap-1.5 overflow-x-auto pb-2 mb-4 md:mb-6 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
          <button
            onClick={() => setStateFilter("all")}
            className={`shrink-0 px-2.5 py-1 text-[0.6rem] md:text-[0.65rem] font-medium rounded-full transition-all ${
              stateFilter === "all" ? "bg-blue-100 text-blue-700" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
            }`}
          >
            All States
          </button>
          {AU_STATES.map((s) => (
            <button
              key={s}
              onClick={() => setStateFilter(s)}
              className={`shrink-0 px-2.5 py-1 text-[0.6rem] md:text-[0.65rem] font-medium rounded-full transition-all ${
                stateFilter === s ? "bg-blue-100 text-blue-700" : "bg-slate-50 text-slate-500 hover:bg-slate-100"
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        {/* Result count */}
        <div className="text-[0.62rem] md:text-xs text-slate-400 mb-3">
          {filtered.length} advisor{filtered.length !== 1 ? "s" : ""}
          {typeFilter !== "all" ? ` · ${TYPE_FILTERS.find((f) => f.key === typeFilter)?.label}` : ""}
          {stateFilter !== "all" ? ` · ${stateFilter}` : ""}
        </div>

        {/* Advisor cards */}
        {filtered.length > 0 ? (
          <div className="space-y-3 md:space-y-4">
            {filtered.map((pro) => (
              <Link
                key={pro.id}
                href={`/advisor/${pro.slug}`}
                className="block bg-white border border-slate-200 rounded-xl p-3 md:p-5 hover:shadow-md hover:border-slate-300 transition-all"
                style={{ borderLeftWidth: 3, borderLeftColor: pro.verified ? "#7c3aed" : "#e2e8f0" }}
              >
                <div className="flex gap-3 md:gap-4">
                  {/* Avatar */}
                  {pro.photo_url ? (
                    <img src={pro.photo_url} alt={pro.name} className="w-12 h-12 md:w-14 md:h-14 rounded-full object-cover shrink-0" />
                  ) : (
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-slate-100 flex items-center justify-center text-sm md:text-base font-bold text-slate-500 shrink-0">
                      {pro.name.split(" ").map((n) => n[0]).join("")}
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-bold text-sm md:text-base text-slate-900 truncate">{pro.name}</span>
                      {pro.verified && (
                        <span className="shrink-0 text-[0.56rem] md:text-[0.62rem] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700">Verified</span>
                      )}
                    </div>
                    {pro.firm_name && (
                      <div className="text-[0.65rem] md:text-xs text-slate-500 truncate">{pro.firm_name}</div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[0.62rem] md:text-xs text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full font-medium">
                        {PROFESSIONAL_TYPE_LABELS[pro.type]}
                      </span>
                      {pro.location_display && (
                        <span className="text-[0.62rem] md:text-xs text-slate-400">{pro.location_display}</span>
                      )}
                    </div>

                    {/* Rating + fee */}
                    <div className="flex items-center gap-3 mt-1.5">
                      {pro.rating > 0 && (
                        <span className="text-[0.62rem] md:text-xs">
                          <span className="text-amber-500">{renderStars(pro.rating)}</span>
                          <span className="text-slate-400 ml-1">{pro.rating} ({pro.review_count})</span>
                        </span>
                      )}
                      {pro.fee_description && (
                        <span className="text-[0.62rem] md:text-xs font-semibold text-slate-700">{pro.fee_description}</span>
                      )}
                    </div>

                    {/* Specialties */}
                    {pro.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {pro.specialties.slice(0, 3).map((s) => (
                          <span key={s} className="text-[0.56rem] md:text-[0.62rem] font-medium px-2 py-0.5 rounded-full bg-slate-50 text-slate-500">
                            {s}
                          </span>
                        ))}
                        {pro.specialties.length > 3 && (
                          <span className="text-[0.56rem] md:text-[0.62rem] text-slate-400">+{pro.specialties.length - 3} more</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* CTA arrow */}
                  <div className="shrink-0 self-center">
                    <Icon name="chevron-right" size={18} className="text-slate-300" />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200">
            <Icon name="search" size={32} className="text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-600 mb-1">No advisors found</p>
            <p className="text-xs text-slate-400">
              {search ? `No results for "${search}". Try a different search.` : "Try a different filter combination."}
            </p>
            {(typeFilter !== "all" || stateFilter !== "all" || search) && (
              <button
                onClick={() => { setTypeFilter("all"); setStateFilter("all"); setSearch(""); }}
                className="mt-3 text-xs text-blue-700 font-semibold hover:text-blue-800 transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

        {/* FAQs — shown on type-specific pages */}
        {faqs.length > 0 && (
          <div className="mt-6 md:mt-10">
            <h2 className="text-base md:text-xl font-bold text-slate-900 mb-3 md:mb-4">Frequently Asked Questions</h2>
            <div className="space-y-2 md:space-y-3">
              {faqs.map((faq, i) => (
                <details key={i} className="bg-white border border-slate-200 rounded-lg group">
                  <summary className="px-3.5 py-3 md:px-4 md:py-3.5 font-semibold text-xs md:text-sm text-slate-800 cursor-pointer hover:bg-slate-50 transition-colors list-none flex items-center justify-between">
                    {faq.q}
                    <span className="text-slate-400 group-open:rotate-180 transition-transform ml-2 shrink-0">▾</span>
                  </summary>
                  <p className="px-3.5 pb-3 md:px-4 md:pb-3.5 text-xs md:text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        )}

        {/* Are you an advisor? CTA */}
        <div className="mt-6 md:mt-10 bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-6 text-center">
          <h3 className="text-base md:text-lg font-bold text-slate-900 mb-1 md:mb-2">Are you a financial professional?</h3>
          <p className="text-xs md:text-sm text-slate-500 mb-3 md:mb-4">
            List your practice on invest.com.au for free. Only pay when you receive an enquiry.
          </p>
          <Link
            href="/contact?subject=advisor-listing"
            className="inline-block px-5 py-2.5 md:px-6 md:py-3 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors"
          >
            Get Listed Free →
          </Link>
        </div>

        {/* Compliance footer */}
        <div className="mt-4 md:mt-6 text-[0.58rem] md:text-xs text-slate-400 text-center leading-relaxed">
          <p>All advisors listed are verified against the ASIC Financial Advisers Register or Tax Practitioners Board. Invest.com.au does not provide financial advice. Selecting an advisor is your decision — we facilitate the connection only.</p>
        </div>
      </div>
    </div>
  );
}
