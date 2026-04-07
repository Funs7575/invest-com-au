"use client";

import Link from "next/link";
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
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-8 mb-12">
          {/* Column 1 — Compare */}
          <details className="group" open>
            <summary className="flex items-center justify-between cursor-pointer md:cursor-default list-none">
              <h3 className="text-white font-bold text-sm">Compare</h3>
              <svg className="w-4 h-4 text-slate-500 group-open:rotate-180 transition-transform md:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </summary>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: "Compare All Platforms", href: "/compare" },
                { label: "Share Trading", href: "/share-trading" },
                { label: "Crypto", href: "/crypto" },
                { label: "Super Funds", href: "/compare/super" },
                { label: "Savings", href: "/savings" },
                { label: "Current Deals", href: "/deals" },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-amber-400 transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </details>

          {/* Column 2 — Invest */}
          <details className="group" open>
            <summary className="flex items-center justify-between cursor-pointer md:cursor-default list-none">
              <h3 className="text-white font-bold text-sm">Invest</h3>
              <svg className="w-4 h-4 text-slate-500 group-open:rotate-180 transition-transform md:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </summary>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: "All Verticals", href: "/invest" },
                { label: "Marketplace", href: "/invest/listings" },
                { label: "Mining", href: "/invest/mining" },
                { label: "Buy a Business", href: "/invest/buy-business" },
                { label: "Alternatives", href: "/invest/alternatives" },
                { label: "Private Credit", href: "/invest/private-credit" },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-amber-400 transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </details>

          {/* Column 3 — Learn */}
          <details className="group" open>
            <summary className="flex items-center justify-between cursor-pointer md:cursor-default list-none">
              <h3 className="text-white font-bold text-sm">Learn</h3>
              <svg className="w-4 h-4 text-slate-500 group-open:rotate-180 transition-transform md:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </summary>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: "All Articles", href: "/articles" },
                { label: "How-To Guides", href: "/how-to" },
                { label: "Calculators", href: "/calculators" },
                { label: "Glossary", href: "/glossary" },
                { label: "Foreign Investors", href: "/foreign-investment" },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-amber-400 transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </details>

          {/* Column 4 — Company */}
          <details className="group" open>
            <summary className="flex items-center justify-between cursor-pointer md:cursor-default list-none">
              <h3 className="text-white font-bold text-sm">Company</h3>
              <svg className="w-4 h-4 text-slate-500 group-open:rotate-180 transition-transform md:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
            </summary>
            <ul className="space-y-2.5 text-sm">
              {[
                { label: "About Us", href: "/about" },
                { label: "Methodology", href: "/methodology" },
                { label: "How We Earn", href: "/how-we-earn" },
                { label: "Contact", href: "/contact" },
                { label: "Complaints & AFCA", href: "/complaints" },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="hover:text-amber-400 transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </details>
        </div>

        {/* Compliance Section */}
        <div className="border-t border-slate-800 pt-5 mb-6 space-y-3">
          <h4 className="text-slate-400 font-medium text-[0.65rem] uppercase tracking-wider">Important Information</h4>

          {/* General Information Disclaimer — always visible */}
          <div className="p-3 bg-slate-800/40 border border-amber-100/10 rounded-xl">
            <div className="flex items-start gap-2.5">
              <svg className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-[0.7rem] font-bold text-amber-400 mb-1">General Information Only</p>
                <p className="text-[0.7rem] text-slate-400 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
                <p className="text-[0.7rem] text-slate-400 leading-relaxed mt-1.5">
                  Invest.com.au is a factual comparison and directory service. We do not assess suitability.
                  We do not provide personal financial advice. We do not recommend one provider as suitable
                  for a particular user. Users should review provider documents (PDS, TMD, FSG) and seek
                  licensed advice where appropriate.
                </p>
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
                <p className="text-[0.7rem] text-slate-500 leading-relaxed pt-2 pb-1">{item.content}</p>
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
                { label: "Accessibility", href: "/accessibility" },
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
