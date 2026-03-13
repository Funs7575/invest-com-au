"use client";

import { useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

const options = [
  {
    id: "home",
    href: "/advisors/mortgage-brokers",
    icon: "home",
    label: "Property Finance",
    sub: "Home & Investment Loans",
    badge: "Highest Demand",
  },
  {
    id: "invest",
    href: "/advisors/buyers-agents",
    icon: "building",
    label: "Strategic Property",
    sub: "Buyer's Agents & Advocates",
    badge: null,
  },
  {
    id: "wealth",
    href: "/advisors/financial-planners",
    icon: "trending-up",
    label: "Wealth Creation",
    sub: "Holistic Financial Planners",
    badge: null,
  },
  {
    id: "smsf",
    href: "/advisors/smsf-accountants",
    icon: "briefcase",
    label: "Manage SMSF",
    sub: "Specialist Accountants & Audit",
    badge: null,
  },
];

export default function HeroLeadCapture() {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <div className="bg-white rounded-[2rem] shadow-[0_20px_60px_rgb(0,0,0,0.08)] border border-slate-100 p-6 md:p-10 relative overflow-hidden">
      {/* Premium amber accent bar */}
      <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600" />

      <div className="flex justify-between items-start mb-2">
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900">What is your primary goal?</h2>
        {/* Network Active badge */}
        <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-[11px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider border border-emerald-100">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Network Active
        </div>
      </div>
      <p className="text-slate-500 mb-8 font-medium">Takes 60 seconds. Secure your free strategy session.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {options.map((opt) => {
          const isHovered = hovered === opt.id;
          return (
            <Link
              key={opt.id}
              href={opt.href}
              onMouseEnter={() => setHovered(opt.id)}
              onMouseLeave={() => setHovered(null)}
              className={`relative flex items-start text-left p-5 border-2 rounded-2xl transition-all duration-300 group ${
                isHovered
                  ? "border-amber-500 bg-amber-50/30 shadow-lg -translate-y-0.5"
                  : "border-slate-100 hover:border-amber-300 bg-white shadow-sm"
              }`}
            >
              {opt.badge && (
                <span className="absolute -top-3 right-4 bg-slate-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider shadow-md">
                  {opt.badge}
                </span>
              )}
              <div
                className={`p-3.5 rounded-xl mr-4 transition-colors shadow-sm ${
                  isHovered
                    ? "bg-amber-500 text-slate-900"
                    : "bg-slate-50 border border-slate-100 text-slate-700 group-hover:bg-amber-100 group-hover:text-amber-800 group-hover:border-amber-200"
                }`}
              >
                <Icon name={opt.icon} size={24} />
              </div>
              <div>
                <span className="block font-extrabold text-slate-900 text-lg mb-0.5">{opt.label}</span>
                <span className="block text-sm text-slate-500 font-medium">{opt.sub}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Trust signal */}
      <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
        <p className="text-sm font-bold text-slate-600 flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
          <Icon name="shield-check" size={16} className="text-emerald-500" />
          Secure match. Sent to <strong className="text-slate-900">1 verified professional</strong> only.
        </p>
      </div>
    </div>
  );
}
