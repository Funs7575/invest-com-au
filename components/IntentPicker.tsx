"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";

const SECTIONS = [
  {
    title: "Compare Platforms",
    icon: "bar-chart-2",
    items: [
      { label: "Share Trading", href: "/compare?filter=shares", icon: "trending-up", desc: "ASX & international" },
      { label: "Crypto Exchanges", href: "/compare?filter=crypto", icon: "bitcoin", desc: "AUSTRAC-registered" },
      { label: "Super Funds", href: "/compare/super", icon: "shield", desc: "Fees & performance" },
      { label: "Savings Accounts", href: "/compare?filter=savings", icon: "piggy-bank", desc: "High interest rates" },
      { label: "ETFs", href: "/compare/etfs", icon: "layers", desc: "Index & thematic" },
      { label: "CFD & Forex", href: "/compare?filter=cfd", icon: "repeat", desc: "Derivatives trading" },
    ],
  },
  {
    title: "Browse Professionals",
    icon: "users",
    items: [
      { label: "Financial Planners", href: "/advisors/financial-planners", icon: "briefcase", desc: "Wealth & retirement" },
      { label: "Mortgage Brokers", href: "/advisors/mortgage-brokers", icon: "home", desc: "Compare 30+ lenders" },
      { label: "SMSF Accountants", href: "/advisors/smsf-accountants", icon: "calculator", desc: "Super specialists" },
      { label: "Tax Agents", href: "/advisors/tax-agents", icon: "file-text", desc: "CGT & deductions" },
      { label: "Buyer's Agents", href: "/advisors/buyers-agents", icon: "map-pin", desc: "Off-market access" },
      { label: "Insurance Brokers", href: "/advisors/insurance-brokers", icon: "shield", desc: "Life & income" },
    ],
  },
  {
    title: "Explore Investments",
    icon: "layers",
    items: [
      { label: "Businesses for Sale", href: "/invest/buy-business", icon: "briefcase", desc: "SME acquisitions" },
      { label: "Mining & Resources", href: "/invest/mining", icon: "layers", desc: "Gold, lithium, copper" },
      { label: "Farmland", href: "/invest/farmland", icon: "leaf", desc: "Cropping & pastoral" },
      { label: "Commercial Property", href: "/invest/commercial-property", icon: "building", desc: "Office, industrial" },
      { label: "Alternatives", href: "/invest/alternatives", icon: "gem", desc: "Wine, art, cars" },
      { label: "All 27 Verticals", href: "/invest", icon: "compass", desc: "View everything" },
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
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative max-w-2xl mx-auto mt-[5vh] sm:mt-[8vh] px-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden max-h-[85vh] overflow-y-auto">
          {/* Header */}
          <div className="sticky top-0 bg-white z-10 px-6 pt-5 pb-3 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">What are you looking for?</h2>
              <p className="text-xs text-slate-500 mt-0.5">Choose a category to get started</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-600"
              aria-label="Close"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>

          {/* Sections */}
          <div className="p-5 space-y-6">
            {SECTIONS.map((section) => (
              <div key={section.title}>
                <div className="flex items-center gap-2 mb-3">
                  <Icon name={section.icon} size={16} className="text-amber-500" />
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-600">{section.title}</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {section.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className="group flex items-start gap-3 p-3 rounded-xl border border-slate-150 hover:border-amber-300 hover:bg-amber-50/40 transition-all"
                    >
                      <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-amber-100 flex items-center justify-center shrink-0 transition-colors">
                        <Icon name={item.icon} size={14} className="text-slate-500 group-hover:text-amber-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 group-hover:text-amber-700 leading-tight">{item.label}</p>
                        <p className="text-[0.65rem] text-slate-400 leading-tight mt-0.5">{item.desc}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 text-center">
            <p className="text-xs text-slate-500">
              Or browse everything:{" "}
              <Link href="/compare" onClick={onClose} className="font-semibold text-slate-700 hover:text-amber-600 underline underline-offset-2 decoration-slate-300">platforms</Link>
              {" · "}
              <Link href="/advisors" onClick={onClose} className="font-semibold text-slate-700 hover:text-amber-600 underline underline-offset-2 decoration-slate-300">professionals</Link>
              {" · "}
              <Link href="/invest" onClick={onClose} className="font-semibold text-slate-700 hover:text-amber-600 underline underline-offset-2 decoration-slate-300">investments</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
