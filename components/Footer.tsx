"use client";

import { useState } from "react";
import Link from "next/link";
import { GENERAL_ADVICE_WARNING, ADVERTISER_DISCLOSURE, CRYPTO_WARNING, REGULATORY_NOTE, AFSL_STATUS_DISCLOSURE, FSG_NOTE, COMPANY_LEGAL_NAME, COMPANY_ACN, COMPANY_ABN } from "@/lib/compliance";

// Collapsible sections (less critical detail, users can expand if needed)
const collapsibleSections = [
  { title: "Affiliate Disclosure", content: ADVERTISER_DISCLOSURE },
  { title: "Financial Services Guide", content: FSG_NOTE },
  { title: "Crypto Warning", content: CRYPTO_WARNING },
  { title: "Regulatory Note", content: REGULATORY_NOTE },
];

export default function Footer() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      {/* Persistent Legal Banner — always visible, not collapsible */}
      <div className="bg-amber-50/60 border-t border-b border-amber-100 mt-4 md:mt-16">
        <div className="container-custom py-3 md:py-4">
          <div className="flex items-start gap-2.5">
            <svg className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-xs font-bold text-slate-700 mb-0.5">General Advice Warning</p>
              <p className="text-xs text-slate-600 leading-relaxed">
                {GENERAL_ADVICE_WARNING}
              </p>
              <p className="text-[0.69rem] text-slate-500 leading-relaxed mt-1.5">
                Consider your objectives, financial situation and needs before acting. See our{" "}
                <Link href="/terms" className="underline hover:text-slate-700">Terms of Use</Link>,{" "}
                <Link href="/privacy" className="underline hover:text-slate-700">Privacy Policy</Link>,{" "}
                <Link href="/how-we-earn" className="underline hover:text-slate-700">How We Earn</Link>, and{" "}
                <Link href="/fsg" className="underline hover:text-slate-700">FSG</Link>.
              </p>
              <p className="text-[0.69rem] text-slate-500 mt-1.5 leading-relaxed">
                {AFSL_STATUS_DISCLOSURE}{" "}
                <Link href="/fsg" className="underline hover:text-slate-700">View Financial Services Guide →</Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Collapsible detail sections */}
      <div className="bg-slate-50 border-b border-slate-200">
        <div className="container-custom">
          <div className="py-1">
            <p className="text-[0.65rem] font-semibold text-slate-400 uppercase tracking-wider pt-2 pb-1">Additional Disclosures</p>
            {collapsibleSections.map((section, i) => (
              <div key={i} className="border-t border-slate-200">
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="w-full flex items-center justify-between py-2 text-[0.69rem] text-slate-500 hover:text-slate-700 transition-colors"
                  aria-expanded={openIndex === i}
                  aria-controls={`disclaimer-${i}`}
                  aria-label={`Toggle ${section.title}`}
                >
                  <span className="font-semibold text-slate-600">{section.title}</span>
                  <svg
                    className={`w-3 h-3 transition-transform duration-200 ${openIndex === i ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div
                  id={`disclaimer-${i}`}
                  role="region"
                  className="overflow-hidden transition-all duration-200"
                  style={{ maxHeight: openIndex === i ? "300px" : "0" }}
                >
                  <p className="text-[0.69rem] text-slate-500 leading-relaxed pb-2 md:pb-3">
                    {section.content}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-800 text-slate-300">
        <div className="container-custom py-6 md:py-12">
          {/* 6-column grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 md:gap-6">

            {/* Brand */}
            <div className="col-span-2 sm:col-span-3 md:col-span-1">
              <h3 className="text-white font-extrabold text-sm md:text-base mb-2 md:mb-3">
                Invest<span className="text-amber-400">.com.au</span>
              </h3>
              <p className="text-xs md:text-sm leading-relaxed text-slate-400">
                <span className="hidden md:inline">Australia&apos;s independent investing hub. Compare platforms, find verified advisors — shares, crypto, super, property &amp; more. Always free.</span>
                <span className="md:hidden text-slate-400">Compare platforms &amp; find verified advisors. Always free.</span>
              </p>
            </div>

            {/* Invest by Sector */}
            <div>
              <h4 className="text-white font-semibold mb-2 md:mb-3 text-xs md:text-sm">Invest by Sector</h4>
              <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
                <li><Link href="/invest" className="hover:text-white transition-colors inline-block py-0.5">All Verticals</Link></li>
                <li><Link href="/invest/funds" className="hover:text-white transition-colors inline-block py-0.5">Investment Funds</Link></li>
                <li><Link href="/smsf" className="hover:text-white transition-colors inline-block py-0.5">SMSF Hub</Link></li>
                <li><Link href="/research" className="hover:text-white transition-colors inline-block py-0.5">Research Reports</Link></li>
                <li><Link href="/foreign-investment/siv" className="hover:text-white transition-colors inline-block py-0.5">Significant Investor Visa</Link></li>
                <li><Link href="/invest/mining" className="hover:text-white transition-colors inline-block py-0.5">Mining & Resources</Link></li>
                <li><Link href="/invest/oil-gas" className="hover:text-white transition-colors inline-block py-0.5">Oil &amp; Gas</Link></li>
                <li><Link href="/invest/lithium" className="hover:text-white transition-colors inline-block py-0.5">Lithium</Link></li>
                <li><Link href="/invest/uranium" className="hover:text-white transition-colors inline-block py-0.5">Uranium</Link></li>
                <li><Link href="/invest/hydrogen" className="hover:text-white transition-colors inline-block py-0.5">Hydrogen</Link></li>
                <li><Link href="/invest/buy-business" className="hover:text-white transition-colors inline-block py-0.5">Buy a Business</Link></li>
                <li><Link href="/invest/farmland" className="hover:text-white transition-colors inline-block py-0.5">Farmland</Link></li>
                <li><Link href="/invest/commercial-property" className="hover:text-white transition-colors inline-block py-0.5">Commercial Property</Link></li>
                <li><Link href="/invest/renewable-energy" className="hover:text-white transition-colors inline-block py-0.5">Renewable Energy</Link></li>
                <li><Link href="/invest/startups" className="hover:text-white transition-colors inline-block py-0.5">Startups & Tech</Link></li>
              </ul>
            </div>

            {/* Platforms */}
            <div>
              <h4 className="text-white font-semibold mb-2 md:mb-3 text-xs md:text-sm">Platforms</h4>
              <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
                <li><Link href="/compare" className="hover:text-white transition-colors inline-block py-0.5">Compare All</Link></li>
                <li><Link href="/compare?category=shares" className="hover:text-white transition-colors inline-block py-0.5">Share Trading</Link></li>
                <li><Link href="/compare?category=crypto" className="hover:text-white transition-colors inline-block py-0.5">Crypto Exchanges</Link></li>
                <li><Link href="/compare/super" className="hover:text-white transition-colors inline-block py-0.5">Super Funds</Link></li>
                <li><Link href="/best/robo-advisors" className="hover:text-white transition-colors inline-block py-0.5">Robo-Advisors</Link></li>
                <li><Link href="/compare?category=savings" className="hover:text-white transition-colors inline-block py-0.5">Savings Accounts</Link></li>
                <li><Link href="/etfs" className="hover:text-white transition-colors inline-block py-0.5">ETF Hub</Link></li>
                <li><Link href="/fee-tracker" className="hover:text-white transition-colors inline-block py-0.5">Fee Tracker</Link></li>
                <li><Link href="/versus" className="hover:text-white transition-colors inline-block py-0.5">Head-to-Head</Link></li>
                <li><Link href="/deals" className="hover:text-white transition-colors inline-block py-0.5">Deals</Link></li>
              </ul>
            </div>

            {/* Property & Advisors — own column */}
            <div>
              <h4 className="text-white font-semibold mb-2 md:mb-3 text-xs md:text-sm">Property &amp; Advisors</h4>
              <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
                <li><Link href="/find-advisor" className="hover:text-white transition-colors inline-block py-0.5">Find My Advisor — Free</Link></li>
                <li><Link href="/advisors" className="hover:text-white transition-colors inline-block py-0.5">Advisor Directory</Link></li>
                <li><Link href="/advisors/search" className="hover:text-white transition-colors inline-block py-0.5">Advanced Search</Link></li>
                <li><Link href="/advisors/mortgage-brokers" className="hover:text-white transition-colors inline-block py-0.5">Mortgage Brokers</Link></li>
                <li><Link href="/advisors/financial-planners" className="hover:text-white transition-colors inline-block py-0.5">Financial Planners</Link></li>
                <li><Link href="/advisors/smsf-accountants" className="hover:text-white transition-colors inline-block py-0.5">SMSF Accountants</Link></li>
                <li><Link href="/advisors/mining-lawyers" className="hover:text-white transition-colors inline-block py-0.5">Mining Lawyers</Link></li>
                <li><Link href="/advisors/business-brokers" className="hover:text-white transition-colors inline-block py-0.5">Business Brokers</Link></li>
                <li><Link href="/for-advisors" className="hover:text-white transition-colors inline-block py-0.5">List Your Practice</Link></li>
              </ul>
            </div>

            {/* Property — own column */}
            <div>
              <h4 className="text-white font-semibold mb-2 md:mb-3 text-xs md:text-sm">Property</h4>
              <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
                <li><Link href="/property" className="hover:text-white transition-colors inline-block py-0.5">Property Hub</Link></li>
                <li><Link href="/property/listings" className="hover:text-white transition-colors inline-block py-0.5">New Developments</Link></li>
                <li><Link href="/property/buyer-agents" className="hover:text-white transition-colors inline-block py-0.5">Buyer&apos;s Agents</Link></li>
                <li><Link href="/property/suburbs" className="hover:text-white transition-colors inline-block py-0.5">Suburb Research</Link></li>
                <li><Link href="/property/finance" className="hover:text-white transition-colors inline-block py-0.5">Investment Loans</Link></li>
                <li><Link href="/articles?category=property" className="hover:text-white transition-colors inline-block py-0.5">Property Guides</Link></li>
              </ul>
            </div>

            {/* Learn + About (consolidated) */}
            <div>
              <h4 className="text-white font-semibold mb-2 md:mb-3 text-xs md:text-sm">Learn</h4>
              <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm mb-4 md:mb-5">
                <li><Link href="/articles" className="hover:text-white transition-colors inline-block py-0.5">Articles &amp; Guides</Link></li>
                <li><Link href="/tax" className="hover:text-white transition-colors inline-block py-0.5">Tax Strategy Hub</Link></li>
                <li><Link href="/insurance" className="hover:text-white transition-colors inline-block py-0.5">Insurance Hub</Link></li>
                <li><Link href="/calculators" className="hover:text-white transition-colors inline-block py-0.5">Calculators</Link></li>
                <li><Link href="/glossary" className="hover:text-white transition-colors inline-block py-0.5">Glossary</Link></li>
                <li><Link href="/quiz" className="hover:text-white transition-colors inline-block py-0.5">Platform Quiz</Link></li>
              </ul>
              <h4 className="text-white font-semibold mb-2 md:mb-3 text-xs md:text-sm">Company</h4>
              <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm">
                <li><Link href="/about" className="hover:text-white transition-colors inline-block py-0.5">About Us</Link></li>
                <li><Link href="/methodology" className="hover:text-white transition-colors inline-block py-0.5">Methodology</Link></li>
                <li><Link href="/editorial-policy" className="hover:text-white transition-colors inline-block py-0.5">Editorial Policy</Link></li>
                <li><Link href="/how-we-earn" className="hover:text-white transition-colors inline-block py-0.5">How We Earn</Link></li>
                <li><Link href="/complaints" className="hover:text-white transition-colors inline-block py-0.5">Complaints &amp; AFCA</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors inline-block py-0.5">Contact</Link></li>
                <li><Link href="/legal" className="hover:text-white transition-colors inline-block py-0.5">Legal</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-700/40 mt-4 md:mt-8 pt-3 md:pt-6 text-xs md:text-sm text-center space-y-0.5 md:space-y-1">
            <p>&copy; {new Date().getFullYear()} {COMPANY_LEGAL_NAME}. All rights reserved.</p>
            <p className="text-[0.62rem] md:text-xs text-slate-400">ACN {COMPANY_ACN} | ABN {COMPANY_ABN}</p>
          </div>
        </div>
      </footer>
    </>
  );
}
