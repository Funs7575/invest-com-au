"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import { TIERS } from "@/lib/advisor-tiers";

// ─── Comparison table rows ─────────────────────────────────────────────────

interface FeatureRow {
  label: string;
  cells: (string | boolean)[];
}

const FEATURE_ROWS: FeatureRow[] = [
  {
    label: "Monthly platform fee",
    cells: ["Free", "$49/mo", "$149/mo", "$499/mo"],
  },
  {
    label: "Annual platform fee",
    cells: ["Free", "$470/yr", "$1,430/yr", "$4,790/yr"],
  },
  {
    label: "Lead discount",
    cells: ["Standard", "10% off", "20% off", "30% off"],
  },
  {
    label: "Leads per month",
    cells: ["Up to 15", "Up to 60", "Uncapped", "Uncapped"],
  },
  {
    label: "Directory listing + AFSL badge",
    cells: [true, true, true, true],
  },
  {
    label: "Advisor dashboard + analytics",
    cells: [true, true, true, true],
  },
  {
    label: "Weekly performance email",
    cells: [true, true, true, true],
  },
  {
    label: "Priority search placement",
    cells: [false, true, true, true],
  },
  {
    label: "Health scorecard + coaching tips",
    cells: [false, true, true, true],
  },
  {
    label: "Prominent ranker boost (+12)",
    cells: [false, false, true, true],
  },
  {
    label: "Pinned video on profile",
    cells: [false, false, true, true],
  },
  {
    label: "Lead dispute fast-track",
    cells: [false, false, true, true],
  },
  {
    label: "Featured badge + top placement",
    cells: [false, false, false, true],
  },
  {
    label: "Exclusive high-value lead routing",
    cells: [false, false, false, true],
  },
  {
    label: "Custom onboarding + strategy calls",
    cells: [false, false, false, true],
  },
  {
    label: "White-glove support",
    cells: [false, false, false, true],
  },
];

const FAQS = [
  {
    q: "How does pay-per-lead pricing work?",
    a: "You are only charged when you receive a qualified lead — someone who has completed our matching quiz and expressed intent to speak with an advisor. Higher tiers receive a discount on every lead: Growth saves 10%, Pro saves 20%, and Elite saves 30%.",
  },
  {
    q: "Can I change tiers later?",
    a: "Yes. You can upgrade or downgrade your tier at any time from your advisor dashboard. Upgrades take effect immediately (prorated via Stripe); downgrades take effect at the end of your current billing cycle.",
  },
  {
    q: "What counts as a lead?",
    a: "A lead is a verified investor enquiry matched to your profile — including contact form submissions, booking requests, and phone call clicks from your profile page. Each lead is exclusive to you.",
  },
  {
    q: "Is there a lock-in contract?",
    a: "No. Monthly plans can be cancelled anytime. The Free tier is always available at no cost with no commitment required.",
  },
  {
    q: "Do I need an AFSL to join?",
    a: "Yes — you must be a registered financial adviser, accountant, or authorised representative under an AFSL. We verify all applicants before publishing profiles.",
  },
];

// Column accent colours — one per tier
const TIER_STYLES = {
  free: {
    headerBg: "bg-slate-50",
    headerBorder: "border-slate-200",
    badge: null,
    badgeClass: "",
    ctaClass: "border border-slate-300 text-slate-700 hover:bg-slate-50",
    highlight: false,
  },
  growth: {
    headerBg: "bg-violet-50",
    headerBorder: "border-violet-200",
    badge: null,
    badgeClass: "",
    ctaClass: "bg-violet-600 text-white hover:bg-violet-700",
    highlight: false,
  },
  pro: {
    headerBg: "bg-violet-600",
    headerBorder: "border-violet-600",
    badge: "Most Popular",
    badgeClass: "bg-amber-400 text-slate-900",
    ctaClass: "bg-amber-400 text-slate-900 hover:bg-amber-500 font-extrabold",
    highlight: true,
  },
  elite: {
    headerBg: "bg-slate-900",
    headerBorder: "border-slate-900",
    badge: null,
    badgeClass: "",
    ctaClass: "bg-slate-900 text-white hover:bg-slate-800",
    highlight: false,
  },
} as const;

function formatPrice(cents: number, _billing: "monthly" | "annual"): string {
  if (cents === 0) return "Free";
  const dollars = cents / 100;
  return `$${dollars.toLocaleString("en-AU", { maximumFractionDigits: 0 })}`;
}

function priceSuffix(cents: number, billing: "monthly" | "annual"): string {
  if (cents === 0) return "";
  return billing === "annual" ? "/yr" : "/mo";
}

export default function PricingClient() {
  const [billing, setBilling] = useState<"monthly" | "annual">("monthly");

  return (
    <div className="min-h-screen bg-white">
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="bg-gradient-to-br from-violet-600 via-violet-700 to-indigo-800 text-white py-16 md:py-24 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-violet-200 text-sm font-semibold mb-3 uppercase tracking-wider">
            Advisor Tiers
          </p>
          <h1 className="text-3xl md:text-5xl font-extrabold mb-4 leading-tight">
            Choose the right plan<br />for your practice
          </h1>
          <p className="text-lg md:text-xl text-violet-100 mb-8 max-w-2xl mx-auto leading-relaxed">
            Pay only for leads you receive. Higher tiers unlock priority
            matching, featured placement, and lower per-lead costs. Start free —
            upgrade anytime.
          </p>
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-sm font-medium">
            <Icon name="shield-check" size={14} className="text-emerald-300" />
            Free to start — no credit card required
          </div>
        </div>
      </section>

      {/* ── Billing toggle + tier cards ───────────────────────────────────── */}
      <section className="py-12 md:py-20 px-4">
        <div className="max-w-5xl mx-auto">
          {/* Billing toggle */}
          <div className="flex items-center justify-center gap-3 mb-10">
            <button
              type="button"
              onClick={() => setBilling("monthly")}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
                billing === "monthly"
                  ? "bg-slate-900 text-white shadow"
                  : "bg-white border border-slate-300 text-slate-600 hover:border-slate-400"
              }`}
            >
              Monthly
            </button>
            <button
              type="button"
              onClick={() => setBilling("annual")}
              className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                billing === "annual"
                  ? "bg-slate-900 text-white shadow"
                  : "bg-white border border-slate-300 text-slate-600 hover:border-slate-400"
              }`}
            >
              Annual
              <span className="text-[0.65rem] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-bold">
                save ~20%
              </span>
            </button>
          </div>

          {/* Tier cards grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {TIERS.map((tier) => {
              const style = TIER_STYLES[tier.id];
              const price = billing === "annual"
                ? tier.annualPriceCents
                : tier.monthlyPriceCents;
              const isHighlight = style.highlight;
              const headerTextClass = isHighlight || tier.id === "elite"
                ? "text-white"
                : "text-slate-900";
              const subTextClass = isHighlight
                ? "text-violet-200"
                : tier.id === "elite"
                ? "text-slate-400"
                : "text-slate-500";

              return (
                <div
                  key={tier.id}
                  className={`relative rounded-2xl border flex flex-col overflow-hidden shadow-sm ${
                    isHighlight
                      ? "ring-2 ring-violet-500 shadow-lg"
                      : "border-slate-200"
                  }`}
                >
                  {/* Popular badge */}
                  {style.badge && (
                    <div
                      className={`absolute top-0 left-0 right-0 text-center text-xs font-bold py-1 ${style.badgeClass}`}
                    >
                      {style.badge}
                    </div>
                  )}

                  {/* Header */}
                  <div
                    className={`px-5 pt-${style.badge ? "7" : "5"} pb-5 ${style.headerBg}`}
                  >
                    <h2
                      className={`text-lg font-extrabold mb-2 ${headerTextClass}`}
                    >
                      {tier.label}
                    </h2>
                    <div className="flex items-end gap-1 mb-1">
                      <span
                        className={`text-3xl font-extrabold ${headerTextClass}`}
                      >
                        {formatPrice(price, billing)}
                      </span>
                      <span className={`text-sm pb-0.5 ${subTextClass}`}>
                        {priceSuffix(price, billing)}
                      </span>
                    </div>
                    {tier.leadFeeMultiplier < 1 && (
                      <p className={`text-xs ${subTextClass}`}>
                        +{" "}
                        {Math.round((1 - tier.leadFeeMultiplier) * 100)}% off
                        every lead
                      </p>
                    )}
                    {tier.leadFeeMultiplier === 1 && (
                      <p className={`text-xs ${subTextClass}`}>
                        Standard lead pricing
                      </p>
                    )}
                  </div>

                  {/* Features */}
                  <div className="px-5 py-4 flex-1 bg-white">
                    <ul className="space-y-2.5">
                      {tier.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-2 text-sm text-slate-700"
                        >
                          <Icon
                            name="check-circle"
                            size={15}
                            className="text-emerald-500 shrink-0 mt-0.5"
                          />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                    {tier.maxLeadsPerMonth !== null && (
                      <p className="mt-3 text-xs text-slate-500">
                        Up to {tier.maxLeadsPerMonth} leads/month
                      </p>
                    )}
                  </div>

                  {/* CTA */}
                  <div className="px-5 pb-5 bg-white">
                    {tier.id === "free" ? (
                      <Link
                        href="/advisor-signup"
                        className={`block w-full text-center py-2.5 rounded-xl text-sm font-bold transition-all ${style.ctaClass}`}
                      >
                        Get Started Free
                      </Link>
                    ) : tier.id === "elite" ? (
                      <Link
                        href="/advisor-signup?plan=elite"
                        className={`block w-full text-center py-2.5 rounded-xl text-sm font-bold transition-all ${style.ctaClass}`}
                      >
                        Contact Sales
                      </Link>
                    ) : (
                      <Link
                        href={`/advisor-portal/upgrade?plan=${tier.id}&billing=${billing}`}
                        className={`block w-full text-center py-2.5 rounded-xl text-sm font-bold transition-all ${style.ctaClass}`}
                      >
                        Upgrade to {tier.label}
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-center text-sm text-slate-500 mt-6 max-w-xl mx-auto">
            All tiers include ASIC verification, a public profile, and access
            to your advisor dashboard. Lead fees are charged monthly in arrears
            — only for leads you accept.
          </p>
        </div>
      </section>

      {/* ── Feature comparison table ──────────────────────────────────────── */}
      <section className="py-12 md:py-16 px-4 bg-slate-50">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center mb-8 text-slate-900">
            Full feature comparison
          </h2>

          <div className="overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
            <table className="w-full text-sm border-collapse bg-white">
              <thead>
                <tr>
                  <th className="text-left px-4 py-3 text-slate-500 font-semibold w-48 border-b border-slate-200 bg-slate-50">
                    Feature
                  </th>
                  {TIERS.map((tier) => (
                    <th
                      key={tier.id}
                      className={`px-4 py-3 text-center font-extrabold border-b border-slate-200 ${
                        tier.id === "pro"
                          ? "bg-violet-600 text-white"
                          : tier.id === "elite"
                          ? "bg-slate-900 text-white"
                          : "bg-slate-50 text-slate-800"
                      }`}
                    >
                      {tier.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {FEATURE_ROWS.map((row, i) => (
                  <tr
                    key={row.label}
                    className={i % 2 === 0 ? "bg-white" : "bg-slate-50/50"}
                  >
                    <td className="px-4 py-3 text-slate-600 font-medium border-b border-slate-100">
                      {row.label}
                    </td>
                    {row.cells.map((cell, j) => (
                      <td
                        key={j}
                        className="px-4 py-3 text-center border-b border-slate-100"
                      >
                        {typeof cell === "boolean" ? (
                          cell ? (
                            <Icon
                              name="check-circle"
                              size={16}
                              className="text-emerald-500 mx-auto"
                            />
                          ) : (
                            <span
                              className="text-slate-300 text-lg leading-none"
                              aria-label="Not included"
                            >
                              —
                            </span>
                          )
                        ) : (
                          <span className="text-slate-700 font-medium">
                            {cell}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────────────────── */}
      <section className="py-12 md:py-20 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold text-center mb-10 text-slate-900">
            Frequently Asked Questions
          </h2>
          <div className="space-y-3">
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="bg-white border border-slate-200 rounded-xl overflow-hidden group"
              >
                <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer hover:bg-slate-50 flex items-center justify-between transition-colors">
                  <span>{faq.q}</span>
                  <Icon
                    name="chevron-down"
                    size={16}
                    className="text-slate-400 shrink-0 ml-3 group-open:rotate-180 transition-transform"
                  />
                </summary>
                <div className="px-5 pb-4">
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {faq.a}
                  </p>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────────────────── */}
      <section className="py-16 md:py-20 px-4 bg-gradient-to-br from-violet-600 to-indigo-700 text-white text-center">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-2xl md:text-4xl font-extrabold mb-4">
            Ready to grow your practice?
          </h2>
          <p className="text-violet-200 text-lg mb-8">
            Join Australian advisors who use Invest.com.au to reach new clients.
            Start free on the Free tier — upgrade anytime.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/advisor-signup"
              className="inline-block px-10 py-4 bg-white text-violet-700 font-bold rounded-xl text-lg hover:bg-violet-50 transition-all shadow-lg"
            >
              Create Free Profile &rarr;
            </Link>
            <Link
              href="/advisor-portal/upgrade"
              className="inline-block px-10 py-4 border-2 border-white/40 text-white font-bold rounded-xl text-lg hover:bg-white/10 transition-all"
            >
              View Upgrade Options
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
