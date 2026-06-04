import type { Metadata } from "next";
import Link from "next/link";
import DividendCalendar from "@/components/DividendCalendar";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { calculatorJsonLd } from "@/lib/schema-markup";
import JsonLd from "@/components/JsonLd";

export const metadata: Metadata = {
  title: "ETF Dividend Calendar | Invest.com.au",
  description: "Upcoming ASX ETF distribution ex-dates and payment dates. Know when to own shares to receive your distribution.",
  openGraph: { title: "ETF Dividend Calendar", description: "Track upcoming ETF ex-dates and distribution payments." },
  alternates: { canonical: `${SITE_URL}/tools/dividend-calendar` },
};

const breadcrumbLd = breadcrumbJsonLd([
  { name: "Home", url: SITE_URL },
  { name: "Tools", url: `${SITE_URL}/tools` },
  { name: "ETF Dividend Calendar", url: `${SITE_URL}/tools/dividend-calendar` },
]);

const toolLd = calculatorJsonLd({
  name: "ETF Dividend Calendar",
  description:
    "Upcoming ASX ETF distribution ex-dates and payment dates. Know when to own shares to receive your distribution.",
  path: "/tools/dividend-calendar",
});

export default function DividendCalendarPage() {
  return (
    <>
      <JsonLd data={[breadcrumbLd, toolLd]} />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <nav className="text-xs text-slate-400">
        <Link href="/tools" className="hover:text-violet-700">Tools</Link>
        <span className="mx-1">›</span>
        <span className="text-slate-600">Dividend Calendar</span>
      </nav>

      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">ETF Dividend Calendar</h1>
        <p className="text-slate-500 mt-2 text-sm leading-relaxed">
          Track upcoming ETF distribution ex-dates and payment dates. To receive a distribution you must own
          shares <strong>before</strong> the ex-date. Amounts shown are estimates based on prior distributions
          and may differ from the actual declared amount.
        </p>
      </div>

      <DividendCalendar />

      <p className="text-[11px] text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
      </div>
    </>
  );
}
