"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import type { Broker, PlatformType, Professional } from "@/lib/types";
import { PROFESSIONAL_TYPE_LABELS } from "@/lib/types";
import BrokerLogo from "@/components/BrokerLogo";

const PLATFORM_TABS = [
  { key: "all", label: "All Platforms", icon: "🏦" },
  { key: "share_broker", label: "Share Brokers", icon: "📈" },
  { key: "crypto_exchange", label: "Crypto", icon: "₿" },
  { key: "robo_advisor", label: "Robo-Advisors", icon: "🤖" },
  { key: "super_fund", label: "Super Funds", icon: "🏛️" },
  { key: "research_tool", label: "Research Tools", icon: "🔍" },
  { key: "property_platform", label: "Property", icon: "🏠" },
  { key: "cfd_forex", label: "CFD & Forex", icon: "💱" },
] as const;

type TabKey = (typeof PLATFORM_TABS)[number]["key"];

const ADVISOR_TABS = [
  { key: "all", label: "All Advisors" },
  { key: "financial_planner", label: "Financial Planners" },
  { key: "smsf_accountant", label: "SMSF Accountants" },
  { key: "property_advisor", label: "Property Advisors" },
  { key: "tax_agent", label: "Tax Agents" },
  { key: "mortgage_broker", label: "Mortgage Brokers" },
  { key: "wealth_manager", label: "Wealth Managers" },
  { key: "crypto_advisor", label: "Crypto Advisors" },
  { key: "buyers_agent", label: "Buyers Agents" },
  { key: "estate_planner", label: "Estate Planners" },
  { key: "insurance_broker", label: "Insurance Brokers" },
  { key: "aged_care_advisor", label: "Aged Care Advisors" },
  { key: "debt_counsellor", label: "Debt Counsellors" },
] as const;

type AdvisorTabKey = (typeof ADVISOR_TABS)[number]["key"];

type ViewMode = "platforms" | "advisors";

interface ReviewsClientProps {
  brokers: Broker[];
  advisors?: (Professional & { id: number })[];
}

export default function ReviewsClient({ brokers, advisors = [] }: ReviewsClientProps) {
  const [viewMode, setViewMode] = useState<ViewMode>("platforms");
  const [platformTab, setPlatformTab] = useState<TabKey>("all");
  const [advisorTab, setAdvisorTab] = useState<AdvisorTabKey>("all");

  const filteredBrokers = useMemo(() => {
    if (platformTab === "all") return brokers;
    return brokers.filter((b) => b.platform_type === platformTab);
  }, [brokers, platformTab]);

  const filteredAdvisors = useMemo(() => {
    if (advisorTab === "all") return advisors;
    return advisors.filter((a) => a.type === advisorTab);
  }, [advisors, advisorTab]);

  const availablePlatformTabs = useMemo(() => {
    return PLATFORM_TABS.filter((tab) => {
      if (tab.key === "all") return true;
      return brokers.some((b) => b.platform_type === tab.key);
    });
  }, [brokers]);

  const availableAdvisorTabs = useMemo(() => {
    return ADVISOR_TABS.filter((tab) => {
      if (tab.key === "all") return true;
      return advisors.some((a) => a.type === tab.key);
    });
  }, [advisors]);

  return (
    <div>
      {/* Top-level toggle: Platforms | Advisors */}
      {advisors.length > 0 && (
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl w-fit mb-4 md:mb-6">
          <button
            onClick={() => setViewMode("platforms")}
            className={`px-4 md:px-6 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-semibold transition-all duration-200 ${
              viewMode === "platforms"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Platforms
            <span className="ml-1.5 text-[0.65rem] md:text-xs text-slate-400 font-normal">({brokers.length})</span>
          </button>
          <button
            onClick={() => setViewMode("advisors")}
            className={`px-4 md:px-6 py-2 md:py-2.5 rounded-lg text-xs md:text-sm font-semibold transition-all duration-200 ${
              viewMode === "advisors"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            Advisors
            <span className="ml-1.5 text-[0.65rem] md:text-xs text-slate-400 font-normal">({advisors.length})</span>
          </button>
        </div>
      )}

      {viewMode === "platforms" ? (
        <>
          {/* Platform Type Tabs */}
          {availablePlatformTabs.length > 2 && (
            <div
              className="flex gap-1.5 md:gap-2 mb-4 md:mb-8 overflow-x-auto md:overflow-x-visible md:flex-wrap scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 pb-1"
              role="tablist"
              aria-label="Platform type filter"
            >
              {availablePlatformTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setPlatformTab(tab.key)}
                  role="tab"
                  aria-selected={platformTab === tab.key}
                  className={`whitespace-nowrap shrink-0 px-3.5 md:px-5 py-2 md:py-2.5 min-h-[44px] rounded-full text-xs md:text-sm font-semibold transition-all duration-200 flex items-center gap-1.5 ${
                    platformTab === tab.key
                      ? "bg-slate-900 text-white shadow-md"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:shadow-sm"
                  }`}
                >
                  <span className="text-sm md:text-base">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          <p className="text-xs md:text-sm text-slate-500 mb-3 md:mb-4">
            {filteredBrokers.length} platform{filteredBrokers.length !== 1 ? "s" : ""} reviewed
          </p>

          {filteredBrokers.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-6">
              {filteredBrokers.map((broker) => (
                <BrokerReviewCard key={broker.id} broker={broker} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 md:py-12 text-slate-500">
              <p className="text-sm md:text-lg font-medium mb-1">No platforms in this category yet</p>
              <p className="text-xs md:text-sm">Check back soon — we&apos;re adding more reviews regularly.</p>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Advisor Type Tabs */}
          {availableAdvisorTabs.length > 2 && (
            <div
              className="flex gap-1.5 md:gap-2 mb-4 md:mb-8 overflow-x-auto md:overflow-x-visible md:flex-wrap scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0 pb-1"
              role="tablist"
              aria-label="Advisor type filter"
            >
              {availableAdvisorTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setAdvisorTab(tab.key)}
                  role="tab"
                  aria-selected={advisorTab === tab.key}
                  className={`whitespace-nowrap shrink-0 px-3.5 md:px-5 py-2 md:py-2.5 min-h-[44px] rounded-full text-xs md:text-sm font-semibold transition-all duration-200 ${
                    advisorTab === tab.key
                      ? "bg-violet-600 text-white shadow-md"
                      : "bg-violet-50 text-violet-700 hover:bg-violet-100 hover:shadow-sm"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          <p className="text-xs md:text-sm text-slate-500 mb-3 md:mb-4">
            {filteredAdvisors.length} advisor{filteredAdvisors.length !== 1 ? "s" : ""} reviewed
          </p>

          {filteredAdvisors.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 md:gap-4">
              {filteredAdvisors.map((advisor) => (
                <AdvisorReviewCard key={advisor.id} advisor={advisor} />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 md:py-12 text-slate-500">
              <p className="text-sm md:text-lg font-medium mb-1">No advisors in this category yet</p>
              <p className="text-xs md:text-sm">Check back soon — we&apos;re adding more reviews regularly.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function AdvisorReviewCard({ advisor }: { advisor: Professional }) {
  const typeLabel = PROFESSIONAL_TYPE_LABELS[advisor.type] || advisor.type.replace(/_/g, " ");

  return (
    <Link
      href={`/advisor/${advisor.slug}`}
      className="border border-slate-200 rounded-xl overflow-hidden hover:shadow-lg hover:scale-[1.01] transition-all flex flex-col bg-white"
    >
      <div className="p-4 md:p-5 flex-1">
        {/* Header with photo */}
        <div className="flex items-center gap-3 mb-3">
          <Image
            src={advisor.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(advisor.name)}&size=80&background=7c3aed&color=fff`}
            alt={advisor.name}
            width={48}
            height={48}
            className="rounded-full shrink-0 w-12 h-12 object-cover"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="text-sm md:text-base font-bold leading-tight truncate">{advisor.name}</h2>
              {advisor.verified && (
                <svg className="w-4 h-4 text-violet-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
              )}
            </div>
            {advisor.rating > 0 && (
              <div className="text-xs text-amber-500">
                {"★".repeat(Math.floor(advisor.rating))}
                <span className="text-slate-400 ml-1 text-[0.69rem]">{advisor.rating}/5</span>
                {advisor.review_count > 0 && (
                  <span className="text-slate-400 ml-1 text-[0.62rem]">({advisor.review_count})</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Type badge */}
        <div className="mb-2">
          <span className="text-[0.62rem] md:text-[0.69rem] font-semibold px-1.5 md:px-2 py-0.5 rounded-full bg-violet-50 text-violet-700">
            {typeLabel}
          </span>
        </div>

        {/* Firm & location */}
        {advisor.firm_name && (
          <p className="text-xs text-slate-600 mb-1 truncate">{advisor.firm_name}</p>
        )}
        {advisor.location_display && (
          <p className="text-[0.69rem] text-slate-400">{advisor.location_display}</p>
        )}

        {/* Fee info */}
        {advisor.fee_description && (
          <p className="text-[0.65rem] text-slate-500 mt-2 line-clamp-1">{advisor.fee_description}</p>
        )}

        {/* Specialties */}
        {advisor.specialties && advisor.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {(advisor.specialties as string[]).slice(0, 3).map((s) => (
              <span key={s} className="text-[0.58rem] md:text-[0.62rem] px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded">
                {s}
              </span>
            ))}
            {(advisor.specialties as string[]).length > 3 && (
              <span className="text-[0.58rem] text-slate-400">+{(advisor.specialties as string[]).length - 3}</span>
            )}
          </div>
        )}

        {/* Offer badge */}
        {advisor.offer_active && advisor.offer_text && (
          <div className="mt-2 bg-violet-50 border border-violet-100 rounded-lg px-2.5 py-1.5 flex items-center gap-1.5">
            <span className="text-violet-500 shrink-0 text-[0.62rem]">★</span>
            <span className="text-[0.58rem] md:text-[0.62rem] font-bold text-violet-700 truncate">{advisor.offer_text}</span>
          </div>
        )}
      </div>

      {/* Footer CTA */}
      <div className="px-4 md:px-5 py-2.5 md:py-3 bg-violet-50 border-t border-violet-100 text-center mt-auto">
        <span className="text-xs md:text-sm font-semibold text-violet-700">View Profile →</span>
      </div>
    </Link>
  );
}

function BrokerReviewCard({ broker }: { broker: Broker }) {
  const platformLabel = getPlatformLabel(broker.platform_type);

  return (
    <Link
      href={`/broker/${broker.slug}`}
      className="border border-slate-200 rounded-xl overflow-hidden hover-lift hover:scale-[1.02] transition-all flex flex-col"
    >
      <div className="p-3 md:p-5 flex-1">
        <div className="flex items-center gap-2 md:gap-3 mb-2 md:mb-3">
          <BrokerLogo broker={broker} size="md" />
          <div className="flex-1 min-w-0">
            <h2 className="text-sm md:text-lg font-bold leading-tight truncate">{broker.name}</h2>
            <div className="text-xs text-amber">
              {"★".repeat(Math.floor(broker.rating || 0))}
              <span className="text-slate-400 ml-1 text-[0.69rem]">{broker.rating}/5</span>
            </div>
          </div>
        </div>

        <div className="mb-2 md:mb-3">
          <span className={`text-[0.62rem] md:text-[0.69rem] font-semibold px-1.5 md:px-2 py-0.5 rounded-full ${getPlatformColor(broker.platform_type)}`}>
            {platformLabel}
          </span>
        </div>

        {broker.tagline && (
          <p className="hidden md:block text-sm text-slate-600 mb-3 line-clamp-2">{broker.tagline}</p>
        )}

        <div className="space-y-1 md:space-y-2 text-xs md:text-sm">
          <div className="flex justify-between">
            <span className="text-slate-400 md:text-slate-500">ASX Fee</span>
            <span className="font-semibold">{broker.asx_fee || "N/A"}</span>
          </div>
          {broker.platform_type !== "research_tool" && (
            <div className="flex justify-between">
              <span className="text-slate-400 md:text-slate-500">FX Rate</span>
              <span className="font-semibold">{broker.fx_rate != null ? `${broker.fx_rate}%` : "N/A"}</span>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-1 md:gap-2 mt-2 md:mt-3">
          {broker.chess_sponsored && (
            <span className="px-1.5 md:px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[0.62rem] md:text-[0.69rem] rounded border border-emerald-200 font-semibold">CHESS</span>
          )}
          {broker.smsf_support && (
            <span className="px-1.5 md:px-2 py-0.5 bg-blue-50 text-blue-700 text-[0.62rem] md:text-[0.69rem] rounded border border-blue-200 font-semibold">SMSF</span>
          )}
          {broker.deal && (
            <span className="px-1.5 md:px-2 py-0.5 bg-amber-50 text-amber-700 text-[0.62rem] md:text-[0.69rem] rounded border border-amber-200 font-semibold">Deal</span>
          )}
        </div>
      </div>

      <div className="px-3 md:px-5 py-2 md:py-3 bg-slate-50 border-t border-slate-200 text-center mt-auto">
        <span className="text-xs md:text-sm font-semibold text-slate-700">Read Review →</span>
      </div>
    </Link>
  );
}

function getPlatformLabel(type: PlatformType): string {
  const labels: Record<PlatformType, string> = {
    share_broker: "Share Broker",
    crypto_exchange: "Crypto Exchange",
    robo_advisor: "Robo-Advisor",
    research_tool: "Research Tool",
    super_fund: "Super Fund",
    property_platform: "Property Platform",
    cfd_forex: "CFD & Forex",
    savings_account: "Savings Account",
    term_deposit: "Term Deposit",
  };
  return labels[type] || type;
}

function getPlatformColor(type: PlatformType): string {
  const colors: Record<PlatformType, string> = {
    share_broker: "bg-blue-50 text-blue-700",
    crypto_exchange: "bg-orange-50 text-orange-700",
    robo_advisor: "bg-violet-50 text-violet-700",
    research_tool: "bg-cyan-50 text-cyan-700",
    super_fund: "bg-emerald-50 text-emerald-700",
    property_platform: "bg-lime-50 text-lime-700",
    cfd_forex: "bg-rose-50 text-rose-700",
    savings_account: "bg-teal-50 text-teal-700",
    term_deposit: "bg-amber-50 text-amber-700",
  };
  return colors[type] || "bg-slate-50 text-slate-700";
}
