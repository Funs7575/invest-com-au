"use client";

import { useState } from "react";
import Link from "next/link";
import { GENERAL_ADVICE_WARNING, ADVERTISER_DISCLOSURE, CRYPTO_WARNING, REGULATORY_NOTE } from "@/lib/compliance";

export default function Footer() {
  const [disclaimerOpen, setDisclaimerOpen] = useState(false);

  return (
    <footer className="bg-green-800 text-slate-300 mt-20">
      {/* Collapsible Compliance Blocks */}
      <div className="border-b border-green-700/40">
        <div className="container-custom">
          <button
            onClick={() => setDisclaimerOpen(!disclaimerOpen)}
            className="w-full flex items-center justify-between py-4 text-sm text-slate-400 hover:text-slate-300 transition-colors"
            aria-expanded={disclaimerOpen}
            aria-label="Toggle legal disclaimers"
          >
            <span className="font-semibold">Legal &amp; Disclaimers</span>
            <svg
              className={`w-4 h-4 transition-transform duration-300 ${disclaimerOpen ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div
            className="overflow-hidden transition-all duration-300"
            style={{ maxHeight: disclaimerOpen ? "600px" : "0" }}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-400 leading-relaxed pb-6">
              <div className="border border-green-700/30 rounded-lg p-4">
                <h4 className="font-semibold text-green-200/80 mb-1">General Advice Warning</h4>
                <p>{GENERAL_ADVICE_WARNING}</p>
              </div>
              <div className="border border-green-700/30 rounded-lg p-4">
                <h4 className="font-semibold text-green-200/80 mb-1">Affiliate Disclosure</h4>
                <p>{ADVERTISER_DISCLOSURE}</p>
              </div>
              <div className="border border-green-700/30 rounded-lg p-4">
                <h4 className="font-semibold text-green-200/80 mb-1">Crypto Warning</h4>
                <p>{CRYPTO_WARNING}</p>
              </div>
              <div className="border border-green-700/30 rounded-lg p-4">
                <h4 className="font-semibold text-green-200/80 mb-1">Regulatory Note</h4>
                <p>{REGULATORY_NOTE}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Links */}
      <div className="container-custom py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-white font-bold mb-4">Invest.com.au</h3>
            <p className="text-sm">
              Australia&apos;s independent broker comparison platform. No bank bias, just honest reviews.
            </p>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Compare</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/compare" className="hover:text-white transition-colors">All Brokers</Link></li>
              <li><Link href="/versus" className="hover:text-white transition-colors">Head-to-Head</Link></li>
              <li><Link href="/reviews" className="hover:text-white transition-colors">Reviews</Link></li>
              <li><Link href="/quiz" className="hover:text-white transition-colors">Broker Quiz</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">Learn</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/articles" className="hover:text-white transition-colors">Guides &amp; Articles</Link></li>
              <li><Link href="/calculators" className="hover:text-white transition-colors">Tools &amp; Calculators</Link></li>
              <li><Link href="/scenarios" className="hover:text-white transition-colors">Best Broker For...</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-semibold mb-4">About</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/editorial-policy" className="hover:text-white transition-colors">Editorial Policy</Link></li>
              <li><Link href="/how-we-earn" className="hover:text-white transition-colors">How We Earn</Link></li>
              <li><Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/methodology" className="hover:text-white transition-colors">Methodology</Link></li>
              <li><Link href="/how-we-verify" className="hover:text-white transition-colors">How We Verify Fees</Link></li>
              <li><Link href="/terms" className="hover:text-white transition-colors">Terms of Use</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-green-700/40 mt-8 pt-8 text-sm text-center">
          <p>&copy; {new Date().getFullYear()} Invest.com.au. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
