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

const PROPERTY_TYPES = new Set(["mortgage_broker", "buyers_agent"]);
const WEALTH_TYPES = new Set(["financial_planner", "smsf_accountant", "insurance_broker", "tax_agent", "wealth_manager", "estate_planner"]);
const LOCATIONS = ["All Australia", "NSW", "VIC", "QLD", "WA", "SA"];

function typeLabel(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function AdvisorDirectory({ advisors }: { advisors: Advisor[] }) {
  const [activeTab, setActiveTab] = useState<"property" | "wealth">("property");
  const [activeLocation, setActiveLocation] = useState("All Australia");

  const typeFilter = activeTab === "property" ? PROPERTY_TYPES : WEALTH_TYPES;
  const filtered = advisors
    .filter((a) => typeFilter.has(a.type))
    .filter((a) => activeLocation === "All Australia" || a.location_state === activeLocation);

  const totalLabel = activeTab === "property" ? "Property Experts" : "Financial Experts";
  const tabHeading = activeTab === "property" ? "Property & Finance Expert" : "Financial Advisor";

  return (
    <section className="py-4 md:py-12 bg-gradient-to-b from-violet-50/30 to-white">
      <div className="container-custom">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3 md:mb-6">
          <div>
            <h2 className="text-lg md:text-2xl font-bold text-slate-900">
              Find a <span className="text-violet-600">{tabHeading}</span>
            </h2>
            <p className="text-[0.69rem] md:text-sm text-slate-500 mt-0.5 md:mt-1">
              <span className="hidden md:inline">Browse independent experts verified against ASIC registers across Australia</span>
              <span className="md:hidden">ASIC-verified professionals across Australia</span>
            </p>
          </div>
          <Link href="/advisors" className="text-[0.69rem] font-semibold text-violet-600 hover:text-violet-800 shrink-0 min-h-[44px] inline-flex items-center px-1">
            Browse all &rarr;
          </Link>
        </div>

        {/* Tabs + Location filters */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mb-4 md:mb-6">
          <div className="flex bg-white p-1 rounded-lg border border-slate-200 w-max">
            <button
              onClick={() => setActiveTab("property")}
              className={`px-3 md:px-4 py-1.5 rounded-md text-xs md:text-sm font-semibold transition-all ${
                activeTab === "property"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              Property &amp; Loans
            </button>
            <button
              onClick={() => setActiveTab("wealth")}
              className={`px-3 md:px-4 py-1.5 rounded-md text-xs md:text-sm font-semibold transition-all ${
                activeTab === "wealth"
                  ? "bg-violet-600 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              Wealth &amp; Super
            </button>
          </div>
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide">
            <Icon name="map-pin" size={14} className="text-slate-400 shrink-0" />
            {LOCATIONS.map((loc) => (
              <button
                key={loc}
                onClick={() => setActiveLocation(loc)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all border ${
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
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
            {filtered.slice(0, 6).map((advisor) => (
              <Link
                key={advisor.slug}
                href={`/advisor/${advisor.slug}`}
                className="flex items-start gap-2.5 p-2.5 md:p-3.5 bg-white border border-violet-100 rounded-xl hover:border-violet-300 hover:shadow-md transition-all group"
              >
                <Image
                  src={advisor.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(advisor.name)}&size=80&background=7c3aed&color=fff`}
                  alt={advisor.name}
                  width={48}
                  height={48}
                  className="rounded-full shrink-0 w-10 h-10 md:w-12 md:h-12"
                  loading="lazy"
                  sizes="48px"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs md:text-sm font-bold text-slate-900 truncate group-hover:text-violet-700 transition-colors">{advisor.name}</p>
                  <p className="text-[0.58rem] md:text-xs text-violet-600 font-medium">{typeLabel(advisor.type)}</p>
                  {advisor.firm_name && <p className="text-[0.55rem] md:text-[0.65rem] text-slate-400 truncate">{advisor.firm_name}</p>}
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {advisor.rating > 0 && <span className="text-[0.6rem] md:text-[0.65rem] text-amber-600 font-semibold">{advisor.rating}/5</span>}
                    {advisor.location_display && <span className="text-[0.55rem] md:text-[0.6rem] text-slate-400">{advisor.location_display}</span>}
                  </div>
                  {advisor.specialties?.length > 0 && (
                    <div className="hidden md:flex flex-wrap gap-1 mt-1.5">
                      {advisor.specialties.slice(0, 2).map((spec) => (
                        <span key={spec} className="text-[0.55rem] bg-violet-50 text-violet-600 px-1.5 py-0.5 rounded border border-violet-100">
                          {spec}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-slate-500">No advisors found for this region. Try &quot;All Australia&quot; to see all.</p>
          </div>
        )}

        {/* CTA */}
        <div className="mt-4 md:mt-6 bg-white border border-slate-200 rounded-xl p-4 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-6">
          <div className="flex-1 min-w-0">
            <p className="text-sm md:text-base font-bold text-slate-900 mb-1">Get matched with a verified advisor — free, no obligation</p>
            <p className="text-xs md:text-sm text-slate-500">
              Tell us what you need help with and we&apos;ll connect you with a verified professional. Your details go to one advisor only.
            </p>
          </div>
          <div className="flex gap-2 shrink-0 w-full md:w-auto">
            <Link
              href="/find-advisor"
              className="flex-1 md:flex-none text-center px-4 py-2.5 bg-violet-600 text-white text-xs md:text-sm font-bold rounded-lg hover:bg-violet-700 transition-colors"
            >
              Find My Advisor
            </Link>
            <Link
              href={activeTab === "property" ? "/advisors/mortgage-brokers" : "/advisors"}
              className="flex-1 md:flex-none text-center px-4 py-2.5 border border-violet-300 text-violet-700 text-xs md:text-sm font-semibold rounded-lg hover:bg-violet-50 transition-colors"
            >
              View All {totalLabel}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
