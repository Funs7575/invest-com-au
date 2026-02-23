import Link from "next/link";
import type { Metadata } from "next";
import { getAllCategories } from "@/lib/best-broker-categories";
import { absoluteUrl, breadcrumbJsonLd, REVIEW_AUTHOR } from "@/lib/seo";
import Icon from "@/components/Icon";

export const metadata: Metadata = {
  title: "Best Brokers in Australia (2026) — By Category",
  description:
    "Find the best Australian broker for your needs. Guides for beginners, US shares, low fees, CHESS-sponsored, SMSF, crypto, and low FX fees.",
  alternates: { canonical: "/best" },
  openGraph: {
    title: "Best Brokers in Australia (2026) — By Category",
    description:
      "Find the best Australian broker for your needs. Guides for beginners, US shares, low fees, CHESS-sponsored, SMSF, crypto, and low FX fees.",
    url: "/best",
    images: [
      {
        url: "/api/og?title=Best+Brokers+in+Australia&subtitle=By+Category+—+Beginners%2C+US+Shares%2C+Low+Fees+%26+More&type=best",
        width: 1200,
        height: 630,
        alt: "Best Brokers in Australia by Category",
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
};

export default function BestBrokersHub() {
  const categories = getAllCategories();

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Best Brokers" },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      <div className="py-12">
        <div className="container-custom max-w-4xl">
          {/* Breadcrumb */}
          <nav className="text-sm text-slate-500 mb-6">
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span className="text-slate-700">Best Brokers</span>
          </nav>

          <h1 className="text-3xl md:text-4xl font-extrabold mb-3">
            Best Brokers in Australia by Category
          </h1>
          <p className="text-slate-600 mb-8 max-w-2xl">
            Not sure which broker is right for you? We&apos;ve built detailed guides for
            every type of investor. Each guide filters, ranks, and explains the
            best options based on verified fees and our editorial methodology.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
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
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
            <h3 className="text-lg font-bold text-slate-900 mb-2">
              Still not sure?
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Answer 4 quick questions and we&apos;ll recommend the best broker
              for your situation.
            </p>
            <Link
              href="/quiz"
              className="inline-block px-6 py-3 bg-slate-900 text-white font-semibold rounded-lg hover:bg-slate-800 transition-colors"
            >
              Take the 60-Second Quiz →
            </Link>
          </div>

          {/* E-E-A-T footer */}
          <div className="mt-8 text-xs text-slate-400 text-center">
            <p>
              All guides are reviewed by{" "}
              <a href={REVIEW_AUTHOR.url} className="underline hover:text-slate-900">
                {REVIEW_AUTHOR.name}
              </a>
              . Fees verified against official broker pricing pages.{" "}
              <Link href="/how-we-verify" className="underline hover:text-slate-900">
                Our methodology
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
