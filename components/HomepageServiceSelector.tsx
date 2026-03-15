"use client";

import Link from "next/link";
import Icon from "@/components/Icon";

const services = [
  { label: "Home Loan / Refinancing", desc: "Find the best mortgage rate for your situation", key: "mortgage", icon: "landmark", color: "bg-rose-50 text-rose-600" },
  { label: "Buyers Agent", desc: "Help finding and negotiating property purchases", key: "buyers", icon: "search", color: "bg-teal-50 text-teal-600" },
  { label: "Financial Planning", desc: "Retirement, wealth building, or investment strategy", key: "planning", icon: "trending-up", color: "bg-violet-50 text-violet-600" },
  { label: "Insurance", desc: "Life, TPD, income protection, or business cover", key: "insurance", icon: "shield", color: "bg-sky-50 text-sky-600" },
  { label: "SMSF Setup & Management", desc: "Set up or manage a self-managed super fund", key: "smsf", icon: "building", color: "bg-blue-50 text-blue-600" },
  { label: "Tax Optimisation", desc: "Minimise tax on investments and capital gains", key: "tax", icon: "calculator", color: "bg-amber-50 text-amber-600" },
  { label: "Wealth Management", desc: "Portfolio management for high-net-worth investors", key: "wealth", icon: "briefcase", color: "bg-indigo-50 text-indigo-600" },
  { label: "Estate Planning", desc: "Protect your assets and plan for the future", key: "estate", icon: "file-text", color: "bg-slate-100 text-slate-600" },
  { label: "Property Investment", desc: "Advice on buying investment property", key: "property", icon: "home", color: "bg-emerald-50 text-emerald-600" },
  { label: "Real Estate Agent", desc: "Selling or listing your property", key: "realestate", icon: "map-pin", color: "bg-lime-50 text-lime-600" },
  { label: "Crypto & Digital Assets", desc: "Crypto portfolio strategy and tax planning", key: "crypto", icon: "bitcoin", color: "bg-orange-50 text-orange-600" },
  { label: "Aged Care", desc: "Navigate aged care options, costs, and subsidies", key: "agedcare", icon: "heart", color: "bg-pink-50 text-pink-600" },
  { label: "Debt Help", desc: "Debt consolidation, budgeting, and financial recovery", key: "debt", icon: "credit-card", color: "bg-red-50 text-red-600" },
];

export default function HomepageServiceSelector() {
  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-1">
        What do you need help with?
      </h2>
      <p className="text-sm text-slate-500 mb-5">
        We&apos;ll match you with the right type of professional.
      </p>

      <div className="space-y-2">
        {services.map((s) => (
          <Link
            key={s.key}
            href={`/find-advisor?need=${s.key}`}
            className="flex items-center gap-3 p-3 md:p-3.5 bg-white border border-slate-200 rounded-xl hover:border-violet-300 hover:shadow-sm transition-all group"
          >
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.color.split(" ")[0]}`}>
              <Icon name={s.icon} size={18} className={s.color.split(" ")[1]} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-slate-800 block">{s.label}</span>
              <span className="text-[0.62rem] md:text-xs text-slate-500 block mt-0.5">{s.desc}</span>
            </div>
            <div className="w-5 h-5 rounded-full border-2 border-slate-200 shrink-0 group-hover:border-violet-300" />
          </Link>
        ))}
      </div>

      <div className="text-center mt-5">
        <Link
          href="/find-advisor"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-violet-600 hover:text-violet-700 transition-colors"
        >
          Not sure? Let us help you decide <span>&rarr;</span>
        </Link>
      </div>
    </div>
  );
}
