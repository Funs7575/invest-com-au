import Link from "next/link";
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
import Icon from "@/components/Icon";
import CompactDisclaimerLine from "@/components/CompactDisclaimerLine";

export const revalidate = 3600;

const pageTitle = `How-To Investing Guides (${CURRENT_YEAR})`;
const pageDescription =
  "Step-by-step guides: buy shares, ETFs, Bitcoin, set up an SMSF, claim franking credits & more. Plain English for Australian investors.";

export const metadata: Metadata = {
  title: `${pageTitle} | ${SITE_NAME}`,
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
};

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

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify([breadcrumbs, webPageJsonLd, itemListJsonLd]),
        }}
      />

      <div className="py-5 md:py-12">
        <div className="container-custom max-w-4xl">
          {/* Breadcrumb */}
          <nav className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <span className="mx-1.5 md:mx-2">/</span>
            <span className="text-slate-700">How-To Guides</span>
          </nav>

          <h1 className="text-xl md:text-4xl font-extrabold mb-1.5 md:mb-3">
            How-To Investing Guides for Australians
          </h1>
          <p className="text-xs md:text-base text-slate-500 mb-4 md:mb-8 max-w-2xl">
            <span className="hidden md:inline">
              Step-by-step guides to help you start investing, buy your first
              shares, set up a brokerage account, and more. Written for
              beginners, verified by our editorial team.
            </span>
            <span className="md:hidden">
              Step-by-step investing guides for beginners. Verified by our editorial team.
            </span>
          </p>

          {/* Guide grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4 mb-8 md:mb-12">
            {guides.map((guide) => (
              <Link
                key={guide.slug}
                href={`/how-to/${guide.slug}`}
                className="group block p-4 md:p-5 border border-slate-200 rounded-xl hover:border-slate-700 hover:shadow-md transition-all bg-white"
              >
                <div className="flex items-start gap-3">
                  <Icon
                    name={GUIDE_ICONS[guide.slug] || "book-open"}
                    size={24}
                    className="text-slate-700 shrink-0 mt-0.5"
                  />
                  <div className="min-w-0">
                    <h2 className="text-sm md:text-lg font-bold group-hover:text-slate-900 transition-colors leading-tight mb-1">
                      {guide.h1}
                    </h2>
                    <p className="text-[0.65rem] md:text-sm text-slate-500 line-clamp-2">
                      {guide.intro.slice(0, 140)}...
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className="text-[0.6rem] md:text-xs text-slate-400">
                        {guide.steps.length} steps
                      </span>
                      <span className="text-[0.6rem] md:text-xs text-slate-400">
                        ~10 min read
                      </span>
                    </div>
                    <span className="inline-block text-xs md:text-sm font-semibold text-slate-700 mt-2 group-hover:underline">
                      Read Guide
                    </span>
                  </div>
                </div>
              </Link>
            ))}
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
              href="/quiz"
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

          <CompactDisclaimerLine />
        </div>
      </div>
    </>
  );
}
