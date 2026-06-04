import type { Metadata } from "next";
import Link from "next/link";
import PortfolioStressTest from "@/components/PortfolioStressTest";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { calculatorJsonLd } from "@/lib/schema-markup";
import JsonLd from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "Portfolio Stress Test | Invest.com.au",
  description: "See how your portfolio allocation would have fared during the GFC, COVID crash, dot-com bust and 2022 rate hike cycle.",
  openGraph: { title: "Portfolio Stress Test", description: "Stress-test your portfolio against historical market crises." },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: SITE_URL },
  { name: "Tools", url: `${SITE_URL}/tools` },
  { name: "Portfolio Stress Test", url: `${SITE_URL}/tools/portfolio-stress-test` },
]);

const toolLd = calculatorJsonLd({
  name: "Portfolio Stress Test",
  description:
    "See how your portfolio allocation would have fared during the GFC, COVID crash, dot-com bust and 2022 rate hike cycle.",
  path: "/tools/portfolio-stress-test",
});

export default function PortfolioStressTestPage() {
  return (
    <>
      <JsonLd data={[breadcrumbLd, toolLd]} />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <nav className="text-xs text-slate-400">
        <Link href="/tools" className="hover:text-violet-700">Tools</Link>
        <span className="mx-1">›</span>
        <span className="text-slate-600">Portfolio Stress Test</span>
      </nav>

      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Portfolio Stress Test</h1>
        <p className="text-slate-500 mt-2 text-sm leading-relaxed">
          How would your portfolio have performed during the worst market crises of the last 40 years?
          Enter your approximate asset allocation and see estimated drawdowns for each historical scenario.
          Uses broad asset-class averages from documented peak-to-trough data.
        </p>
      </div>

      <PortfolioStressTest />

      <p className="text-[11px] text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
      </div>
    </>
  );
}
