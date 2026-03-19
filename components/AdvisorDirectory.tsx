"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Icon from "@/components/Icon";

interface Advisor {
  slug: string;
  name: string;
  firm_name?: string;
  type: string;
  location_display?: string;
  location_state?: string;
  rating: number;
  review_count: number;
  photo_url?: string;
  specialties: string[];
  verified?: boolean;
}

const PROPERTY_TYPES = new Set(["mortgage_broker", "buyers_agent", "real_estate_agent", "property_advisor"]);
const WEALTH_TYPES = new Set(["financial_planner", "smsf_accountant", "insurance_broker", "tax_agent", "wealth_manager", "estate_planner", "crypto_advisor", "aged_care_advisor", "debt_counsellor"]);
const LOCATIONS = ["All Australia", "NSW", "VIC", "QLD", "WA", "SA"];

function typeLabel(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[0.6rem] md:text-[0.65rem] text-amber-500 font-bold">{rating.toFixed(1)}</span>
      <span className="text-[0.55rem] md:text-[0.6rem] text-slate-400">({count} reviews)</span>
    </div>
  );
}

export default function AdvisorDirectory({ advisors }: { advisors: Advisor[] }) {
  const [activeTab, setActiveTab] = useState<"property" | "wealth">("property");
  const [activeLocation, setActiveLocation] = useState("All Australia");
  const [showAll, setShowAll] = useState(false);

  const typeFilter = activeTab === "property" ? PROPERTY_TYPES : WEALTH_TYPES;
  const filtered = advisors
    .filter((a) => typeFilter.has(a.type))
    .filter((a) => activeLocation === "All Australia" || a.location_state === activeLocation);

  // Desktop: 6 cards; Mobile: 3 cards unless "show more" clicked
  const desktopCount = 6;
  const mobileCount = showAll ? 6 : 3;

  const totalLabel = activeTab === "property" ? "Property Experts" : "Financial Advisors";

  return (
    <section className="py-6 md:py-10 bg-gradient-to-b from-amber-50/30 to-white">
      <div className="container-custom">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3 md:mb-5">
          <div>
            <h2 className="text-lg md:text-2xl font-bold text-slate-900">
              Find a Verified{" "}
              <span className="text-amber-600">
                {activeTab === "property" ? "Property Expert" : "Financial Advisor"}
              </span>
            </h2>
            <p className="text-xs md:text-sm text-slate-600 mt-0.5 md:mt-1 max-w-lg">
              <span className="hidden md:inline">Every advisor verified against ASIC registers. Free consultation, no obligation to proceed.</span>
              <span className="md:hidden">ASIC-verified professionals · Free consultation</span>
            </p>
          </div>
          <Link href="/advisors" className="text-xs font-semibold text-amber-600 hover:text-amber-800 shrink-0 min-h-[44px] inline-flex items-center px-1">
            Browse all &rarr;
          </Link>
        </div>

        {/* First-person tab labels + Location filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4 md:mb-5">
          <div className="flex bg-white p-1 rounded-lg border border-slate-200 w-max">
            <button
              onClick={() => { setActiveTab("property"); setShowAll(false); }}
              className={`px-3 md:px-4 py-1.5 rounded-md text-xs md:text-sm font-semibold transition-all min-h-[36px] md:min-h-[40px] ${
                activeTab === "property"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              I want property help
            </button>
            <button
              onClick={() => { setActiveTab("wealth"); setShowAll(false); }}
              className={`px-3 md:px-4 py-1.5 rounded-md text-xs md:text-sm font-semibold transition-all min-h-[36px] md:min-h-[40px] ${
                activeTab === "wealth"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              I want to grow wealth
            </button>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
            <Icon name="map-pin" size={14} className="text-slate-400 shrink-0" />
            {LOCATIONS.map((loc) => (
              <button
                key={loc}
                onClick={() => setActiveLocation(loc)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all border min-h-[36px] ${
                  activeLocation === loc
                    ? "bg-amber-500 border-amber-500 text-white"
                    : "bg-white border-slate-200 text-slate-600 hover:border-amber-300 hover:bg-amber-50"
                }`}
              >
                {loc}
              </button>
            ))}
          </div>
        </div>

        {/* Advisor cards */}
        {filtered.length > 0 ? (
          <>
            {/* Desktop: always show 6 */}
            <div className="hidden md:grid md:grid-cols-3 gap-3">
              {filtered.slice(0, desktopCount).map((advisor) => (
                <AdvisorCard key={advisor.slug} advisor={advisor} />
              ))}
            </div>
            {/* Mobile: show 3 by default, expand to 6 */}
            <div className="md:hidden grid grid-cols-1 gap-2">
              {filtered.slice(0, mobileCount).map((advisor) => (
                <AdvisorCard key={advisor.slug} advisor={advisor} mobile />
              ))}
            </div>
            {!showAll && filtered.length > 3 && (
              <button
                onClick={() => setShowAll(true)}
                className="md:hidden w-full mt-3 py-2.5 min-h-[44px] border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Show more advisors &darr;
              </button>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-slate-600">No advisors found for this region. Try &quot;All Australia&quot; to see all.</p>
          </div>
        )}

        {/* CTA */}
        <div className="mt-4 md:mt-6 bg-white border border-slate-200 rounded-xl p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-6">
          <div className="flex-1 min-w-0">
            <p className="text-sm md:text-base font-bold text-slate-900 mb-1">
              Get matched with a verified advisor — free, no obligation
            </p>
            <p className="text-xs md:text-sm text-slate-600 max-w-prose">
              Answer 4 questions and we&apos;ll connect you with the right professional for your situation. Your details go to one advisor only — never sold or shared.
            </p>
          </div>
          <div className="flex gap-2 shrink-0 w-full md:w-auto">
            <Link
              href="/find-advisor"
              className="flex-1 md:flex-none text-center px-4 py-2.5 min-h-[44px] flex items-center justify-center bg-amber-500 text-white text-xs md:text-sm font-bold rounded-lg hover:bg-amber-600 transition-colors"
            >
              Find My Advisor — Free
            </Link>
            <Link
              href={activeTab === "property" ? "/advisors/mortgage-brokers" : "/advisors"}
              className="flex-1 md:flex-none text-center px-4 py-2.5 min-h-[44px] flex items-center justify-center border border-amber-300 text-amber-700 text-xs md:text-sm font-semibold rounded-lg hover:bg-amber-50 transition-colors"
            >
              View All {totalLabel}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function AdvisorCard({ advisor, mobile = false }: { advisor: Advisor; mobile?: boolean }) {
  return (
    <Link
      href={`/advisor/${advisor.slug}`}
      className={`flex items-start gap-2.5 bg-white border border-amber-100 rounded-xl hover:border-amber-300 hover:shadow-md transition-all group ${
        mobile ? "p-3" : "p-3 md:p-3.5"
      }`}
    >
      <div className="relative shrink-0">
        <Image
          src={advisor.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(advisor.name)}&size=80&background=f59e0b&color=fff`}
          alt={advisor.name}
          width={48}
          height={48}
          className={`rounded-full ${mobile ? "w-11 h-11" : "w-10 h-10 md:w-12 md:h-12"}`}
          loading="lazy"
          sizes="48px"
        />
        {advisor.verified && (
          <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center" title="ASIC Verified">
            <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`font-bold text-slate-900 truncate group-hover:text-amber-700 transition-colors ${mobile ? "text-sm" : "text-xs md:text-sm"}`}>
          {advisor.name}
        </p>
        <p className={`text-amber-600 font-medium truncate ${mobile ? "text-xs" : "text-[0.58rem] md:text-xs"}`}>
          {typeLabel(advisor.type)}
        </p>
        {advisor.firm_name && (
          <p className={`text-slate-400 truncate ${mobile ? "text-xs" : "text-[0.55rem] md:text-[0.65rem]"}`}>
            {advisor.firm_name}
          </p>
        )}
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {advisor.rating > 0 && advisor.review_count > 0 && (
            <StarRating rating={advisor.rating} count={advisor.review_count} />
          )}
          {advisor.location_display && (
            <span className={`text-slate-400 ${mobile ? "text-xs" : "text-[0.55rem] md:text-[0.6rem]"}`}>
              {advisor.location_display}
            </span>
          )}
        </div>
        {/* Free consultation badge */}
        <span className="inline-block mt-1 text-[0.58rem] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded-full">
          Free consultation
        </span>
        {advisor.specialties?.length > 0 && (
          <div className="hidden md:flex flex-wrap gap-1 mt-1.5">
            {advisor.specialties.slice(0, 2).map((spec) => (
              <span key={spec} className="text-[0.55rem] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded border border-amber-100">
                {spec}
              </span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
