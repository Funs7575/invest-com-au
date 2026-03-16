"use client";

import Link from "next/link";
import { CURRENT_YEAR } from "@/lib/seo";
import {
  GENERAL_ADVICE_WARNING,
  ADVERTISER_DISCLOSURE,
  CRYPTO_WARNING,
  AFSL_STATUS_DISCLOSURE,
  COMPANY_ACN,
  COMPANY_ABN,
} from "@/lib/compliance";

export function SiteFooter() {
  const year = new Date().getFullYear();
  const updatedDate = new Date().toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <footer className="bg-slate-900 text-slate-300">
      {/* Main grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Column 1 — Platforms */}
          <div>
            <h3 className="text-white font-bold text-sm mb-4">Platforms</h3>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: "Compare All", href: "/compare" },
                { label: "Share Trading", href: "/compare?category=shares" },
                { label: "Crypto Exchanges", href: "/compare?category=crypto" },
                { label: "Super Funds", href: "/best/super-funds" },
                { label: "Robo-Advisors", href: "/best/robo-advisors" },
                { label: "Savings Accounts", href: "/compare?filter=savings" },
                { label: "Current Deals", href: "/deals" },
                { label: `Best Platforms ${CURRENT_YEAR}`, href: "/best" },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-amber-400 transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 2 — Advisors */}
          <div>
            <h3 className="text-white font-bold text-sm mb-4">Advisors</h3>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: "Find an Advisor", href: "/find-advisor" },
                { label: "Mortgage Brokers", href: "/advisors/mortgage-brokers" },
                { label: "Financial Planners", href: "/advisors/financial-planners" },
                { label: "Buyer's Agents", href: "/advisors/buyers-agents" },
                { label: "SMSF Accountants", href: "/advisors/smsf-accountants" },
                { label: "Insurance Brokers", href: "/advisors/insurance-brokers" },
                { label: "Tax Agents", href: "/advisors/tax-agents" },
                { label: "List Your Practice", href: "/for-advisors" },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-amber-400 transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3 — Learn */}
          <div>
            <h3 className="text-white font-bold text-sm mb-4">Learn</h3>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: "All Articles", href: "/articles" },
                { label: "How-To Guides", href: "/how-to" },
                { label: "All Calculators", href: "/calculators" },
                { label: "Mortgage Calculator", href: "/mortgage-calculator" },
                { label: "Retirement Calculator", href: "/retirement-calculator" },
                { label: "Glossary", href: "/glossary" },
                { label: "Platform Quiz", href: "/quiz" },
                { label: "Broker vs Broker", href: "/versus" },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-amber-400 transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 4 — Company */}
          <div>
            <h3 className="text-white font-bold text-sm mb-4">Company</h3>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: "About Us", href: "/about" },
                { label: "Methodology", href: "/methodology" },
                { label: "Editorial Policy", href: "/editorial-policy" },
                { label: "How We Earn", href: "/how-we-earn" },
                { label: "Contact", href: "/contact" },
                { label: "Complaints & AFCA", href: "/complaints" },
                { label: "Advisor Portal", href: "/advisor-portal" },
                { label: "Advertise With Us", href: "/advertise" },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-amber-400 transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Compliance Section */}
        <div className="border-t border-slate-800 pt-8 mb-8 space-y-5">
          <h4 className="text-white font-bold text-sm">Important Information</h4>

          {/* General Advice Warning — always visible per ASIC requirements */}
          <div className="p-4 bg-slate-800/60 border border-slate-700 rounded-xl">
            <div className="flex items-start gap-2.5">
              <svg className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-xs font-bold text-amber-400 mb-1.5">General Advice Warning</p>
                <p className="text-xs text-slate-400 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
              </div>
            </div>
          </div>

          {/* Expandable disclosures */}
          <div className="divide-y divide-slate-800">
            {[
              { title: "Affiliate Disclosure", content: ADVERTISER_DISCLOSURE },
              { title: "Crypto Warning", content: CRYPTO_WARNING },
              { title: "AFSL Status", content: AFSL_STATUS_DISCLOSURE },
            ].map((item) => (
              <details key={item.title} className="group py-2">
                <summary className="text-xs font-semibold text-slate-400 cursor-pointer hover:text-slate-200 transition-colors list-none flex items-center justify-between py-1.5">
                  {item.title}
                  <svg className="w-3.5 h-3.5 text-slate-600 group-open:rotate-180 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </summary>
                <p className="text-xs text-slate-500 leading-relaxed pt-2 pb-1">{item.content}</p>
              </details>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-slate-800 pt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-sm text-slate-400">
                © {year} Invest.com.au Pty Ltd. All rights reserved.
              </p>
              <p className="text-xs text-slate-600">
                ACN {COMPANY_ACN} · ABN {COMPANY_ABN}
              </p>
            </div>

            <nav className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500" aria-label="Legal links">
              {[
                { label: "Privacy", href: "/privacy" },
                { label: "Terms", href: "/terms" },
                { label: "Advisor Terms", href: "/advisor-terms" },
                { label: "Advertiser Terms", href: "/advertiser-terms" },
                { label: "AFCA", href: "https://www.afca.org.au", external: true },
              ].map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noopener noreferrer" : undefined}
                  className="hover:text-amber-400 transition-colors"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          <p className="text-xs text-slate-700 mt-4">
            73+ platforms · verified advisors · Updated {updatedDate}
          </p>
        </div>
      </div>
    </footer>
  );
}
