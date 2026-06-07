import type { Metadata } from "next";
import Link from "next/link";
import DividendCalendar from "@/components/DividendCalendar";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { calculatorJsonLd, faqJsonLd } from "@/lib/schema-markup";
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

const DIV_FAQS = [
  {
    q: "What is an ex-dividend date?",
    a: "The ex-dividend (ex-date) is the cut-off date set by the fund or company. To be entitled to the upcoming distribution, you must own units before the ex-date. If you buy on or after the ex-date, you will not receive that distribution — the price typically falls by approximately the distribution amount on the ex-date to reflect this. The payment date (when cash hits your account) usually follows 2–4 weeks later.",
  },
  {
    q: "How are the estimated distribution amounts calculated?",
    a: "Estimates are based on the ETF's prior declared distributions, adjusted for any recent changes in fund size or payout rate. Because Australian ETFs distribute income from their underlying holdings (dividends, interest, realised gains), the actual amount can differ materially from prior periods — particularly in periods of market volatility, interest rate changes, or when the fund holds assets with irregular income streams.",
  },
  {
    q: "Can I buy the ETF on the ex-date and still receive the distribution?",
    a: "No. If you purchase on or after the ex-date, the seller receives that distribution — not you. This is a common misconception. The fund price typically drops by roughly the distribution amount on the ex-date, meaning buying on ex-date and receiving the distribution isn't a free arbitrage — you pay a higher price before ex-date (which includes the pending distribution) or a lower price after ex-date (ex the distribution).",
  },
  {
    q: "How often do ASX ETFs pay distributions?",
    a: "It varies by fund. Most broad-market ETFs (e.g., VAS, VGS, A200) pay distributions quarterly or half-yearly. Some income-focused ETFs (e.g., high-yield or fixed-income funds) pay monthly distributions. Distribution frequency is stated in each fund's PDS and is visible in the calendar alongside the payment schedule.",
  },
];

const divFaqLd = faqJsonLd(DIV_FAQS);

export default function DividendCalendarPage() {
  return (
    <>
      <JsonLd data={[breadcrumbLd, toolLd, ...(divFaqLd ? [divFaqLd] : [])]} />
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10 space-y-6">
      <nav aria-label="Breadcrumb" className="text-xs text-slate-400">
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

      <div>
        <h2 className="text-base font-extrabold text-slate-900 mb-3">
          Frequently asked questions
        </h2>
        <div className="space-y-3">
          {DIV_FAQS.map((faq) => (
            <details
              key={faq.q}
              className="bg-white border border-slate-200 rounded-xl overflow-hidden group"
            >
              <summary className="px-4 py-3 text-sm font-bold text-slate-900 cursor-pointer hover:bg-slate-50 flex items-center justify-between">
                {faq.q}
                <span className="text-slate-400 group-open:rotate-180 transition-transform ml-2 shrink-0">
                  ▾
                </span>
              </summary>
              <div className="px-4 pb-3">
                <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </div>
            </details>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-slate-500 leading-relaxed">{GENERAL_ADVICE_WARNING}</p>
      </div>
    </>
  );
}
