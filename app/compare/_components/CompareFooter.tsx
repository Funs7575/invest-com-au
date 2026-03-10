"use client";

import Link from "next/link";
import type { Broker } from "@/lib/types";
import { trackEvent } from "@/lib/tracking";
import { GENERAL_ADVICE_WARNING, PDS_CONSIDERATION, CFD_WARNING_SHORT, CRYPTO_WARNING, SUPER_WARNING_SHORT, AFCA_REFERENCE, FSG_NOTE } from "@/lib/compliance";
import { downloadCSV } from "@/lib/csv-export";
import Icon from "@/components/Icon";
import AdSlot from "@/components/AdSlot";
import AdvisorPrompt from "@/components/AdvisorPrompt";
import LeadMagnet from "@/components/LeadMagnet";

type FilterType = 'all' | 'shares' | 'beginner' | 'chess' | 'free' | 'us' | 'smsf' | 'low-fx' | 'crypto' | 'robo' | 'research' | 'super' | 'property' | 'cfd' | 'savings' | 'term-deposits' | 'has-deal';

interface Props {
  sorted: Broker[];
  brokers: Broker[];
  activeFilter: FilterType;
}

export default function CompareFooter({ sorted, brokers, activeFilter }: Props) {
  return (
    <>
      {/* Export Buttons — hide on mobile */}
      {sorted.length > 0 && (
        <div className="hidden md:flex flex-wrap gap-2 mt-4 no-print">
          <button
            onClick={() => {
              const headers = ["Platform", "ASX Fee", "US Fee", "FX Rate (%)", "CHESS", "SMSF", "Rating"];
              const rows = sorted.map(b => [
                b.name,
                b.asx_fee || "N/A",
                b.us_fee || "N/A",
                b.fx_rate != null ? String(b.fx_rate) : "N/A",
                b.chess_sponsored ? "Yes" : "No",
                b.smsf_support ? "Yes" : "No",
                b.rating != null ? String(b.rating) : "N/A",
              ]);
              downloadCSV("broker-comparison.csv", headers, rows);
              trackEvent("export_csv", { page: "compare", count: String(sorted.length) }, "/compare");
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-600"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export CSV
          </button>
          <button
            onClick={() => {
              const slugs = sorted.map(b => b.slug).join(",");
              window.open(`/export/comparison?brokers=${slugs}`, "_blank");
              trackEvent("export_pdf", { page: "compare", count: String(sorted.length) }, "/compare");
            }}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-slate-600"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Export PDF
          </button>
        </div>
      )}

      {/* Pro upsell hidden for launch */}

      {/* Trust signals */}
      <div className="mt-4 md:mt-8 text-[0.62rem] md:text-xs text-slate-400 text-center">
        <p>
          Fees verified against official pricing.{" "}
          <Link href="/how-we-verify" className="underline hover:text-slate-600">Verification</Link>
          {" · "}
          <Link href="/methodology" className="underline hover:text-slate-600">Rankings</Link>
          {" · "}
          <Link href="/how-we-earn" className="underline hover:text-slate-600">How we earn</Link>
        </p>
      </div>

      {/* General Advice Warning */}
      <p className="mt-2 md:mt-3 text-[0.58rem] md:text-[0.69rem] text-slate-400 text-center leading-relaxed max-w-3xl mx-auto">
        {GENERAL_ADVICE_WARNING}
      </p>

      {/* Contextual risk warnings based on active filter */}
      <div className="mt-2 text-[0.55rem] md:text-[0.62rem] text-slate-400 text-center leading-relaxed max-w-3xl mx-auto space-y-1.5">
        <p>{PDS_CONSIDERATION} {FSG_NOTE}</p>
        {(activeFilter === 'cfd' || activeFilter === 'all') && (
          <p className="text-red-400/80">{CFD_WARNING_SHORT}</p>
        )}
        {(activeFilter === 'crypto' || activeFilter === 'all') && (
          <p className="text-amber-500/80">{CRYPTO_WARNING}</p>
        )}
        {(activeFilter === 'super' || activeFilter === 'all') && (
          <p>{SUPER_WARNING_SHORT}</p>
        )}
        <p>{AFCA_REFERENCE}</p>
      </div>

      {/* Sponsored display ad */}
      <AdSlot
        placement="display-sidebar-compare"
        variant="in-content"
        page="/compare"
        brokers={brokers}
      />

      {/* Contextual advisor prompt — changes based on active filter */}
      {(activeFilter === 'smsf' || activeFilter === 'property' || activeFilter === 'all') && (
        <div className="mt-4 md:mt-6">
          <AdvisorPrompt
            context={activeFilter === 'smsf' ? 'smsf' : activeFilter === 'property' ? 'property' : 'general'}
            compact={activeFilter === 'all'}
          />
        </div>
      )}

      {/* Email Capture */}
      <div className="mt-6 md:mt-8">
        <LeadMagnet />
      </div>

      {/* Bottom conversion — compact on mobile */}
      <div className="mt-5 md:mt-8 grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <div className="bg-white border border-slate-200 rounded-xl p-3 md:p-6 flex flex-col items-start gap-1.5 md:gap-0">
          <Icon name="target" size={18} className="text-amber-500 shrink-0 md:mb-2" />
          <h2 className="text-xs md:text-lg font-bold text-slate-900">Find Your Platform</h2>
          <p className="text-[0.58rem] md:text-xs text-slate-500 md:mb-4 hidden md:block">Answer 4 quick questions and narrow down platforms.</p>
          <Link href="/quiz" className="mt-auto px-3 md:px-5 py-1.5 md:py-2.5 bg-amber-500 text-white text-[0.65rem] md:text-sm font-bold rounded-lg hover:bg-amber-600 transition-colors">
            Quiz →
          </Link>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 md:p-6 flex flex-col items-start gap-1.5 md:gap-0">
          <Icon name="swords" size={18} className="text-slate-600 shrink-0 md:mb-2" />
          <h2 className="text-xs md:text-lg font-bold text-slate-900">Head-to-Head</h2>
          <p className="text-[0.58rem] md:text-xs text-slate-500 md:mb-4 hidden md:block">Compare two platforms side by side — fees, features & our pick.</p>
          <Link href="/versus" className="mt-auto px-3 md:px-5 py-1.5 md:py-2.5 bg-slate-900 text-white text-[0.65rem] md:text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors">
            Compare →
          </Link>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-3 md:p-6 flex flex-col items-start gap-1.5 md:gap-0">
          <Icon name="calculator" size={18} className="text-violet-600 shrink-0 md:mb-2" />
          <h2 className="text-xs md:text-lg font-bold text-slate-900">Fee Calculator</h2>
          <p className="text-[0.58rem] md:text-xs text-slate-500 md:mb-4 hidden md:block">See exact fees for your portfolio at every broker.</p>
          <Link href="/portfolio-calculator" className="mt-auto px-3 md:px-5 py-1.5 md:py-2.5 bg-violet-600 text-white text-[0.65rem] md:text-sm font-bold rounded-lg hover:bg-violet-700 transition-colors">
            Calculate →
          </Link>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 md:p-6 flex flex-col items-start gap-1.5 md:gap-0">
          <Icon name="tag" size={18} className="text-slate-600 shrink-0 md:mb-2" />
          <h2 className="text-xs md:text-lg font-bold text-slate-900">Current Deals</h2>
          <p className="text-[0.58rem] md:text-xs text-slate-500 md:mb-4 hidden md:block">See the latest promotions from Australian platforms.</p>
          <Link href="/deals" className="mt-auto px-3 md:px-5 py-1.5 md:py-2.5 bg-slate-900 text-white text-[0.65rem] md:text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors">
            View Deals →
          </Link>
        </div>
      </div>
    </>
  );
}
