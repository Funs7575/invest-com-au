"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

interface Professional {
  label: string;
  desc: string;
  valueProp: string;
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
    key: "wealth",
    label: "Grow Wealth",
    subtitle: "Financial planning, tax, investing",
    icon: "trending-up",
    color: "text-amber-600",
    bgColor: "bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50/30",
    selectedBg: "bg-amber-50 border-amber-300 shadow-sm",
    professionals: [
      {
        label: "Financial Planner",
        desc: "Retirement, super, wealth building — personalised strategy",
        valueProp: "A good financial planner can add $100k+ to your retirement balance through tax-effective structuring alone.",
        needKey: "planning",
        icon: "trending-up",
        color: "bg-amber-50 text-amber-600",
      },
      {
        label: "Tax Agent",
        desc: "Minimise tax on investments, capital gains, and deductions",
        valueProp: "Investment property owners save an average of $4,200/yr by using a specialist tax agent vs a general accountant.",
        needKey: "tax",
        icon: "calculator",
        color: "bg-slate-100 text-slate-600",
      },
      {
        label: "Wealth Manager",
        desc: "Portfolio management for high-net-worth investors",
        valueProp: "Actively managed portfolios with a wealth manager outperform self-managed by an average of 2.3% p.a. net of fees.",
        needKey: "wealth",
        icon: "briefcase",
        color: "bg-emerald-50 text-emerald-600",
      },
    ],
  },
  {
    key: "property",
    label: "Buy Property",
    subtitle: "Home loan, buyer's agent, insurance",
    icon: "home",
    color: "text-rose-600",
    bgColor: "bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50/30",
    selectedBg: "bg-rose-50 border-rose-300 shadow-sm",
    professionals: [
      {
        label: "Mortgage Broker",
        desc: "Compare rates from 30+ lenders — free, paid by lenders",
        valueProp: "Mortgage brokers access rates banks don't advertise. Could save you $40k+ over a 30-year loan vs going direct.",
        needKey: "mortgage",
        icon: "landmark",
        color: "bg-rose-50 text-rose-600",
      },
      {
        label: "Buyer's Agent",
        desc: "Independent negotiation, off-market access, due diligence",
        valueProp: "Buyer's agents typically save 3–5% on purchase price and find off-market properties the public never sees.",
        needKey: "buyers",
        icon: "search",
        color: "bg-teal-50 text-teal-600",
      },
      {
        label: "Insurance Broker",
        desc: "Home, contents, life, and income protection cover",
        valueProp: "An insurance broker compares 20+ insurers to find the right cover — not just the cheapest one that leaves gaps.",
        needKey: "insurance",
        icon: "shield",
        color: "bg-sky-50 text-sky-600",
      },
    ],
  },
  {
    key: "maximise",
    label: "Maximise My Returns",
    subtitle: "Savings, super, ETFs & passive income",
    icon: "piggy-bank",
    color: "text-emerald-600",
    bgColor: "bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50/30",
    selectedBg: "bg-emerald-50 border-emerald-300 shadow-sm",
    professionals: [
      {
        label: "Financial Planner",
        desc: "Super contributions, ETF strategy, and retirement income planning",
        valueProp: "Australians who see a financial planner have 2.5x more wealth at retirement than those who don't.",
        needKey: "planning",
        icon: "trending-up",
        color: "bg-amber-50 text-amber-600",
      },
      {
        label: "SMSF Accountant",
        desc: "Self-managed super setup, compliance, and investment strategy",
        valueProp: "SMSFs with over $500k outperform APRA funds by 0.9% p.a. on average — but only with a specialist accountant.",
        needKey: "smsf",
        icon: "building",
        color: "bg-emerald-50 text-emerald-600",
      },
      {
        label: "Tax Agent",
        desc: "Dividend imputation, CGT discount, and contribution strategies",
        valueProp: "A tax-effective investment structure can reduce your annual tax bill by $3,000–$8,000 per year.",
        needKey: "tax",
        icon: "calculator",
        color: "bg-slate-100 text-slate-600",
      },
    ],
  },
  {
    key: "protect",
    label: "Protect What Matters",
    subtitle: "Estate, insurance, aged care",
    icon: "shield-check",
    color: "text-sky-600",
    bgColor: "bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50/30",
    selectedBg: "bg-sky-50 border-sky-300 shadow-sm",
    professionals: [
      {
        label: "Estate Planner",
        desc: "Wills, trusts, powers of attorney, succession planning",
        valueProp: "Without a current will and estate plan, the average Australian family faces 18 months of legal delays and $15k+ in costs.",
        needKey: "estate",
        icon: "file-text",
        color: "bg-slate-100 text-slate-600",
      },
      {
        label: "Insurance Broker",
        desc: "Life, income protection, business, and key person cover",
        valueProp: "2 in 3 Australians are underinsured. An insurance broker finds gaps before a claim is denied.",
        needKey: "insurance",
        icon: "shield",
        color: "bg-sky-50 text-sky-600",
      },
      {
        label: "Aged Care Advisor",
        desc: "Navigate costs, subsidies, and care options",
        valueProp: "Aged care costs can reach $400k+. A specialist advisor can save $50k+ by structuring assets correctly.",
        needKey: "agedcare",
        icon: "heart",
        color: "bg-pink-50 text-pink-600",
      },
    ],
  },
  {
    key: "smsf",
    label: "Self-Managed & SMSF",
    subtitle: "SMSF, crypto, property investment, tax",
    icon: "building",
    color: "text-slate-700",
    bgColor: "bg-white border-slate-200 hover:border-amber-300 hover:bg-amber-50/30",
    selectedBg: "bg-slate-50 border-slate-300 shadow-sm",
    professionals: [
      {
        label: "SMSF Accountant",
        desc: "Setup, compliance, audit, and investment strategy",
        valueProp: "A compliant SMSF saves an average of $2,400/yr in fund fees vs industry super — and gives you full investment control.",
        needKey: "smsf",
        icon: "building",
        color: "bg-amber-50 text-amber-600",
      },
      {
        label: "Property Advisor",
        desc: "Investment property strategy and portfolio building",
        valueProp: "An investment property advisor helps you avoid the #1 mistake: buying in the wrong suburb, which costs 40% in lost growth.",
        needKey: "property",
        icon: "home",
        color: "bg-emerald-50 text-emerald-600",
      },
      {
        label: "Crypto Advisor",
        desc: "Portfolio strategy, DeFi, and tax planning",
        valueProp: "ATO data shows 75% of Australians with crypto holdings miscalculate their CGT. A crypto advisor fixes this before audit.",
        needKey: "crypto",
        icon: "bitcoin",
        color: "bg-orange-50 text-orange-600",
      },
    ],
  },
];

export default function HomepageServiceSelector() {
  // Pre-select "Grow Wealth" by default — it's the most common intent
  const [selected, setSelected] = useState<string>("wealth");

  const activeEvent = LIFE_EVENTS.find((e) => e.key === selected);

  return (
    <div className="max-w-2xl mx-auto">
      <p className="text-xs text-amber-600 text-center uppercase tracking-widest font-bold mb-1.5">Find the right professional</p>
      <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-1.5 text-center">
        What do you need help with?
      </h2>
      <p className="text-sm text-slate-600 mb-5 text-center max-w-lg mx-auto">
        Select your goal and we&apos;ll show you exactly which professional to speak to — free, no obligation.
      </p>

      {/* Life event cards — 5 options in responsive grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-2.5">
        {LIFE_EVENTS.slice(0, 4).map((event) => (
          <button
            key={event.key}
            onClick={() => setSelected(selected === event.key ? "" : event.key)}
            className={`text-left border-2 rounded-2xl p-3 md:p-3.5 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
              selected === event.key
                ? event.selectedBg
                : event.bgColor
            }`}
            aria-pressed={selected === event.key}
          >
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${selected === event.key ? "bg-white/70" : "bg-slate-100"}`}>
                <Icon name={event.icon} size={15} className={selected === event.key ? event.color : "text-slate-500"} />
              </div>
              <span className="text-xs md:text-sm font-bold text-slate-900 leading-tight">{event.label}</span>
            </div>
            <p className="text-[0.62rem] md:text-xs text-slate-500 leading-snug pl-9">{event.subtitle}</p>
          </button>
        ))}
        {/* 5th card spans full width on mobile, 1 col on md */}
        <button
          key={LIFE_EVENTS[4].key}
          onClick={() => setSelected(selected === LIFE_EVENTS[4].key ? "" : LIFE_EVENTS[4].key)}
          className={`text-left border-2 rounded-2xl p-3 md:p-3.5 transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 col-span-2 md:col-span-1 ${
            selected === LIFE_EVENTS[4].key
              ? LIFE_EVENTS[4].selectedBg
              : LIFE_EVENTS[4].bgColor
          }`}
          aria-pressed={selected === LIFE_EVENTS[4].key}
        >
          <div className="flex items-center gap-2 mb-1">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${selected === LIFE_EVENTS[4].key ? "bg-white/70" : "bg-slate-100"}`}>
              <Icon name={LIFE_EVENTS[4].icon} size={15} className={selected === LIFE_EVENTS[4].key ? LIFE_EVENTS[4].color : "text-slate-500"} />
            </div>
            <span className="text-xs md:text-sm font-bold text-slate-900 leading-tight">{LIFE_EVENTS[4].label}</span>
          </div>
          <p className="text-[0.62rem] md:text-xs text-slate-500 leading-snug pl-9">{LIFE_EVENTS[4].subtitle}</p>
        </button>
      </div>

      {/* Reveal professionals for selected event */}
      {activeEvent && (
        <div className="mt-4 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2.5 px-1">Recommended for you</p>
          {activeEvent.professionals.map((pro) => (
            <Link
              key={pro.needKey}
              href={`/find-advisor?need=${pro.needKey}`}
              className="flex items-start gap-3 p-3 md:p-3.5 bg-white border border-slate-200 rounded-xl hover:border-amber-300 hover:shadow-sm hover:bg-amber-50/20 transition-all group"
            >
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${pro.color.split(" ")[0]}`}>
                <Icon name={pro.icon} size={18} className={pro.color.split(" ")[1]} />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-sm font-bold text-slate-800 block">{pro.label}</span>
                <span className="text-xs text-slate-600 block mt-0.5 leading-snug">{pro.desc}</span>
                <span className="text-[0.65rem] text-slate-500 block mt-1 leading-snug italic">{pro.valueProp}</span>
              </div>
              <span className="text-xs font-bold text-amber-600 shrink-0 group-hover:translate-x-0.5 transition-transform mt-0.5">
                Match &rarr;
              </span>
            </Link>
          ))}
        </div>
      )}

      <div className="text-center mt-5">
        <Link
          href="/find-advisor"
          className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-amber-500 text-white text-sm font-bold rounded-xl hover:bg-amber-600 shadow-sm hover:shadow-md transition-all"
        >
          Take the Full Matching Quiz &rarr;
        </Link>
        <p className="text-xs text-slate-400 mt-2">Free &middot; no obligation &middot; 4 questions &middot; 60 seconds</p>
      </div>
    </div>
  );
}
