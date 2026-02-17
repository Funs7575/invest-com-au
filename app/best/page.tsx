import Link from "next/link";
import type { Metadata } from "next";
import { getAllCategories } from "@/lib/best-broker-categories";
import { absoluteUrl, breadcrumbJsonLd, REVIEW_AUTHOR } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Best Brokers in Australia (2026) — By Category",
  description:
    "Find the best Australian broker for your needs. Guides for beginners, US shares, low fees, CHESS-sponsored, SMSF, crypto, and low FX fees.",
  alternates: { canonical: "/best" },
};

const categoryIcons: Record<string, string> = {
  beginners: "🎯",
  "us-shares": "🇺🇸",
  "low-fees": "💰",
  "chess-sponsored": "🛡️",
  smsf: "🏛️",
  crypto: "₿",
  "low-fx-fees": "🌐",
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
            <Link href="/" className="hover:text-green-700">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span className="text-green-700">Best Brokers</span>
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
            {categories.map((cat) => (
              <Link
                key={cat.slug}
                href={`/best/${cat.slug}`}
                className="group block p-5 border border-slate-200 rounded-xl hover:border-green-700 hover:shadow-md transition-all"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">
                    {categoryIcons[cat.slug] || "📊"}
                  </span>
                  <div>
                    <h2 className="text-lg font-bold group-hover:text-green-700 transition-colors">
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
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
            <h3 className="text-lg font-bold text-green-900 mb-2">
              Still not sure?
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              Answer 4 quick questions and we&apos;ll recommend the best broker
              for your situation.
            </p>
            <Link
              href="/quiz"
              className="inline-block px-6 py-3 bg-green-700 text-white font-semibold rounded-lg hover:bg-green-800 transition-colors"
            >
              Take the 60-Second Quiz →
            </Link>
          </div>

          {/* E-E-A-T footer */}
          <div className="mt-8 text-xs text-slate-400 text-center">
            <p>
              All guides are reviewed by{" "}
              <a href={REVIEW_AUTHOR.url} className="underline hover:text-green-700">
                {REVIEW_AUTHOR.name}
              </a>
              . Fees verified against official broker pricing pages.{" "}
              <Link href="/how-we-verify" className="underline hover:text-green-700">
                Our methodology
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
