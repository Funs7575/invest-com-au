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
    <div className="bg-white rounded-2xl shadow-lg border border-slate-200 p-6 md:p-8 relative overflow-hidden">
      {/* Amber accent bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-amber-500" />

      <div className="flex justify-between items-start mb-2">
        <h2 className="text-xl md:text-2xl font-bold text-slate-900">What is your primary goal?</h2>
        <div className="hidden sm:flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-[11px] font-semibold px-2.5 py-1 rounded-full uppercase tracking-wider border border-emerald-100">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Network Active
        </div>
      </div>
      <p className="text-sm text-slate-500 mb-6">Takes 60 seconds. Secure your free strategy session.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((opt) => {
          const isHovered = hovered === opt.id;
          return (
            <Link
              key={opt.id}
              href={opt.href}
              onMouseEnter={() => setHovered(opt.id)}
              onMouseLeave={() => setHovered(null)}
              className={`relative flex items-start text-left p-4 border rounded-xl transition-all duration-200 group ${
                isHovered
                  ? "border-amber-500 bg-amber-50/50 shadow-md -translate-y-0.5"
                  : "border-slate-200 hover:border-amber-300 bg-white shadow-sm"
              }`}
            >
              {opt.badge && (
                <span className="absolute -top-2.5 right-3 bg-slate-900 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                  {opt.badge}
                </span>
              )}
              <div
                className={`p-3 rounded-lg mr-3 transition-colors shrink-0 ${
                  isHovered
                    ? "bg-amber-500 text-white"
                    : "bg-slate-50 border border-slate-100 text-slate-600 group-hover:bg-amber-50 group-hover:text-amber-600 group-hover:border-amber-200"
                }`}
              >
                <Icon name={opt.icon} size={22} />
              </div>
              <div>
                <span className="block font-bold text-slate-900 text-base mb-0.5">{opt.label}</span>
                <span className="block text-xs text-slate-500">{opt.sub}</span>
              </div>
            </Link>
          );
        })}
      </div>

      {/* Trust signal */}
      <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-2">
        <Icon name="shield-check" size={16} className="text-emerald-500 shrink-0" />
        <p className="text-xs text-slate-500">
          Secure match. Sent to <strong className="text-slate-700">1 verified professional</strong> only.
        </p>
      </div>
    </div>
  );
}
