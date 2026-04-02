"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Icon from "@/components/Icon";
import ListingCard, { type InvestmentListing } from "@/components/ListingCard";
import SectionHeading from "@/components/SectionHeading";

const TABS = [
  { value: "all", label: "All Funds" },
  { value: "siv", label: "SIV Complying" },
  { value: "mining", label: "Mining Funds" },
  { value: "agricultural", label: "Agricultural Funds" },
  { value: "property", label: "Property Funds" },
  { value: "infrastructure", label: "Infrastructure Funds" },
];

interface Props {
  listings: InvestmentListing[];
}

export default function FundsPageClient({ listings }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") ?? "all";

  function setTab(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete("tab");
    } else {
      params.set("tab", value);
    }
    router.push(`?${params.toString()}`, { scroll: false });
  }

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      if (activeTab === "siv") return l.siv_complying;
      if (activeTab === "mining") return l.industry === "mining" || l.sub_category === "mining";
      if (activeTab === "agricultural") return l.industry === "agricultural" || l.industry === "agriculture" || l.sub_category === "agricultural";
      if (activeTab === "property") return l.industry === "property" || l.industry === "real_estate" || l.sub_category === "property";
      if (activeTab === "infrastructure") return l.industry === "infrastructure" || l.sub_category === "infrastructure";
      return true;
    });
  }, [listings, activeTab]);

  const sivFunds = listings.filter((l) => l.siv_complying);

  return (
    <div>
      {/* Hero */}
      <section className="bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-900 text-white py-14 md:py-20">
        <div className="container-custom">
          <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-6" aria-label="Breadcrumb">
            <Link href="/" className="hover:text-white transition-colors">Home</Link>
            <Icon name="chevron-right" size={12} className="text-slate-600" />
            <Link href="/invest" className="hover:text-white transition-colors">Invest</Link>
            <Icon name="chevron-right" size={12} className="text-slate-600" />
            <span className="text-slate-300">Investment Funds</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2 mb-4">
            <span className="text-xs font-semibold bg-amber-500 text-slate-900 px-3 py-1 rounded-full">
              Updated 2026
            </span>
            {sivFunds.length > 0 && (
              <span className="text-xs font-semibold bg-purple-600 text-white px-3 py-1 rounded-full">
                {sivFunds.length} SIV Complying
              </span>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-4 max-w-3xl">
            Australian Investment Fund Directory
          </h1>
          <p className="text-lg text-slate-300 leading-relaxed max-w-2xl mb-6">
            ASIC-regulated investment funds across mining, agriculture, property, and infrastructure — including SIV-complying funds for Significant Investor Visa applicants.
          </p>

          {sivFunds.length > 0 && (
            <button
              onClick={() => setTab("siv")}
              className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm px-6 py-3 rounded-xl transition-colors"
            >
              Browse SIV Complying Funds
              <Icon name="arrow-right" size={16} />
            </button>
          )}
        </div>
      </section>

      {/* SIV highlight (if funds exist) */}
      {sivFunds.length > 0 && (
        <section className="py-10 bg-purple-50 border-b border-purple-100">
          <div className="container-custom">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6 bg-white border border-purple-200 rounded-xl p-6">
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center shrink-0">
                <Icon name="star" size={24} className="text-purple-600" />
              </div>
              <div className="flex-1">
                <h2 className="font-bold text-slate-900 mb-1">Significant Investor Visa (SIV) — Complying Funds</h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  The Significant Investor Visa (Subclass 188C) requires $5M invested in complying investments. At least $1M must be in an approved Australian venture capital or growth private equity fund, and at least $1.5M in emerging companies. The remaining $2.5M can be in complying managed funds including the funds listed below.
                </p>
                <Link href="/foreign-investment" className="inline-flex items-center gap-1 text-purple-700 font-semibold text-xs mt-2 hover:text-purple-900">
                  SIV complete guide <Icon name="arrow-right" size={11} />
                </Link>
              </div>
              <div className="shrink-0">
                <button
                  onClick={() => setTab("siv")}
                  className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
                >
                  {sivFunds.length} SIV Funds
                  <Icon name="arrow-right" size={14} />
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* What is this */}
      <section className="py-10 bg-indigo-50 border-b border-indigo-100">
        <div className="container-custom">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { value: "$5M", label: "SIV minimum investment" },
              { value: "4 yrs", label: "Provisional visa period" },
              { value: "ASIC", label: "Fund regulation" },
              { value: "$1M+", label: "VC fund component" },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-indigo-100 rounded-xl p-4 text-center">
                <p className="text-2xl font-extrabold text-indigo-700">{s.value}</p>
                <p className="text-xs text-slate-600 mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tabs + Grid */}
      <section className="py-10 bg-slate-50">
        <div className="container-custom">
          {/* Tab bar */}
          <div className="flex flex-wrap gap-2 mb-8">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => setTab(tab.value)}
                className={`text-sm font-semibold px-4 py-2 rounded-lg border transition-colors ${
                  activeTab === tab.value
                    ? "bg-indigo-700 text-white border-indigo-700"
                    : "bg-white text-slate-600 border-slate-200 hover:border-indigo-400"
                }`}
              >
                {tab.label}
                {tab.value === "siv" && sivFunds.length > 0 && (
                  <span className="ml-1.5 bg-purple-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                    {sivFunds.length}
                  </span>
                )}
              </button>
            ))}
            <span className="ml-auto text-sm text-slate-500 self-center">{filtered.length} fund{filtered.length !== 1 ? "s" : ""}</span>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                <Icon name="search" size={28} className="text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">No funds found</h3>
              <p className="text-slate-500 text-sm mb-6">
                {activeTab === "siv"
                  ? "No SIV-complying funds are currently listed. Check back soon."
                  : "Try a different category, or check back soon as new funds are listed regularly."}
              </p>
              <button
                onClick={() => setTab("all")}
                className="bg-amber-500 hover:bg-amber-400 text-slate-900 font-semibold text-sm px-6 py-2.5 rounded-lg transition-colors"
              >
                Show all funds
              </button>
            </div>
          ) : (
            <>
              <SectionHeading
                eyebrow={activeTab === "siv" ? "SIV Complying Funds" : "Active funds"}
                title={`${filtered.length} Fund${filtered.length !== 1 ? "s" : ""}${activeTab === "siv" ? " — SIV Complying" : ""}`}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {filtered.map((listing) => (
                  <ListingCard key={listing.id} listing={listing} vertical="fund" />
                ))}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Education section */}
      <section className="py-14 bg-white">
        <div className="container-custom max-w-4xl">
          <SectionHeading
            eyebrow="SIV guide"
            title="Understanding SIV-Complying Investments"
          />
          <div className="prose prose-slate max-w-none">
            <p>
              The Significant Investor Visa (Subclass 188C) is a pathway to permanent Australian residency for high net worth individuals investing $5M in complying investments. The SIV investment framework (as of 2024) requires:
            </p>
            <ul>
              <li><strong>At least $1M</strong> in AFOF (Approved Australian Venture Capital or Growth Private Equity Fund)</li>
              <li><strong>At least $1.5M</strong> in emerging company managed funds or directly in emerging companies</li>
              <li><strong>At least $2.5M</strong> in complying managed funds and/or AFOF/emerging companies</li>
            </ul>
            <p>
              Complying managed funds must be ASIC-regulated, based in Australia, and invest predominantly in Australian assets. The specific fund requirements are set by the Department of Home Affairs and can change — always verify with a registered migration agent.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 bg-white border-t border-slate-100">
        <div className="container-custom text-center">
          <h2 className="text-xl font-extrabold text-slate-900 mb-2">List Your Fund</h2>
          <p className="text-slate-500 text-sm mb-6 max-w-md mx-auto">
            Fund managers can list their investment funds on Invest.com.au including SIV-complying status.
          </p>
          <Link
            href="/invest/list"
            className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold px-6 py-3 rounded-xl transition-colors"
          >
            List Your Fund
            <Icon name="arrow-right" size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
