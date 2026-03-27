"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import type { Broker } from "@/lib/types";
import { getAffiliateLink, getBenefitCta, renderStars, AFFILIATE_REL } from "@/lib/tracking";
import { isSponsored } from "@/lib/sponsorship";
import BrokerCard from "@/components/BrokerCard";
import BrokerLogo from "@/components/BrokerLogo";
import ScrollReveal from "@/components/ScrollReveal";
import SponsorBadge from "@/components/SponsorBadge";
import JargonTooltip from "@/components/JargonTooltip";
import CompactDisclaimerLine from "@/components/CompactDisclaimerLine";

type ColumnDef = {
  label: string;
  jargon?: boolean;
  render: (b: Broker) => React.ReactNode;
  align?: "left" | "center";
};

function getColumns(slug: string): ColumnDef[] {
  if (slug === "crypto") {
    return [
      { label: "Trading Fee", render: (b) => b.asx_fee || "Varies" },
      { label: "Deposit", render: (b) => b.min_deposit || "Free" },
      {
        label: "AUSTRAC",
        align: "center",
        render: () => <span className="text-emerald-600 font-semibold">&#10003;</span>,
      },
      {
        label: "Rating",
        align: "center",
        render: (b) => (
          <>
            <span className="text-amber">{renderStars(b.rating || 0)}</span>
            <span className="text-sm text-slate-500 ml-1">{b.rating}</span>
          </>
        ),
      },
    ];
  }

  if (slug === "savings") {
    return [
      { label: "Interest Rate", render: (b) => b.asx_fee || "Varies" },
      { label: "Min Deposit", render: (b) => b.min_deposit || "$0" },
      {
        label: "Gov. Guaranteed",
        align: "center",
        render: () => <span className="text-emerald-600 font-semibold">&#10003;</span>,
      },
      {
        label: "Rating",
        align: "center",
        render: (b) => (
          <>
            <span className="text-amber">{renderStars(b.rating || 0)}</span>
            <span className="text-sm text-slate-500 ml-1">{b.rating}</span>
          </>
        ),
      },
    ];
  }

  if (slug === "super") {
    return [
      { label: "Admin Fee", render: (b) => b.asx_fee || "Varies" },
      {
        label: "APRA Regulated",
        align: "center",
        render: () => <span className="text-emerald-600 font-semibold">&#10003;</span>,
      },
      {
        label: "Insurance",
        align: "center",
        render: () => <span className="text-emerald-600 font-semibold">&#10003;</span>,
      },
      {
        label: "Rating",
        align: "center",
        render: (b) => (
          <>
            <span className="text-amber">{renderStars(b.rating || 0)}</span>
            <span className="text-sm text-slate-500 ml-1">{b.rating}</span>
          </>
        ),
      },
    ];
  }

  if (slug === "cfd") {
    return [
      { label: "Spread (EUR/USD)", render: (b) => b.asx_fee || "Varies" },
      { label: "US Fee", render: (b) => b.us_fee || "N/A" },
      {
        label: "ASIC",
        align: "center",
        render: () => <span className="text-emerald-600 font-semibold">&#10003;</span>,
      },
      {
        label: "Rating",
        align: "center",
        render: (b) => (
          <>
            <span className="text-amber">{renderStars(b.rating || 0)}</span>
            <span className="text-sm text-slate-500 ml-1">{b.rating}</span>
          </>
        ),
      },
    ];
  }

  // Default: share-trading
  return [
    { label: "ASX Fee", jargon: true, render: (b) => b.asx_fee || "N/A" },
    { label: "US Fee", jargon: true, render: (b) => b.us_fee || "N/A" },
    {
      label: "FX Rate",
      jargon: true,
      render: (b) => (b.fx_rate != null ? `${b.fx_rate}%` : "N/A"),
    },
    {
      label: "CHESS",
      jargon: true,
      align: "center",
      render: (b) => (
        <span className={b.chess_sponsored ? "text-emerald-600 font-semibold" : "text-red-500"}>
          {b.chess_sponsored ? "✓" : "✗"}
        </span>
      ),
    },
    {
      label: "Rating",
      align: "center",
      render: (b) => (
        <>
          <span className="text-amber">{renderStars(b.rating || 0)}</span>
          <span className="text-sm text-slate-500 ml-1">{b.rating}</span>
        </>
      ),
    },
  ];
}

interface Props {
  brokers: Broker[];
  slug: string;
  color: { bg: string; border: string; text: string; accent: string; gradient: string };
}

export default function VerticalBrokerTable({ brokers, slug, color }: Props) {
  const [query, setQuery] = useState("");
  const columns = getColumns(slug);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return brokers;
    return brokers.filter((b) => b.name.toLowerCase().includes(q));
  }, [brokers, query]);

  return (
    <div>
      {/* ─── Search ─── */}
      <div className="mb-4">
        <div className="relative max-w-xs">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z"
            />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search platforms…"
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-300 bg-white"
          />
        </div>
        {query && (
          <p className="text-xs text-slate-500 mt-1.5">
            {filtered.length === 0
              ? "No platforms match your search"
              : `${filtered.length} of ${brokers.length} platforms`}
          </p>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto mb-8">
        <ScrollReveal
          animation="table-row-stagger"
          as="table"
          className="w-full border border-slate-200 rounded-lg"
        >
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-sm">#</th>
              <th className="px-4 py-3 text-left font-semibold text-sm">Platform</th>
              {columns.map((col, i) => (
                <th
                  key={i}
                  className={`px-4 py-3 font-semibold text-sm ${
                    col.align === "center" ? "text-center" : "text-left"
                  }`}
                >
                  {col.jargon ? <JargonTooltip term={col.label} /> : col.label}
                </th>
              ))}
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={3 + columns.length}
                  className="px-4 py-8 text-center text-sm text-slate-400"
                >
                  No platforms match &ldquo;{query}&rdquo;
                </td>
              </tr>
            ) : (
              filtered.map((broker, i) => (
                <tr
                  key={broker.id}
                  className={`hover:bg-slate-50 ${i === 0 && !query ? `${color.bg}/40` : ""}`}
                >
                  <td className="px-4 py-3 text-sm font-semibold text-slate-400">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <BrokerLogo broker={broker} size="sm" />
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link
                            href={`/broker/${broker.slug}`}
                            className="font-semibold text-brand hover:text-slate-900 transition-colors"
                          >
                            {broker.name}
                          </Link>
                          {isSponsored(broker) && <SponsorBadge broker={broker} />}
                        </div>
                        {i === 0 && !query && (
                          <div className={`text-[0.69rem] font-extrabold ${color.text} uppercase tracking-wide`}>
                            Top Pick
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  {columns.map((col, ci) => (
                    <td
                      key={ci}
                      className={`px-4 py-3 text-sm ${col.align === "center" ? "text-center" : ""}`}
                    >
                      {col.render(broker)}
                    </td>
                  ))}
                  <td className="px-4 py-3 text-center">
                    <a
                      href={getAffiliateLink(broker)}
                      target="_blank"
                      rel={AFFILIATE_REL}
                      className={`inline-block px-4 py-2 ${color.accent} text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-colors`}
                    >
                      {getBenefitCta(broker, "compare")}
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </ScrollReveal>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-2 mb-6">
        {filtered.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">
            No platforms match &ldquo;{query}&rdquo;
          </p>
        ) : (
          filtered.map((broker, i) => (
            <BrokerCard
              key={broker.id}
              broker={broker}
              badge={i === 0 && !query ? "Top Pick" : undefined}
              context="compare"
            />
          ))
        )}
      </div>
      <CompactDisclaimerLine />
    </div>
  );
}
