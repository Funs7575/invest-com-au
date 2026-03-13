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

  return (
    <section className="py-16 md:py-24 bg-[#F8FAFC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 md:mb-12 gap-6">
          <div className="max-w-2xl">
            <h2 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3 md:mb-4 tracking-tight">
              Verified Professionals Network
            </h2>
            <p className="text-base md:text-lg text-slate-600 font-medium">
              Prefer to browse? Review profiles of independent experts across Australia&apos;s most crucial financial sectors.
            </p>
          </div>
          {/* Tabs */}
          <div className="flex bg-white p-1.5 rounded-xl w-max border border-slate-200 shadow-sm">
            <button
              onClick={() => setActiveTab("property")}
              className={`px-4 md:px-6 py-2.5 rounded-lg text-xs md:text-sm font-extrabold transition-all ${
                activeTab === "property"
                  ? "bg-slate-900 text-white shadow-md"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              Property Investment &amp; Loans
            </button>
            <button
              onClick={() => setActiveTab("wealth")}
              className={`px-4 md:px-6 py-2.5 rounded-lg text-xs md:text-sm font-extrabold transition-all ${
                activeTab === "wealth"
                  ? "bg-slate-900 text-white shadow-md"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              Wealth Creation &amp; Super
            </button>
          </div>
        </div>

        {/* Location filters */}
        <div className="flex items-center gap-3 mb-8 md:mb-10 pb-2 overflow-x-auto scrollbar-hide border-b border-slate-200">
          <Icon name="map-pin" size={18} className="text-slate-400 flex-shrink-0 mb-3" />
          <span className="text-sm font-bold text-slate-700 mr-2 whitespace-nowrap mb-3">Target Region:</span>
          {LOCATIONS.map((loc) => (
            <button
              key={loc}
              onClick={() => setActiveLocation(loc)}
              className={`px-5 py-2 rounded-full text-sm font-bold transition-all whitespace-nowrap flex-shrink-0 border mb-3 ${
                activeLocation === loc
                  ? "bg-amber-500 border-amber-500 text-slate-900 shadow-sm"
                  : "bg-white border-slate-200 text-slate-600 hover:border-amber-300 hover:bg-amber-50"
              }`}
            >
              {loc}
            </button>
          ))}
        </div>

        {/* Advisor cards grid */}
        {filtered.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {filtered.slice(0, 6).map((advisor) => (
              <div
                key={advisor.slug}
                className="bg-white rounded-[1.5rem] border border-slate-200 shadow-sm hover:shadow-[0_20px_40px_rgb(0,0,0,0.08)] hover:border-amber-400 hover:-translate-y-1 transition-all duration-300 overflow-hidden flex flex-col group cursor-pointer relative"
              >
                <Link href={`/advisor/${advisor.slug}`} className="flex flex-col flex-grow">
                  <div className="p-6 md:p-8 flex-grow">
                    <div className="flex gap-4 md:gap-5 items-center mb-5 md:mb-6">
                      <Image
                        src={
                          advisor.photo_url ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(advisor.name)}&size=128&background=f59e0b&color=0f172a&bold=true`
                        }
                        alt={advisor.name}
                        width={64}
                        height={64}
                        className="w-14 h-14 md:w-16 md:h-16 rounded-full object-cover border-[3px] border-slate-50 shadow-sm group-hover:border-amber-300 transition-colors"
                        loading="lazy"
                        sizes="64px"
                      />
                      <div>
                        <h3 className="font-extrabold text-lg md:text-xl text-slate-900 leading-tight flex items-center gap-1.5">
                          {advisor.name}
                          <Icon name="shield-check" size={16} className="text-blue-500" />
                        </h3>
                        <p className="text-sm font-extrabold text-amber-600 mt-1">{typeLabel(advisor.type)}</p>
                        {advisor.firm_name && (
                          <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-wide">{advisor.firm_name}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between mb-5 md:mb-6 pb-5 md:pb-6 border-b border-slate-100">
                      {advisor.location_display && (
                        <div className="flex items-center gap-1.5 text-sm font-bold text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                          <Icon name="map-pin" size={16} className="text-slate-400" />
                          {advisor.location_display}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-xs font-extrabold px-2.5 py-1.5 rounded-lg border shadow-sm bg-emerald-50 text-emerald-700 border-emerald-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                        Accepting Clients
                      </div>
                    </div>

                    {advisor.specialties?.length > 0 && (
                      <div className="space-y-3">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                          <Icon name="trending-up" size={14} />
                          Core Specialties
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {advisor.specialties.slice(0, 4).map((spec) => (
                            <span
                              key={spec}
                              className="text-xs font-bold bg-white text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm group-hover:bg-amber-50 group-hover:border-amber-200 group-hover:text-amber-900 transition-colors"
                            >
                              {spec}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
                <div className="p-5 md:p-6 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-800 font-extrabold bg-emerald-100/60 px-3 py-1.5 rounded-lg border border-emerald-200">
                    <Icon name="shield-check" size={16} className="text-emerald-600" />
                    ASIC Verified
                  </div>
                  <Link
                    href={`/advisor/${advisor.slug}`}
                    className="bg-white border-2 border-slate-200 text-slate-700 group-hover:border-slate-900 group-hover:bg-slate-900 group-hover:text-white px-4 md:px-5 py-2 md:py-2.5 rounded-xl text-xs md:text-sm font-extrabold transition-all shadow-sm"
                  >
                    Request Strategy Session
                  </Link>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-slate-500 font-medium">No advisors found for this region. Try &quot;All Australia&quot; to see all available professionals.</p>
          </div>
        )}

        {/* View All button */}
        <div className="mt-12 md:mt-16 flex justify-center">
          <Link
            href={activeTab === "property" ? "/advisors?type=mortgage_broker,buyers_agent" : "/advisors"}
            className="bg-white border-2 border-slate-200 hover:border-slate-900 hover:bg-slate-900 hover:text-white text-slate-800 px-8 md:px-10 py-3.5 md:py-4 rounded-xl font-extrabold transition-all shadow-sm flex items-center gap-2 text-base md:text-lg"
          >
            View All {totalLabel}
            <Icon name="arrow-right" size={20} />
          </Link>
        </div>
      </div>
    </section>
  );
}
