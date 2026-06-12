import type { Metadata } from "next";
import Link from "next/link";
import EtfOverlapDetector from "@/components/EtfOverlapDetector";
import CalculatorLeadCapture from "@/components/CalculatorLeadCapture";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import { breadcrumbJsonLd, CURRENT_YEAR, SITE_URL } from "@/lib/seo";
import { calculatorJsonLd, faqJsonLd } from "@/lib/schema-markup";
import JsonLd from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "ETF Overlap Detector | Invest.com.au",
  description: "See how much your ETFs overlap. Holding VGS and NDQ? You may have more US tech concentration than you realise.",
  openGraph: { title: "ETF Overlap Checker", description: "Check for unintentional concentration across your ETFs.", images: [{ url: `/api/og?title=${encodeURIComponent("ETF Overlap Checker")}&sub=${encodeURIComponent("Portfolio Overlap · Diversification · Holdings · " + CURRENT_YEAR)}`, width: 1200, height: 630 }] },
  alternates: { canonical: `${SITE_URL}/tools/etf-overlap` },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: SITE_URL },
  { name: "Tools", url: `${SITE_URL}/tools` },
  { name: "ETF Overlap Detector", url: `${SITE_URL}/tools/etf-overlap` },
]);

const toolLd = calculatorJsonLd({
  name: "ETF Overlap Detector",
  description:
    "See how much your ETFs overlap. Holding VGS and NDQ? You may have more US tech concentration than you realise.",
  path: "/tools/etf-overlap",
});

const ETF_OVERLAP_FAQS = [
  {
    q: "What is ETF overlap and why does it matter?",
    a: "ETF overlap occurs when two or more ETFs you hold contain many of the same underlying securities. For example, VGS (Vanguard MSCI World ex-Australia) and NDQ (BetaShares NASDAQ 100) both hold large positions in Apple, Microsoft, Amazon, and Nvidia — if you hold both, your effective exposure to these companies is much higher than either ETF's weight suggests individually. Overlap matters because it means you are less diversified than you think: a selloff in US mega-cap technology would hit both ETFs simultaneously. This tool quantifies the overlap by number of shared holdings and weighted exposure.",
  },
  {
    q: "How is the overlap percentage calculated?",
    a: "The overlap percentage is calculated using the weighted holdings overlap method: for each security held in both ETFs, the tool takes the lower of the two weights (by index weight or market cap weight as reported by the ETF issuer), then sums those minimum weights to get the total overlap score. A 40% overlap score means approximately 40 cents in every dollar invested in both ETFs is exposed to the same securities. This is a conservative measure — the actual correlation of returns may be higher or lower depending on how concentrated the shared holdings are.",
  },
  {
    q: "How current is the ETF holdings data?",
    a: "ETF holdings data is sourced from each fund manager's published portfolio disclosure, typically updated monthly (ASX ETF issuers are required to disclose full portfolio holdings monthly). The tool uses the most recent disclosure available. Holdings data for large index ETFs changes slowly between reporting dates — the composition of a broad market index fund is relatively stable month to month. For thematic ETFs with higher turnover, holdings may change more significantly between disclosures. Invest.com.au is not affiliated with any ETF issuer.",
  },
  {
    q: "Should I avoid any ETF overlap in my portfolio?",
    a: "Not necessarily. Some overlap is unavoidable and even desirable — all broad Australian share market ETFs will overlap significantly because they track the same ASX index. The question is whether the overlap is intentional and aligns with your portfolio objectives. Unintentional overlap in a 'diversification' strategy undermines the goal. If you specifically want concentrated exposure to US technology through both an international index ETF and a NASDAQ ETF, that's a deliberate positioning choice. Use this tool to understand your actual exposure rather than assumed exposure.",
  },
];

const etfOverlapFaqLd = faqJsonLd(ETF_OVERLAP_FAQS);

export default function EtfOverlapPage() {
  return (
    <>
      <JsonLd data={[breadcrumbLd, toolLd]} />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <nav aria-label="Breadcrumb" className="text-xs text-slate-500">
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

      <CalculatorLeadCapture
        calcSlug="etf-overlap"
        calcTitle="ETF Overlap"
        need="planning"
        contextKeys={["etf_portfolio", "diversification"]}
      />

      <p className="text-[11px] text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>

      {etfOverlapFaqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(etfOverlapFaqLd) }}
        />
      )}

      <section className="mt-8 border-t border-slate-200 pt-8">
        <h2 className="text-lg font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
        <div className="space-y-3">
          {ETF_OVERLAP_FAQS.map((faq) => (
            <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
              <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                {faq.q}
                <span className="shrink-0 text-slate-500 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
              </summary>
              <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
            </details>
          ))}
        </div>
      </section>
      </div>
    </>
  );
}
