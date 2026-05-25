import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, SITE_URL, absoluteUrl } from "@/lib/seo";
import { faqJsonLd, speakableWebPageJsonLd } from "@/lib/schema-markup";
import FrankingCalculatorClient from "./FrankingCalculatorClient";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Franking Credits Calculator: Your After-Tax Dividend Income | Invest.com.au",
  description:
    "Enter your dividend, franking percentage and tax rate. See the franking credit, grossed-up dividend, tax payable and net after-tax income — including SMSF pension-phase outcomes.",
  alternates: { canonical: `${SITE_URL}/dividends/calculator` },
  openGraph: {
    title: "Franking Credits Calculator: Your After-Tax Dividend Income",
    description: "Free calculator covering personal marginal rates and SMSF accumulation/pension.",
    url: `${SITE_URL}/dividends/calculator`,
    type: "website",
  },
};

const breadcrumb = breadcrumbJsonLd([
  { name: "Home", url: `${SITE_URL}/` },
  { name: "Dividends", url: absoluteUrl("/dividends") },
  { name: "Calculator", url: absoluteUrl("/dividends/calculator") },
]);

const faqLd = faqJsonLd([
  {
    q: "How are franking credits calculated on Australian dividends?",
    a: "Franking credits = Cash dividend × (corporate tax rate ÷ (1 − corporate tax rate)). For a fully franked $70 dividend from a 30%-rate company: $70 × (30/70) = $30 of franking credits. The grossed-up dividend (what you report as assessable income) is $70 + $30 = $100.",
  },
  {
    q: "What is the difference between fully franked and partly franked dividends?",
    a: "Fully franked means 100% of the company tax has been paid on the profit distributed; the franking credit covers the full imputed corporate tax. Partly franked means only a proportion of corporate tax has been paid (e.g. 50% franked = half the imputed tax is attached). Unfranked dividends have no franking credits.",
  },
  {
    q: "How do SMSF members benefit from franking credits?",
    a: "A SMSF in accumulation phase pays 15% tax on income; most fully franked dividends generate more franking credit than tax owed, resulting in a net tax offset that can reduce total SMSF tax payable. In pension phase (0% tax), the full franking credit is refunded as cash — making fully franked shares one of the most tax-efficient income sources for retirees drawing a pension from their SMSF.",
  },
  {
    q: "Can I get a franking credit refund as an individual?",
    a: "Yes. If your total income tax payable (including Medicare levy) for the year is less than the total franking credits attached to dividends you received, the ATO refunds the shortfall. This is most common for low-income earners, pensioners, and those below the tax-free threshold ($18,200 for 2024–25).",
  },
  {
    q: "Do I include franking credits in my tax return?",
    a: "Yes. You report both the cash dividend and the franking credit as assessable income (the grossed-up amount), then claim the franking credit as an offset against your calculated tax liability. Your broker's annual tax statement will show the grossed-up amounts and franking credits for each dividend received.",
  },
]);

const speakableLd = speakableWebPageJsonLd({
  name: "Franking Credits Calculator",
  path: "/dividends/calculator",
  selectors: ["h1"],
});

export default function FrankingCalculatorPage() {
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
              <Link href="/dividends" className="hover:text-white">Dividends</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Calculator</span>
            </nav>
            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight mb-3">Franking Credits Calculator</h1>
            <p className="text-slate-300">Enter your numbers, pick your tax rate, see the after-tax outcome.</p>
          </div>
        </section>
        <section className="py-10 bg-slate-50">
          <div className="container-custom max-w-3xl">
            <FrankingCalculatorClient />
          </div>
        </section>
      </div>
    </>
  );
}
