"use client";

import { useEffect, useCallback } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

const SECTIONS = [
  {
    title: "Compare Platforms",
    desc: "Side-by-side fee and feature comparison",
    items: [
      { label: "Share Trading", href: "/compare?filter=shares", icon: "trending-up", color: "bg-amber-500" },
      { label: "Crypto Exchanges", href: "/compare?filter=crypto", icon: "bitcoin", color: "bg-orange-500" },
      { label: "Super Funds", href: "/compare/super", icon: "shield", color: "bg-blue-500" },
      { label: "Savings Accounts", href: "/compare?filter=savings", icon: "piggy-bank", color: "bg-emerald-500" },
      { label: "ETFs", href: "/compare/etfs", icon: "layers", color: "bg-violet-500" },
      { label: "CFD & Forex", href: "/compare?filter=cfd", icon: "repeat", color: "bg-red-500" },
    ],
  },
  {
    title: "Browse Professionals",
    desc: "Licensed directory with public register details",
    items: [
      { label: "Financial Planners", href: "/advisors/financial-planners", icon: "briefcase", color: "bg-amber-500" },
      { label: "Mortgage Brokers", href: "/advisors/mortgage-brokers", icon: "home", color: "bg-blue-500" },
      { label: "SMSF Accountants", href: "/advisors/smsf-accountants", icon: "calculator", color: "bg-emerald-500" },
      { label: "Tax Agents", href: "/advisors/tax-agents", icon: "file-text", color: "bg-violet-500" },
      { label: "Buyer's Agents", href: "/advisors/buyers-agents", icon: "map-pin", color: "bg-rose-500" },
      { label: "All Professionals", href: "/advisors", icon: "users", color: "bg-slate-700" },
    ],
  },
  {
    title: "Explore Investments",
    desc: "Browse real investment opportunities",
    items: [
      { label: "Businesses for Sale", href: "/invest/buy-business/listings", icon: "briefcase", color: "bg-slate-700" },
      { label: "Mining & Resources", href: "/invest/mining/opportunities", icon: "layers", color: "bg-amber-600" },
      { label: "Farmland", href: "/invest/farmland/listings", icon: "leaf", color: "bg-green-600" },
      { label: "Commercial Property", href: "/invest/commercial-property/listings", icon: "building", color: "bg-blue-600" },
      { label: "Alternatives", href: "/invest/alternatives/listings", icon: "gem", color: "bg-rose-600" },
      { label: "All 27 Verticals", href: "/invest", icon: "compass", color: "bg-slate-700" },
    ],
  },
];

export default function IntentPicker({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200]" role="dialog" aria-modal="true" aria-label="What are you looking for?">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      <div className="relative max-w-3xl mx-auto mt-[4vh] sm:mt-[6vh] px-4">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white/95 backdrop-blur-sm z-10 px-6 py-5 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-slate-900">What are you looking for?</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 rounded-xl hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Sections */}
          <div className="p-6 space-y-8">
            {SECTIONS.map((section) => (
              <div key={section.title}>
                <h3 className="text-sm font-bold text-slate-900 mb-1">{section.title}</h3>
                <p className="text-xs text-slate-500 mb-4">{section.desc}</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {section.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className="group flex items-center gap-3 p-3.5 rounded-xl border border-slate-200 hover:border-amber-300 hover:shadow-md bg-white transition-all"
                    >
                      <div className={`w-9 h-9 ${item.color} rounded-lg flex items-center justify-center shrink-0 shadow-sm`}>
                        <Icon name={item.icon} size={16} className="text-white" />
                      </div>
                      <span className="text-sm font-semibold text-slate-800 group-hover:text-amber-600 transition-colors leading-tight">{item.label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 text-center">
            <p className="text-xs text-slate-500">
              Or browse:{" "}
              <Link href="/compare" onClick={onClose} className="font-semibold text-slate-700 hover:text-amber-600 underline underline-offset-2 decoration-slate-300">all platforms</Link>
              {" · "}
              <Link href="/advisors" onClick={onClose} className="font-semibold text-slate-700 hover:text-amber-600 underline underline-offset-2 decoration-slate-300">all professionals</Link>
              {" · "}
              <Link href="/invest" onClick={onClose} className="font-semibold text-slate-700 hover:text-amber-600 underline underline-offset-2 decoration-slate-300">all investments</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
