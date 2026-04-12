"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import SocialProofCounter from "@/components/SocialProofCounter";
import AdvisorMatchCTA from "@/components/AdvisorMatchCTA";
import { trackClick, getAffiliateLink, AFFILIATE_REL } from "@/lib/tracking";
import type { Broker } from "@/lib/types";

type Tab = "savings" | "term_deposit";
type SortField = "rate" | "name" | "rating" | "min_deposit";
type SortDirection = "asc" | "desc";

type Provider = Pick<
  Broker,
  | "id"
  | "slug"
  | "name"
  | "platform_type"
  | "asx_fee"
  | "rating"
  | "affiliate_url"
  | "color"
  | "icon"
  | "logo_url"
  | "min_deposit"
>;

/* ─── Helpers ─── */

function parseRate(asx_fee: string | undefined): number {
  if (!asx_fee) return 0;
  const match = asx_fee.match(/([\d.]+)\s*%/);
  if (match) return parseFloat(match[1]);
  const num = parseFloat(asx_fee);
  return isNaN(num) ? 0 : num;
}

function parseMinDeposit(min_deposit: string | undefined): number {
  if (!min_deposit) return 0;
  const cleaned = min_deposit.replace(/[$,]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function formatRate(asx_fee: string | undefined): string {
  const rate = parseRate(asx_fee);
  if (rate === 0 && !asx_fee) return "—";
  return rate.toFixed(2) + "% p.a.";
}

function formatMinDeposit(min_deposit: string | undefined): string {
  if (!min_deposit) return "$0";
  const num = parseMinDeposit(min_deposit);
  if (num === 0) return "$0";
  if (num >= 1000) return "$" + num.toLocaleString("en-AU");
  return "$" + num;
}

function renderStarsSvg(rating: number) {
  const stars = [];
  const full = Math.floor(rating);
  const half = rating % 1 >= 0.5;
  for (let i = 0; i < 5; i++) {
    if (i < full) {
      stars.push(
        <span key={i} className="text-amber-400">
          ★
        </span>
      );
    } else if (i === full && half) {
      stars.push(
        <span key={i} className="text-amber-400">
          ½
        </span>
      );
    } else {
      stars.push(
        <span key={i} className="text-slate-300">
          ☆
        </span>
      );
    }
  }
  return <span className="inline-flex gap-0.5 text-sm">{stars}</span>;
}

const DEFAULT_SORT: Record<SortField, SortDirection> = {
  rate: "desc",
  name: "asc",
  rating: "desc",
  min_deposit: "asc",
};

/* ─── Component ─── */

interface RateBoardClientProps {
  savingsAccounts: Provider[];
  termDeposits: Provider[];
}

export default function RateBoardClient({
  savingsAccounts,
  termDeposits,
}: RateBoardClientProps) {
  const [activeTab, setActiveTab] = useState<Tab>("savings");
  const [sortField, setSortField] = useState<SortField>("rate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  const data = activeTab === "savings" ? savingsAccounts : termDeposits;

  const sorted = useMemo(() => {
    const arr = [...data];
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "rate":
          cmp = parseRate(a.asx_fee) - parseRate(b.asx_fee);
          break;
        case "name":
          cmp = (a.name || "").localeCompare(b.name || "");
          break;
        case "rating":
          cmp = (a.rating || 0) - (b.rating || 0);
          break;
        case "min_deposit":
          cmp = parseMinDeposit(a.min_deposit) - parseMinDeposit(b.min_deposit);
          break;
      }
      return sortDirection === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [data, sortField, sortDirection]);

  function handleSort(field: SortField) {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection(DEFAULT_SORT[field]);
    }
  }

  function handleTabChange(tab: Tab) {
    setActiveTab(tab);
    setSortField("rate");
    setSortDirection("desc");
  }

  const sortArrow = (field: SortField) => {
    if (sortField !== field) return <span className="text-slate-300 ml-1">↕</span>;
    return (
      <span className="text-slate-700 ml-1">
        {sortDirection === "asc" ? "↑" : "↓"}
      </span>
    );
  };

  const lastUpdated = new Date().toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <>
      {/* Hero */}
      <div className="bg-gradient-to-br from-sky-600 to-sky-800 text-white">
        <div className="container-custom py-10 md:py-16 text-center">
          <h1 className="text-2xl md:text-4xl font-extrabold mb-2 md:mb-3">
            Australian Savings &amp; Term Deposit Rates
          </h1>
          <p className="text-sky-100 text-sm md:text-lg max-w-xl mx-auto">
            Every rate, compared. Updated daily.
          </p>
          <div className="mt-4">
            <SocialProofCounter variant="badge" />
          </div>
        </div>
      </div>

      <div className="py-6 md:py-12">
        <div className="container-custom max-w-5xl">
          {/* Breadcrumb */}
          <nav className="text-xs md:text-sm text-slate-500 mb-4 md:mb-6">
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <span className="mx-1.5 md:mx-2">/</span>
            <span className="text-slate-700">Rates</span>
          </nav>

          {/* Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => handleTabChange("savings")}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
                activeTab === "savings"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Savings Accounts
              <span className="ml-1.5 text-xs opacity-70">
                ({savingsAccounts.length})
              </span>
            </button>
            <button
              onClick={() => handleTabChange("term_deposit")}
              className={`px-4 py-2 text-sm font-bold rounded-lg transition-colors ${
                activeTab === "term_deposit"
                  ? "bg-slate-900 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              Term Deposits
              <span className="ml-1.5 text-xs opacity-70">
                ({termDeposits.length})
              </span>
            </button>
          </div>

          {/* Table */}
          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-3 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider w-12">
                      #
                    </th>
                    <th
                      className="px-3 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-900 select-none"
                      onClick={() => handleSort("name")}
                    >
                      Provider{sortArrow("name")}
                    </th>
                    <th
                      className="px-3 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-900 select-none text-right"
                      onClick={() => handleSort("rate")}
                    >
                      Rate{sortArrow("rate")}
                    </th>
                    <th
                      className="px-3 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-900 select-none text-right hidden md:table-cell"
                      onClick={() => handleSort("min_deposit")}
                    >
                      Min Deposit{sortArrow("min_deposit")}
                    </th>
                    <th
                      className="px-3 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-900 select-none text-center hidden md:table-cell"
                      onClick={() => handleSort("rating")}
                    >
                      Rating{sortArrow("rating")}
                    </th>
                    <th className="px-3 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-3 py-10 text-center text-slate-400"
                      >
                        No{" "}
                        {activeTab === "savings"
                          ? "savings accounts"
                          : "term deposits"}{" "}
                        found.
                      </td>
                    </tr>
                  )}
                  {sorted.map((provider, idx) => {
                    const isTop3 = idx < 3;
                    const href = getAffiliateLink(provider as Broker);
                    const isExternal = !!provider.affiliate_url;

                    return (
                      <tr
                        key={provider.id}
                        className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${
                          isTop3 ? "bg-emerald-50/40" : ""
                        }`}
                      >
                        {/* Rank */}
                        <td className="px-3 py-3">
                          <span
                            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                              isTop3
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {idx + 1}
                          </span>
                        </td>

                        {/* Provider */}
                        <td className="px-3 py-3">
                          <Link
                            href={`/broker/${provider.slug}`}
                            className="flex items-center gap-2.5 group"
                          >
                            {provider.logo_url ? (
                              <Image
                                src={provider.logo_url}
                                alt={provider.name}
                                width={32}
                                height={32}
                                className="w-8 h-8 rounded-md object-contain"
                              />
                            ) : (
                              <div
                                className="w-8 h-8 rounded-md flex items-center justify-center text-white text-xs font-bold shrink-0"
                                style={{
                                  backgroundColor: provider.color || "#475569",
                                }}
                              >
                                {provider.name?.charAt(0) || "?"}
                              </div>
                            )}
                            <span className="font-semibold text-slate-900 group-hover:text-sky-700 transition-colors">
                              {provider.name}
                            </span>
                          </Link>
                        </td>

                        {/* Rate */}
                        <td className="px-3 py-3 text-right">
                          <span className="font-extrabold text-slate-900">
                            {formatRate(provider.asx_fee)}
                          </span>
                        </td>

                        {/* Min Deposit */}
                        <td className="px-3 py-3 text-right hidden md:table-cell text-slate-600">
                          {formatMinDeposit(provider.min_deposit)}
                        </td>

                        {/* Rating */}
                        <td className="px-3 py-3 text-center hidden md:table-cell">
                          {provider.rating
                            ? renderStarsSvg(provider.rating)
                            : <span className="text-slate-300">—</span>}
                        </td>

                        {/* Action */}
                        <td className="px-3 py-3 text-right">
                          <a
                            href={href}
                            onClick={() =>
                              trackClick(
                                provider.slug,
                                provider.name,
                                "rate_board",
                                "/rates",
                                undefined,
                                undefined,
                                "rate_table"
                              )
                            }
                            {...(isExternal
                              ? {
                                  target: "_blank",
                                  rel: AFFILIATE_REL,
                                }
                              : {})}
                            className="inline-block px-3 py-1.5 bg-sky-600 text-white text-xs font-bold rounded-lg hover:bg-sky-700 transition-colors whitespace-nowrap"
                          >
                            {isExternal ? "Visit Site →" : "View Details →"}
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Last updated */}
            <div className="px-4 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <p className="text-[0.62rem] md:text-xs text-slate-400">
                Last updated: {lastUpdated}
              </p>
              <p className="text-[0.62rem] md:text-xs text-slate-400">
                {sorted.length}{" "}
                {activeTab === "savings" ? "savings accounts" : "term deposits"}
              </p>
            </div>
          </div>

          {/* Advisor CTA */}
          <div className="mt-8">
            <AdvisorMatchCTA
              needKey="planning"
              headline="Want help structuring your cash?"
              description="A financial planner can help allocate across savings, term deposits, and investments to maximise your after-tax returns."
            />
          </div>

          {/* SEO Content */}
          <section className="mt-10 md:mt-14 prose prose-slate max-w-none">
            <h2 className="text-lg md:text-2xl font-extrabold text-slate-900">
              Savings &amp; Term Deposit Rates in Australia
            </h2>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed">
              Australian savers have access to a wide range of savings accounts
              and term deposits from banks, credit unions, and neobanks. Interest
              rates can vary significantly between providers, making comparison
              essential for maximising returns on your cash holdings.
            </p>
            <h3 className="text-base md:text-lg font-extrabold text-slate-900 mt-6">
              Savings accounts vs term deposits
            </h3>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed">
              <strong>Savings accounts</strong> offer flexible access to your
              funds with variable interest rates that can change at any time.
              Many providers offer bonus rates for meeting conditions such as
              depositing a minimum amount each month or making no withdrawals.
            </p>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed">
              <strong>Term deposits</strong> lock your money away for a fixed
              period — typically 1 to 60 months — in exchange for a guaranteed
              interest rate. They&apos;re ideal for savers who don&apos;t need
              immediate access and want certainty on their returns.
            </p>
            <h3 className="text-base md:text-lg font-extrabold text-slate-900 mt-6">
              How we source rates
            </h3>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed">
              We verify every rate against official provider pricing pages and
              product disclosure statements. Our data is refreshed daily to
              ensure you see the most current rates available. All rates shown
              are for personal customers and are subject to change by the
              provider.
            </p>
            <h3 className="text-base md:text-lg font-extrabold text-slate-900 mt-6">
              Tips for choosing the right account
            </h3>
            <ul className="text-sm md:text-base text-slate-600 space-y-2">
              <li>
                Compare the <strong>total effective rate</strong>, not just the
                headline rate — bonus conditions can be hard to maintain.
              </li>
              <li>
                Check the <strong>minimum deposit</strong> requirement to ensure
                you qualify for the advertised rate.
              </li>
              <li>
                Consider <strong>government guarantees</strong> — deposits up to
                $250,000 per ADI are protected under the Financial Claims Scheme.
              </li>
              <li>
                For term deposits, compare <strong>early withdrawal penalties</strong>{" "}
                in case you need access to your funds before maturity.
              </li>
              <li>
                Factor in <strong>tax implications</strong> — interest income is
                taxable at your marginal rate. A financial planner can help
                structure your cash allocation to minimise tax.
              </li>
            </ul>
          </section>

          {/* Disclosure */}
          <div className="mt-8 text-[0.62rem] md:text-xs text-slate-400 text-center">
            <p>
              Rates are sourced from official provider websites and may change
              without notice. This page is for general comparison purposes only
              and does not constitute financial advice.{" "}
              <Link
                href="/how-we-verify"
                className="underline hover:text-slate-900"
              >
                Our methodology
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
