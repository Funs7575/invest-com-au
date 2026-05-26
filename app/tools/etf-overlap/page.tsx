import type { Metadata } from "next";
import Link from "next/link";
import EtfOverlapDetector from "@/components/EtfOverlapDetector";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const metadata: Metadata = {
  title: "ETF Overlap Detector | Invest.com.au",
  description: "See how much your ETFs overlap. Holding VGS and NDQ? You may have more US tech concentration than you realise.",
  openGraph: { title: "ETF Overlap Detector", description: "Check for unintentional concentration across your ETFs." },
};

export default function EtfOverlapPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <nav className="text-xs text-slate-400">
        <Link href="/tools" className="hover:text-violet-700">Tools</Link>
        <span className="mx-1">›</span>
        <span className="text-slate-600">ETF Overlap Detector</span>
      </nav>

      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">ETF Overlap Detector</h1>
        <p className="text-slate-500 mt-2 text-sm leading-relaxed">
          Many popular ETFs share the same underlying securities. Holding both VGS and NDQ, for example,
          means you have heavy exposure to the same US mega-cap technology companies — more than you might
          realise. Select two ETFs below to see exactly where they overlap.
        </p>
      </div>

      <EtfOverlapDetector />

      <p className="text-[11px] text-slate-400 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
    </div>
  );
}
