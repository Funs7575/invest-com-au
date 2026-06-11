import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { getAllGuides } from "@/lib/how-to-guides";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  SITE_NAME,
  SITE_URL,
  CURRENT_YEAR,
  ORGANIZATION_JSONLD,
  REVIEW_AUTHOR,
} from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import Icon from "@/components/Icon";
import CompactDisclaimerLine from "@/components/CompactDisclaimerLine";

export const revalidate = 3600;

const pageTitle = `How-To Investing Guides (${CURRENT_YEAR})`;
const pageDescription =
  "Step-by-step guides: buy shares, ETFs, Bitcoin, set up an SMSF, claim franking credits & more. Plain English for Australian investors.";

export const metadata: Metadata = {
  title: pageTitle,
  description: pageDescription,
  alternates: { canonical: "/how-to" },
  openGraph: {
    title: pageTitle,
    description: pageDescription,
    url: "/how-to",
    images: [
      {
        url: "/api/og?title=How-To+Investing+Guides&subtitle=Step-by-step+guides+for+Australian+investors&type=default",
        width: 1200,
        height: 630,
        alt: "How-To Investing Guides for Australians",
      },
    ],
  },
  twitter: { card: "summary_large_image" },
};

const GUIDE_ICONS: Record<string, string> = {
  "buy-shares": "trending-up",
  "buy-bitcoin": "bitcoin",
  "buy-etfs": "pie-chart",
  "open-brokerage-account": "user-plus",
  "start-investing": "target",
  "buy-vanguard-etfs": "bar-chart-2",
  "set-up-smsf": "shield",
  "claim-franking-credits": "dollar-sign",
  "buy-cryptocurrency": "cpu",
  "invest-in-property": "home",
  "rebalance-portfolio": "refresh-cw",
  "create-investment-plan": "file-text",
  "invest-small-amounts": "trending-up",
  "build-passive-income": "dollar-sign",
  "invest-in-index-funds": "bar-chart-2",
  "dollar-cost-averaging": "repeat",
  "tax-loss-harvesting": "scissors",
  "dividend-investing-australia": "percent",
  "negative-gear-property": "home",
  "retire-early-australia": "sun",
  "consolidate-super": "shield",
  "salary-sacrifice-super": "shield",
  "claim-lost-super": "search",
  "compare-super-funds": "bar-chart-2",
  "invest-in-etfs-for-beginners": "pie-chart",
  "build-share-portfolio": "layers",
  "invest-in-reits": "home",
  "invest-in-gold": "circle",
  "invest-in-managed-funds": "briefcase",
  "invest-for-children": "heart",
  "transfer-shares-between-brokers": "arrow-right",
  "set-up-family-trust-investing": "users",
  "start-forex-trading": "globe",
  "choose-robo-advisor": "cpu",
  "refinance-home-loan": "home",
  "use-stock-screener": "filter",
  "buy-government-bonds-australia": "shield",
  "open-high-interest-savings": "dollar-sign",
  "build-emergency-fund": "umbrella",
  "buy-term-deposit": "lock",
};

// Category groupings by verticalLink
const CATEGORIES: {
  label: string;
  verticalLink: string;
  image: string;
  description: string;
}[] = [
  {
    label: "Getting Started & Strategy",
    verticalLink: "/investing",
    image: "/images/guides/investing.svg",
    description: "Foundational guides for building your investment strategy",
  },
  {
    label: "Share Trading & ASX",
    verticalLink: "/share-trading",
    image: "/images/guides/share-trading.svg",
    description: "Step-by-step guides to buying and managing Australian shares",
  },
  {
    label: "Cryptocurrency",
    verticalLink: "/crypto",
    image: "/images/guides/crypto.svg",
    description: "How to buy, store, and manage crypto assets in Australia",
  },
  {
    label: "Property Investing",
    verticalLink: "/property",
    image: "/images/guides/property.svg",
    description: "Property investment strategies for Australian investors",
  },
  {
    label: "Superannuation & Retirement",
    verticalLink: "/super",
    image: "/images/guides/super.svg",
    description: "SMSF setup, contributions, and retirement planning guides",
  },
  {
    label: "Savings & Term Deposits",
    verticalLink: "/savings",
    image: "/images/guides/savings.svg",
    description: "High-interest savings, emergency funds, and term deposits",
  },
];

export default function HowToHubPage() {
  const guides = getAllGuides();

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "How-To Guides" },
  ]);

  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: pageTitle,
    description: pageDescription,
    url: absoluteUrl("/how-to"),
    publisher: ORGANIZATION_JSONLD,
    isPartOf: { "@type": "WebSite", name: SITE_NAME, url: SITE_URL },
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "How-To Investing Guides",
    numberOfItems: guides.length,
    itemListElement: guides.map((g, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: g.h1,
      url: absoluteUrl(`/how-to/${g.slug}`),
    })),
  };

  const howToFaqs = [
    {
      q: "What topics do the Invest.com.au how-to guides cover?",
      a: `Invest.com.au how-to guides cover six main areas: share trading and ASX investing (buying shares, opening brokerage accounts, building a portfolio), ETFs and index funds (Vanguard ETFs, index fund strategies), cryptocurrency (buying Bitcoin and crypto in Australia), property investing (negative gearing, buyer's agents, FIRB rules), superannuation and retirement (SMSF setup, salary sacrifice, franking credits, early retirement), and savings and term deposits. All ${guides.length} guides are written specifically for Australian investors and reference current ATO, ASIC, and ASX rules.`,
    },
    {
      q: "Are these how-to guides specific to Australian investors?",
      a: "Yes. All Invest.com.au how-to guides are written specifically for Australian investors and residents. They reference Australian tax rules (ATO, capital gains tax, franking credits), ASIC-regulated brokers and platforms, ASX-listed products, and Australian superannuation law. They are not applicable to investors in other countries without adjustment.",
    },
    {
      q: "Is the information in these guides financial advice?",
      a: "No. Invest.com.au how-to guides are general information only — they do not constitute personal financial advice and do not take into account your individual circumstances, financial situation, or objectives. Before acting on anything in these guides, consider whether it is appropriate for you and, where relevant, seek advice from an AFSL-licensed financial adviser.",
    },
    {
      q: "How current are the how-to guides?",
      a: `All guides on Invest.com.au are reviewed and updated regularly to reflect current Australian legislation, ATO tax rates, ASIC regulatory changes, and broker data. The current edition reflects ${CURRENT_YEAR} rules. Each guide page shows its last-reviewed date.`,
    },
  ];
  const howToFaqLd = faqJsonLd(howToFaqs);

  // Group guides by verticalLink
  const guidesByCategory = CATEGORIES.map((cat) => ({
    ...cat,
    guides: guides.filter((g) => g.verticalLink === cat.verticalLink),
  })).filter((cat) => cat.guides.length > 0);

  // Uncategorised guides (verticalLinks not in CATEGORIES)
  const knownLinks = new Set(CATEGORIES.map((c) => c.verticalLink));
  const otherGuides = guides.filter((g) => !knownLinks.has(g.verticalLink));

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([breadcrumbs, webPageJsonLd, itemListJsonLd]),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToFaqLd) }}
      />

      <div className="py-5 md:py-12">
        <div className="container-custom max-w-4xl">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <span className="mx-1.5 md:mx-2">/</span>
            <span className="text-slate-700">How-To Guides</span>
          </nav>

          <h1 className="text-xl md:text-4xl font-extrabold mb-1.5 md:mb-3">
            How-To Investing Guides for Australians
          </h1>
          <p className="text-xs md:text-base text-slate-500 mb-6 md:mb-10 max-w-2xl">
            <span className="hidden md:inline">
              Step-by-step guides to help you start investing, buy your first
              shares, set up a brokerage account, and more. Written for
              beginners, verified by our editorial team.
            </span>
            <span className="md:hidden">
              Step-by-step investing guides for beginners. Verified by our editorial team.
            </span>
          </p>

          {/* Category sections */}
          <div className="space-y-8 md:space-y-12 mb-8 md:mb-12">
            {guidesByCategory.map((cat) => (
              <section key={cat.verticalLink}>
                {/* Category header with image */}
                <div className="relative rounded-xl overflow-hidden mb-4 h-24 md:h-32">
                  <Image
                    src={cat.image}
                    alt={cat.label}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, 896px"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
                  <div className="absolute inset-0 flex flex-col justify-center px-4 md:px-6">
                    <h2 className="text-base md:text-xl font-bold text-white leading-tight">
                      {cat.label}
                    </h2>
                    <p className="hidden md:block text-xs text-white/70 mt-0.5">
                      {cat.description}
                    </p>
                  </div>
                </div>

                {/* Guides in this category */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {cat.guides.map((guide) => (
                    <Link
                      key={guide.slug}
                      href={`/how-to/${guide.slug}`}
                      className="group flex items-start gap-3 p-4 border border-slate-200 rounded-xl hover:border-slate-700 hover:shadow-md transition-all bg-white"
                    >
                      <Icon
                        name={GUIDE_ICONS[guide.slug] || "book-open"}
                        size={20}
                        className="text-slate-500 group-hover:text-slate-700 shrink-0 mt-0.5 transition-colors"
                      />
                      <div className="min-w-0">
                        <h3 className="text-sm md:text-base font-semibold text-slate-800 group-hover:text-slate-900 leading-snug mb-0.5 transition-colors">
                          {guide.h1}
                        </h3>
                        <p className="text-[0.65rem] md:text-xs text-slate-500 line-clamp-1">
                          {guide.steps.length} steps · ~10 min read
                        </p>
                      </div>
                      <span className="text-slate-300 group-hover:text-slate-600 transition-colors ml-auto shrink-0 text-base">→</span>
                    </Link>
                  ))}
                </div>
              </section>
            ))}

            {/* Remaining guides not in a defined category */}
            {otherGuides.length > 0 && (
              <section>
                <h2 className="text-base md:text-lg font-bold text-slate-700 mb-3">More Guides</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {otherGuides.map((guide) => (
                    <Link
                      key={guide.slug}
                      href={`/how-to/${guide.slug}`}
                      className="group flex items-start gap-3 p-4 border border-slate-200 rounded-xl hover:border-slate-700 hover:shadow-md transition-all bg-white"
                    >
                      <Icon
                        name={GUIDE_ICONS[guide.slug] || "book-open"}
                        size={20}
                        className="text-slate-500 group-hover:text-slate-700 shrink-0 mt-0.5 transition-colors"
                      />
                      <div className="min-w-0">
                        <h3 className="text-sm md:text-base font-semibold text-slate-800 group-hover:text-slate-900 leading-snug mb-0.5 transition-colors">
                          {guide.h1}
                        </h3>
                        <p className="text-[0.65rem] md:text-xs text-slate-500 line-clamp-1">
                          {guide.steps.length} steps · ~10 min read
                        </p>
                      </div>
                      <span className="text-slate-300 group-hover:text-slate-600 transition-colors ml-auto shrink-0 text-base">→</span>
                    </Link>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* CTA */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 md:p-6 text-center">
            <h3 className="text-base md:text-lg font-bold text-slate-900 mb-1 md:mb-2">
              Not sure where to start?
            </h3>
            <p className="text-xs md:text-sm text-slate-600 mb-3 md:mb-4">
              Take our quiz and we&apos;ll recommend the best platform for your
              investing goals.
            </p>
            <Link
              href="/get-matched"
              className="inline-block px-5 py-2.5 md:px-6 md:py-3 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors"
            >
              Take the 60-Second Quiz
            </Link>
          </div>

          {/* E-E-A-T */}
          <div className="mt-5 md:mt-8 text-[0.62rem] md:text-xs text-slate-400 text-center">
            <p>
              All guides reviewed by{" "}
              <a
                href={REVIEW_AUTHOR.url}
                className="underline hover:text-slate-900"
              >
                {REVIEW_AUTHOR.name}
              </a>
              .{" "}
              <Link
                href="/how-we-verify"
                className="underline hover:text-slate-900"
              >
                Our methodology
              </Link>
            </p>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-6">
            <h2 className="text-base font-bold text-slate-900 mb-3">About these guides</h2>
            <div className="divide-y divide-slate-100">
              {howToFaqs.map(({ q, a }) => (
                <details key={q} className="group py-3">
                  <summary className="flex items-center justify-between cursor-pointer list-none text-slate-800 font-medium text-sm leading-snug gap-4">
                    {q}
                    <svg
                      className="w-4 h-4 shrink-0 text-slate-400 group-open:rotate-180 transition-transform"
                      aria-hidden="true"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{a}</p>
                </details>
              ))}
            </div>
          </div>

          <CompactDisclaimerLine />
        </div>
      </div>
    </>
  );
}
