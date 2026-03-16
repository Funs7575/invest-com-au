"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

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
  selectedBg: string;
  professionals: Professional[];
}

const LIFE_EVENTS: LifeEvent[] = [
  {
    key: "property",
    label: "Buy Property",
    subtitle: "Home loan, buyers agent, insurance",
    icon: "home",
    color: "text-rose-600",
    bgColor: "bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50/30",
    selectedBg: "bg-rose-50 border-rose-300 shadow-sm",
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
    color: "text-amber-600",
    bgColor: "bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50/30",
    selectedBg: "bg-amber-50 border-amber-300 shadow-sm",
    professionals: [
      { label: "Financial Planner", desc: "Retirement, super, wealth building — personalised strategy", needKey: "planning", icon: "trending-up", color: "bg-amber-50 text-amber-600" },
      { label: "Tax Agent", desc: "Minimise tax on investments, capital gains, and deductions", needKey: "tax", icon: "calculator", color: "bg-slate-100 text-slate-600" },
      { label: "Wealth Manager", desc: "Portfolio management for high-net-worth investors", needKey: "wealth", icon: "briefcase", color: "bg-emerald-50 text-emerald-600" },
    ],
  },
  {
    key: "protect",
    label: "Protect What Matters",
    subtitle: "Estate, insurance, aged care",
    icon: "shield-check",
    color: "text-emerald-600",
    bgColor: "bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50/30",
    selectedBg: "bg-emerald-50 border-emerald-300 shadow-sm",
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
    color: "text-slate-700",
    bgColor: "bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50/30",
    selectedBg: "bg-slate-50 border-slate-300 shadow-sm",
    professionals: [
      { label: "SMSF Accountant", desc: "Setup, compliance, audit, and investment strategy", needKey: "smsf", icon: "building", color: "bg-amber-50 text-amber-600" },
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
      <p className="text-[0.65rem] md:text-xs text-amber-600 text-center uppercase tracking-widest font-bold mb-1.5">Find the right professional</p>
      <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-1.5 text-center">
        What do you need help with?
      </h2>
      <p className="text-sm text-slate-500 mb-6 text-center">
        Select a goal and we&apos;ll show you the right professionals for your situation.
      </p>

      {/* Step 1: Life event cards */}
      <div className="grid grid-cols-2 gap-2.5 md:gap-3">
        {LIFE_EVENTS.map((event) => (
          <button
            key={event.key}
            onClick={() => setSelected(selected === event.key ? null : event.key)}
            className={`text-left border-2 rounded-2xl p-3.5 md:p-4 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
              selected === event.key
                ? event.selectedBg
                : event.bgColor
            }`}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${selected === event.key ? "bg-white/70" : "bg-slate-100"}`}>
                <Icon name={event.icon} size={16} className={selected === event.key ? event.color : "text-slate-500"} />
              </div>
              <span className="text-sm md:text-base font-bold text-slate-900 leading-tight">{event.label}</span>
            </div>
            <p className="text-[0.65rem] md:text-xs text-slate-500 leading-snug pl-9">{event.subtitle}</p>
          </button>
        ))}
      </div>

      {/* Step 2: Reveal professionals */}
      {activeEvent && (
        <div className="mt-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5 px-1">Recommended professionals</p>
          {activeEvent.professionals.map((pro) => (
            <Link
              key={pro.needKey}
              href={`/find-advisor?need=${pro.needKey}`}
              className="flex items-center gap-3 p-3 md:p-3.5 bg-white border border-slate-200 rounded-xl hover:border-amber-300 hover:shadow-sm hover:bg-amber-50/20 transition-all group"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${pro.color.split(" ")[0]}`}>
                <Icon name={pro.icon} size={18} className={pro.color.split(" ")[1]} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-semibold text-slate-800 block">{pro.label}</span>
                <span className="text-[0.62rem] md:text-xs text-slate-500 block mt-0.5 leading-snug">{pro.desc}</span>
              </div>
              <span className="text-xs font-bold text-amber-600 shrink-0 group-hover:translate-x-0.5 transition-transform">
                Match &rarr;
              </span>
            </Link>
          ))}
        </div>
      )}

      <div className="text-center mt-6">
        <Link
          href="/find-advisor"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 shadow-sm hover:shadow-md transition-all"
        >
          Take the Full Matching Quiz &rarr;
        </Link>
        <p className="text-xs text-slate-400 mt-2">Free · 4 questions · 60 seconds</p>
      </div>
    </div>
  );
}
