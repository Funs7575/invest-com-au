"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

/**
 * Life-events concierge widget — progressive disclosure.
 * Step 1: Pick a broad life event (4 options, not 13).
 * Step 2: See the 2-3 relevant professionals for that event.
 * Solves Hick's Law / choice paralysis on the homepage.
 */

interface Professional {
  label: string;
  desc: string;
  needKey: string;
  icon: string;
  color: string;
}

interface LifeEvent {
  key: string;
  label: string;
  subtitle: string;
  icon: string;
  color: string;
  bgColor: string;
  professionals: Professional[];
}

const LIFE_EVENTS: LifeEvent[] = [
  {
    key: "property",
    label: "Buy Property",
    subtitle: "Home loan, buyers agent, insurance",
    icon: "home",
    color: "text-rose-600",
    bgColor: "bg-rose-50 border-rose-200 hover:border-rose-300",
    professionals: [
      { label: "Mortgage Broker", desc: "Compare rates from 30+ lenders — free, paid by lenders", needKey: "mortgage", icon: "landmark", color: "bg-rose-50 text-rose-600" },
      { label: "Buyer's Agent", desc: "Independent negotiation, off-market access, due diligence", needKey: "buyers", icon: "search", color: "bg-teal-50 text-teal-600" },
      { label: "Insurance Broker", desc: "Home, contents, life, and income protection cover", needKey: "insurance", icon: "shield", color: "bg-sky-50 text-sky-600" },
    ],
  },
  {
    key: "wealth",
    label: "Grow Wealth",
    subtitle: "Financial planning, tax, investing",
    icon: "trending-up",
    color: "text-violet-600",
    bgColor: "bg-violet-50 border-violet-200 hover:border-violet-300",
    professionals: [
      { label: "Financial Planner", desc: "Retirement, super, wealth building — personalised strategy", needKey: "planning", icon: "trending-up", color: "bg-violet-50 text-violet-600" },
      { label: "Tax Agent", desc: "Minimise tax on investments, capital gains, and deductions", needKey: "tax", icon: "calculator", color: "bg-amber-50 text-amber-600" },
      { label: "Wealth Manager", desc: "Portfolio management for high-net-worth investors", needKey: "wealth", icon: "briefcase", color: "bg-indigo-50 text-indigo-600" },
    ],
  },
  {
    key: "protect",
    label: "Protect What Matters",
    subtitle: "Estate, insurance, aged care",
    icon: "shield-check",
    color: "text-emerald-600",
    bgColor: "bg-emerald-50 border-emerald-200 hover:border-emerald-300",
    professionals: [
      { label: "Estate Planner", desc: "Wills, trusts, powers of attorney, succession planning", needKey: "estate", icon: "file-text", color: "bg-slate-100 text-slate-600" },
      { label: "Insurance Broker", desc: "Life, income protection, business, and key person cover", needKey: "insurance", icon: "shield", color: "bg-sky-50 text-sky-600" },
      { label: "Aged Care Advisor", desc: "Navigate costs, subsidies, and care options", needKey: "agedcare", icon: "heart", color: "bg-pink-50 text-pink-600" },
    ],
  },
  {
    key: "business",
    label: "Business & Specialist",
    subtitle: "SMSF, crypto, debt, property investment",
    icon: "building",
    color: "text-amber-600",
    bgColor: "bg-amber-50 border-amber-200 hover:border-amber-300",
    professionals: [
      { label: "SMSF Accountant", desc: "Setup, compliance, audit, and investment strategy", needKey: "smsf", icon: "building", color: "bg-blue-50 text-blue-600" },
      { label: "Property Advisor", desc: "Investment property strategy and portfolio building", needKey: "property", icon: "home", color: "bg-emerald-50 text-emerald-600" },
      { label: "Crypto Advisor", desc: "Portfolio strategy, DeFi, and tax planning", needKey: "crypto", icon: "bitcoin", color: "bg-orange-50 text-orange-600" },
    ],
  },
];

export default function HomepageServiceSelector() {
  const [selected, setSelected] = useState<string | null>(null);

  const activeEvent = LIFE_EVENTS.find((e) => e.key === selected);

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-1 text-center">
        What&apos;s your goal?
      </h2>
      <p className="text-sm text-slate-500 mb-5 text-center">
        Pick a goal and we&apos;ll show you the right professionals.
      </p>

      {/* Step 1: Life event cards */}
      <div className="grid grid-cols-2 gap-2 md:gap-3">
        {LIFE_EVENTS.map((event) => (
          <button
            key={event.key}
            onClick={() => setSelected(selected === event.key ? null : event.key)}
            className={`text-left border rounded-xl p-3 md:p-4 transition-all ${
              selected === event.key
                ? `${event.bgColor} ring-2 ring-offset-1 ring-slate-300 shadow-sm`
                : "bg-white border-slate-200 hover:border-slate-300 hover:shadow-sm"
            }`}
          >
            <div className="flex items-center gap-2 mb-1">
              <Icon name={event.icon} size={18} className={selected === event.key ? event.color : "text-slate-400"} />
              <span className="text-sm md:text-base font-bold text-slate-900">{event.label}</span>
            </div>
            <p className="text-[0.65rem] md:text-xs text-slate-500 leading-snug">{event.subtitle}</p>
          </button>
        ))}
      </div>

      {/* Step 2: Reveal professionals (progressive disclosure) */}
      {activeEvent && (
        <div className="mt-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          {activeEvent.professionals.map((pro) => (
            <Link
              key={pro.needKey}
              href={`/find-advisor?need=${pro.needKey}`}
              className="flex items-center gap-3 p-3 md:p-3.5 bg-white border border-slate-200 rounded-xl hover:border-violet-300 hover:shadow-sm transition-all group"
            >
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${pro.color.split(" ")[0]}`}>
                <Icon name={pro.icon} size={18} className={pro.color.split(" ")[1]} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-slate-800 block">{pro.label}</span>
                <span className="text-[0.62rem] md:text-xs text-slate-500 block mt-0.5">{pro.desc}</span>
              </div>
              <span className="text-xs font-semibold text-violet-600 shrink-0 group-hover:translate-x-0.5 transition-transform">
                Match &rarr;
              </span>
            </Link>
          ))}
        </div>
      )}

      <div className="text-center mt-5">
        <Link
          href="/find-advisor"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-600 hover:text-violet-700 transition-colors"
        >
          Not sure? Take the full quiz <span>&rarr;</span>
        </Link>
      </div>
    </div>
  );
}
