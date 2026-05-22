import Link from "next/link";
import type { Metadata } from "next";
import { getAllCategories } from "@/lib/best-broker-categories";
import { absoluteUrl, breadcrumbJsonLd, REVIEW_AUTHOR, CURRENT_YEAR } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import Icon from "@/components/Icon";
import { SHOW_BEST_PICKS } from "@/lib/compliance-config";
import ComplianceFooter from "@/components/ComplianceFooter";

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

const BEST_PLATFORMS_FAQS = faqJsonLd([
  {
    q: "How are the best investing platforms ranked on Invest.com.au?",
    a: "Platforms are ranked using a verified methodology that compares brokerage fees, account fees, available markets, platform features, and CHESS sponsorship status. Fee data is checked directly against official platform pricing pages and updated regularly. Editorial scores are assigned independently of any commercial relationships.",
  },
  {
    q: "Are “best broker” recommendations personalised?",
    a: "The category guides on this page are not personalised — they reflect the best platforms for a typical investor in each category. For a personalised recommendation based on your experience level, portfolio size, and goals, take the 60-second quiz on this page.",
  },
  {
    q: "What is the difference between a full-service broker and a discount broker?",
    a: "A full-service broker provides advice, research, and portfolio management alongside trade execution, typically charging higher fees or a percentage of assets. A discount (or online) broker executes trades at a flat brokerage fee without personalised advice. Most guides on Invest.com.au cover discount brokers suited to self-directed investors.",
  },
  {
    q: "Do beginner investors need a financial advisor?",
    a: "Not necessarily. Beginners with straightforward goals — such as building a diversified ETF portfolio — can often start investing using a low-cost online platform without advice. A licensed financial advisor adds value when your situation involves complex tax, super, insurance, or estate-planning needs.",
  },
  {
    q: "How often are the best platform rankings updated?",
    a: "Rankings are reviewed at least every 12 months, with fee data verified more frequently when platforms announce pricing changes. Each guide displays the date it was last reviewed so you can assess how current the information is.",
  },
]);

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
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(BEST_PLATFORMS_FAQS) }}
      />

      <div className="py-5 md:py-12">
        <div className="container-custom max-w-4xl">
          {/* Breadcrumb */}
          <nav className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
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
              href="/quiz"
              className="inline-block px-5 py-2.5 md:px-6 md:py-3 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors"
            >
              Take the 60-Second Quiz →
            </Link>
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
