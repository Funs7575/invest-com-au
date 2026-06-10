import Link from "next/link";
import type { Metadata } from "next";
import { getAllCategories } from "@/lib/best-broker-categories";
import { absoluteUrl, breadcrumbJsonLd, REVIEW_AUTHOR, CURRENT_YEAR } from "@/lib/seo";
import Icon from "@/components/Icon";
import { SHOW_BEST_PICKS } from "@/lib/compliance-config";
import ComplianceFooter from "@/components/ComplianceFooter";
import { faqJsonLd } from "@/lib/schema-markup";

const BEST_PLATFORM_FAQS = [
  {
    q: "What is the best investing platform in Australia for beginners?",
    a: "For most beginners, a CHESS-sponsored broker with simple flat-fee pricing is the best starting point. Options like SelfWealth ($9.50 flat brokerage, CHESS-sponsored), Stake (fractional US shares, simple interface), or Pearler (designed for long-term investing, auto-invest feature) suit investors starting out. Avoid platforms with complex interfaces, margin lending, or CFD features until you understand the basics. Also consider whether you primarily want ASX shares/ETFs (most Australian platforms) or US/international shares (Stake, Interactive Brokers, CMC Markets). Start simple — you can always change platforms later.",
  },
  {
    q: "What does CHESS-sponsored mean and why does it matter?",
    a: "CHESS (Clearing House Electronic Subregister System) is the ASX's share settlement and registration system. A CHESS-sponsored account means your shares are registered in your name (you receive a HIN — Holder Identification Number) directly with the ASX, not held on a nominee or custodial basis by the broker. This matters because if your broker becomes insolvent, your shares are protected — they're yours, not the broker's. Non-CHESS (custodial) brokers are cheaper but hold shares in a pooled account; your claim becomes an unsecured creditor claim in insolvency. Stake, Tiger Brokers, moomoo use custodial structure. CommSec, SelfWealth, Pearler, Westpac are CHESS-sponsored.",
  },
  {
    q: "How do I choose between CommSec, SelfWealth, Stake and other brokers?",
    a: "The right broker depends on what you're buying and how often you trade. For ASX shares: CommSec is the most established but charges $19.95 minimum (0.12%); SelfWealth charges $9.50 flat and is CHESS-sponsored; Pearler charges $6.50 and is built for long-term investors with auto-invest and dividend reinvestment. For US shares: Stake charges USD$3 flat and has a clean interface; CMC Markets charges 0.15% min USD$3.99; Interactive Brokers is cheapest at scale but complex. For ETFs: Superhero offers $0 brokerage on ETFs (min $100) and Pearler offers low flat fees. Beginners should start with a simple CHESS-sponsored ASX broker.",
  },
  {
    q: "Are investing platforms regulated in Australia?",
    a: "Yes. All legitimate investing platforms operating in Australia must hold (or operate under) an Australian Financial Services Licence (AFSL) issued by ASIC. This means they must meet capital adequacy requirements, maintain client money separately from their own funds, and comply with dispute resolution obligations. You can verify any platform's AFSL at ASIC Connect or our AFSL Lookup tool. For platforms with custodial (non-CHESS) structures, client money protections still apply, but you should understand that shares are held by a third party on your behalf.",
  },
];

const bestPlatformFaqLd = faqJsonLd(BEST_PLATFORM_FAQS);

export const revalidate = 3600;

const bestTitle = SHOW_BEST_PICKS
  ? `Best Investing Platforms (${CURRENT_YEAR})`
  : `Platform Comparison Guides (${CURRENT_YEAR})`;

export const metadata: Metadata = {
  title: bestTitle,
  description:
    SHOW_BEST_PICKS
      ? "Find the best Australian investing platform for your needs. 20+ category guides covering beginners, low fees, crypto, robo-advisors, ETFs, dividends, and more."
      : "Compare Australian investing platforms by category. 20+ guides covering beginners, low fees, crypto, robo-advisors, ETFs, dividends, and more.",
  alternates: { canonical: "/best" },
  openGraph: {
    title: bestTitle,
    description:
      "Compare Australian investing platforms by category. 20+ guides covering beginners, low fees, crypto, robo-advisors, ETFs, dividends, and more.",
    url: "/best",
    images: [
      {
        url: "/api/og?title=Platform+Comparison+Guides&subtitle=By+Category+—+Beginners%2C+Crypto%2C+Low+Fees+%26+More&type=best",
        width: 1200,
        height: 630,
        alt: "Best Investing Platforms in Australia by Category",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

const categoryIcons: Record<string, string> = {
  beginners: "target",
  "us-shares": "globe",
  "low-fees": "coins",
  "chess-sponsored": "shield-check",
  smsf: "building",
  crypto: "bitcoin",
  "low-fx-fees": "arrow-left-right",
  "free-brokerage": "gift",
  "under-5-dollars": "tag",
  "no-inactivity-fee": "clock",
  "international-shares": "globe",
  "day-trading": "zap",
  "dividend-investing": "trending-up",
  "etf-investing": "pie-chart",
  "mobile-app": "smartphone",
  "fractional-shares": "scissors",
  "joint-accounts": "users",
  "trust-accounts": "briefcase",
  children: "baby",
  "low-minimum-deposit": "piggy-bank",
};

export default function BestBrokersHub() {
  const categories = getAllCategories();

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Best Platforms" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      {bestPlatformFaqLd && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(bestPlatformFaqLd) }} />
      )}

      <div className="py-5 md:py-12">
        <div className="container-custom max-w-4xl">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <span className="mx-1.5 md:mx-2">/</span>
            <span className="text-slate-700">Best Platforms</span>
          </nav>

          <h1 className="text-xl md:text-4xl font-extrabold mb-1.5 md:mb-3">
            Best Investing Platforms by Category
          </h1>
          <p className="text-xs md:text-base text-slate-500 mb-4 md:mb-8 max-w-2xl">
            <span className="hidden md:inline">Not sure which platform is right for you? We&apos;ve built detailed guides for
            every type of investor. Each guide filters, ranks, and explains the
            best options based on verified fees and our editorial methodology.</span>
            <span className="md:hidden">Detailed guides for every type of investor — filtered, ranked, and verified.</span>
          </p>

          {/* Mobile: compact 2-col grid */}
          <div className="md:hidden grid grid-cols-2 gap-2 mb-6">
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/best/${cat.slug}`}
                className="group block p-2.5 border border-slate-200 rounded-lg hover:border-slate-700 active:scale-[0.98] transition-all bg-white"
              >
                <div className="flex items-center gap-2 mb-1">
                  <Icon name={categoryIcons[cat.slug] || "bar-chart"} size={14} className="text-slate-500 shrink-0" />
                  <h2 className="text-xs font-bold text-slate-900 leading-tight line-clamp-2">
                    {cat.h1.replace(" in Australia", "").replace("Best ", "")}
                  </h2>
                </div>
                <p className="text-[0.68rem] text-slate-400 leading-snug line-clamp-2">
                  {cat.intro ? cat.intro.slice(0, 60) + '...' : cat.metaDescription.slice(0, 60) + '...'}
                </p>
              </Link>
            ))}
          </div>

          {/* Desktop: spacious 2-col grid */}
          <div className="hidden md:grid md:grid-cols-2 gap-4 mb-12">
            {categories.map((cat, idx) => (
              <Link
                key={cat.slug}
                href={`/best/${cat.slug}`}
                className={`group block p-5 border border-slate-200 rounded-xl hover:border-slate-700 hover:shadow-md transition-all${
                  categories.length % 2 !== 0 && idx === categories.length - 1
                    ? " md:col-span-2 md:max-w-md md:mx-auto"
                    : ""
                }`}
              >
                <div className="flex items-start gap-3">
                  <Icon name={categoryIcons[cat.slug] || "bar-chart"} size={24} className="text-slate-700 shrink-0 mt-0.5" />
                  <div>
                    <h2 className="text-lg font-bold group-hover:text-slate-900 transition-colors">
                      {cat.h1.replace(" in Australia", "")}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                      {cat.metaDescription}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* CTA */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-6 text-center">
            <h3 className="text-base md:text-lg font-bold text-slate-900 mb-1 md:mb-2">
              Still not sure?
            </h3>
            <p className="text-xs md:text-sm text-slate-600 mb-3 md:mb-4">
              Answer 4 quick questions and we&apos;ll recommend the best platform
              for your situation.
            </p>
            <Link
              href="/get-matched"
              className="inline-block px-5 py-2.5 md:px-6 md:py-3 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors"
            >
              Take the 60-Second Quiz →
            </Link>
          </div>

          {/* FAQ */}
          <div className="mt-10 pt-6 border-t border-slate-200">
            <h2 className="text-base font-bold text-slate-900 mb-4">Frequently asked questions</h2>
            <div className="space-y-3">
              {BEST_PLATFORM_FAQS.map((faq) => (
                <details key={faq.q} className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden group">
                  <summary className="px-5 py-4 text-sm font-bold text-slate-900 cursor-pointer hover:bg-slate-100 flex items-center justify-between">
                    {faq.q}
                    <span className="text-slate-400 group-open:rotate-180 transition-transform ml-2 shrink-0" aria-hidden="true">▾</span>
                  </summary>
                  <div className="px-5 pb-4">
                    <p className="text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>

          {/* E-E-A-T footer */}
          <div className="mt-5 md:mt-8 text-xs text-slate-400 text-center">
            <p>
              All guides are reviewed by{" "}
              <a href={REVIEW_AUTHOR.url} className="underline hover:text-slate-900">
                {REVIEW_AUTHOR.name}
              </a>
              . Fees verified against official platform pricing pages.{" "}
              <Link href="/how-we-verify" className="underline hover:text-slate-900">
                Our methodology
              </Link>
            </p>
          </div>
          <ComplianceFooter />
        </div>
      </div>
    </>
  );
}
