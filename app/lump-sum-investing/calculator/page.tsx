import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, SITE_URL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd, speakableWebPageJsonLd } from "@/lib/schema-markup";
import LumpSumCalculatorClient from "./LumpSumCalculatorClient";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Lump-Sum Compound Growth Calculator Australia | Invest.com.au",
  description:
    "Project a lump sum's growth over 1–30 years. Three-scenario comparison, monthly contribution and tax-on-returns option. SMSF, marginal and tax-free outcomes.",
  alternates: { canonical: `${SITE_URL}/lump-sum-investing/calculator` },
  openGraph: {
    title: "Lump-Sum Compound Growth Calculator Australia",
    description: "Project a lump sum's growth with monthly top-ups, return assumptions and tax outcomes.",
    url: `${SITE_URL}/lump-sum-investing/calculator`,
    type: "website",
  },
};

const breadcrumb = breadcrumbJsonLd([
  { name: "Home", url: `${SITE_URL}/` },
  { name: "Lump-Sum Investing", url: absoluteUrl("/lump-sum-investing") },
  { name: "Calculator", url: absoluteUrl("/lump-sum-investing/calculator") },
]);

const faqLd = faqJsonLd([
  {
    q: "Is it better to invest a lump sum all at once or dollar-cost average?",
    a: "Research (Vanguard 2012; UK Barclays 2020) shows lump-sum investing beats dollar-cost averaging roughly two-thirds of the time in rising markets, simply because more capital is exposed to growth for longer. DCA may be lower-regret when markets are clearly extended, but timing is difficult. For most long-horizon investors, investing a lump sum promptly is statistically optimal.",
  },
  {
    q: "What should I invest a lump sum in?",
    a: "Depends on your investment horizon. For 10+ years, a diversified low-cost index portfolio (broad Australian + global equities via ETFs) has historically produced the best risk-adjusted returns. For 5–10 years, a balanced (60/40) approach. For under 5 years, consider high-interest savings or term deposits to avoid sequence risk. Always consider your specific goals, risk tolerance, and tax situation.",
  },
  {
    q: "How does compound interest work on a lump-sum investment?",
    a: "Returns earned on the initial lump sum generate their own returns in subsequent periods. A $50,000 investment earning 8% p.a. grows to approximately $107,946 after 10 years — the extra $57,946 includes $18,946 of compound 'returns on returns.' The effect accelerates with time; over 20 years the same investment reaches approximately $233,048.",
  },
  {
    q: "What is the impact of fees on a lump-sum investment?",
    a: "Fees compound against you exactly as returns compound for you. A 1.5% management fee vs a 0.15% fee on a $100,000 investment over 20 years at 8% gross reduces the final portfolio from ~$449k (0.15% fee) to ~$355k (1.5% fee) — a $94k difference on a $100k initial investment. Minimising fees has outsized impact on lump-sum outcomes.",
  },
  {
    q: "Should I put my lump sum into superannuation?",
    a: "If eligible, super can be very tax-effective: concessional contributions are taxed at 15% (vs up to 47% marginal rate), and returns inside super are taxed at 15% in accumulation (or 0% in pension phase). The drawback is preservation — money is locked until your preservation age (currently 60). This makes super ideal for long-horizon retirement savings but unsuitable if you may need the funds sooner.",
  },
]);

const speakableLd = speakableWebPageJsonLd({
  name: "Lump-Sum Compound Growth Calculator",
  path: "/lump-sum-investing/calculator",
  selectors: ["h1"],
});

export default function LumpSumCalculatorPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(speakableLd) }} />
      <div className="bg-white min-h-screen">
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom max-w-3xl">
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <Link href="/lump-sum-investing" className="hover:text-white">Lump-Sum Investing</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Calculator</span>
            </nav>
            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight mb-3">Lump-Sum Compound Growth Calculator</h1>
            <p className="text-slate-300">Project the growth of a lump sum over 1–30 years, with monthly top-ups and tax outcomes.</p>
          </div>
        </section>
        <section className="py-10 bg-slate-50">
          <div className="container-custom max-w-3xl">
            <LumpSumCalculatorClient />
          </div>
        </section>
      </div>
    </>
  );
}
