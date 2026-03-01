"use client";

import { useState } from "react";
import Link from "next/link";
import { GENERAL_ADVICE_WARNING, ADVERTISER_DISCLOSURE, CRYPTO_WARNING, REGULATORY_NOTE, COMPANY_LEGAL_NAME, COMPANY_ACN, COMPANY_ABN } from "@/lib/compliance";

const sections = [
  { title: "Affiliate Disclosure", content: ADVERTISER_DISCLOSURE },
  { title: "Crypto Warning", content: CRYPTO_WARNING },
  { title: "Regulatory Note", content: REGULATORY_NOTE },
];

export default function Footer() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <>
      {/* Legal Disclaimers — light background, visually separate from footer */}
      <div className="bg-slate-50 border-t border-b border-slate-200 mt-4 md:mt-20">
        <div className="container-custom">
          <div className="py-2 md:py-3">
            <p className="text-[0.69rem] md:text-xs font-semibold text-slate-500 pt-1 md:pt-2 pb-0.5 md:pb-1">Legal &amp; Disclaimers</p>

            {/* General Advice Warning — always visible for ASIC compliance */}
            <div className="border-t border-slate-200 py-2 md:py-3">
              <div className="flex items-start gap-1.5">
                <svg className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-[0.69rem] md:text-xs font-bold text-slate-700 mb-0.5">General Advice Warning</p>
                  <p className="text-[0.69rem] md:text-xs text-slate-600 leading-relaxed font-medium">
                    {GENERAL_ADVICE_WARNING}
                  </p>
                </div>
              </div>
            </div>

            {sections.map((section, i) => (
              <div key={i} className="border-t border-slate-200">
                <button
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                  className="w-full flex items-center justify-between py-2 md:py-2.5 text-[0.69rem] md:text-xs text-slate-500 hover:text-slate-700 transition-colors"
                  aria-expanded={openIndex === i}
                  aria-controls={`disclaimer-${i}`}
                  aria-label={`Toggle ${section.title}`}
                >
                  <span className="font-semibold text-slate-700">{section.title}</span>
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
                  <p className="text-[0.69rem] md:text-xs text-slate-500 leading-relaxed pb-2 md:pb-3">
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
        <div className="container-custom py-5 md:py-12">
          <div className="grid grid-cols-3 md:grid-cols-4 gap-4 md:gap-8">
            <div className="col-span-3 md:col-span-1">
              <h3 className="text-white font-bold text-sm md:text-base mb-1 md:mb-4">Invest.com.au</h3>
              <p className="text-xs md:text-sm leading-relaxed">
                <span className="hidden md:inline">Australia&apos;s independent broker comparison platform. No bank bias, just honest reviews.</span>
                <span className="md:hidden text-slate-400">Independent broker comparison. No bank bias.</span>
              </p>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-2 md:mb-4 text-xs md:text-sm">Compare</h4>
              <ul className="space-y-0.5 md:space-y-2 text-xs md:text-sm">
                <li><Link href="/compare" className="hover:text-white transition-colors inline-block py-1 min-h-[32px]">All Brokers</Link></li>
                <li><Link href="/versus" className="hover:text-white transition-colors inline-block py-1 min-h-[32px]">Head-to-Head</Link></li>
                <li><Link href="/deals" className="hover:text-white transition-colors inline-block py-1 min-h-[32px]">Deals</Link></li>
                <li><Link href="/reviews" className="hover:text-white transition-colors inline-block py-1 min-h-[32px]">Reviews</Link></li>
                <li><Link href="/quiz" className="hover:text-white transition-colors inline-block py-1 min-h-[32px]">Quiz</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-2 md:mb-4 text-xs md:text-sm">Learn</h4>
              <ul className="space-y-0.5 md:space-y-2 text-xs md:text-sm">
                <li><Link href="/articles" className="hover:text-white transition-colors inline-block py-1 min-h-[32px]">Guides</Link></li>
                <li><Link href="/calculators" className="hover:text-white transition-colors inline-block py-1 min-h-[32px]">Calculators</Link></li>
                <li><Link href="/scenarios" className="hover:text-white transition-colors inline-block py-1 min-h-[32px]">Best For...</Link></li>
                <li><Link href="/pro" className="hover:text-white transition-colors text-amber-400 inline-block py-1 min-h-[32px]">Pro ✦</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold mb-2 md:mb-4 text-xs md:text-sm">About</h4>
              <ul className="space-y-0.5 md:space-y-2 text-xs md:text-sm">
                <li><Link href="/about" className="hover:text-white transition-colors inline-block py-1 min-h-[32px]">About Us</Link></li>
                <li><Link href="/editorial-policy" className="hover:text-white transition-colors inline-block py-1 min-h-[32px]">Editorial</Link></li>
                <li><Link href="/how-we-earn" className="hover:text-white transition-colors inline-block py-1 min-h-[32px]">How We Earn</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors inline-block py-1 min-h-[32px]">Privacy</Link></li>
                <li><Link href="/methodology" className="hover:text-white transition-colors inline-block py-1 min-h-[32px]">Methodology</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors inline-block py-1 min-h-[32px]">Terms</Link></li>
                <li><Link href="/advertise" className="hover:text-white transition-colors inline-block py-1 min-h-[32px]">Advertise</Link></li>
                <li><Link href="/broker-portal/login" className="hover:text-white transition-colors inline-block py-1 min-h-[32px]">Partner Login</Link></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-slate-700/40 mt-4 md:mt-8 pt-3 md:pt-8 text-xs md:text-sm text-center space-y-0.5 md:space-y-1">
            <p>&copy; {new Date().getFullYear()} {COMPANY_LEGAL_NAME}. All rights reserved.</p>
            <p className="text-[0.62rem] md:text-xs text-slate-400">ACN {COMPANY_ACN} | ABN {COMPANY_ABN}</p>
          </div>
        </div>
      </footer>
    </>
  );
}
