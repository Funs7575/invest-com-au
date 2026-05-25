import type { Metadata } from "next";
import Link from "next/link";
import { breadcrumbJsonLd, absoluteUrl } from "@/lib/seo";
import { HELP_CATEGORIES } from "@/lib/help-content";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Help Centre | Invest.com.au",
  description: "Answers to common questions about using invest.com.au — broker comparisons, calculators, accounts, and investing basics.",
  alternates: { canonical: "/help" },
  openGraph: {
    title: "Help Centre | Invest.com.au",
    description: "Find answers to common questions about broker comparisons, calculators, and investing basics.",
    url: absoluteUrl("/help"),
  },
};

const breadcrumb = breadcrumbJsonLd([
  { name: "Home", url: absoluteUrl("/") },
  { name: "Help Centre", url: absoluteUrl("/help") },
]);

const CATEGORY_ICONS: Record<string, string> = {
  "getting-started": "🚀",
  "brokers": "📊",
  "investing-basics": "📚",
  "account": "👤",
};

export default function HelpIndexPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <div className="bg-gradient-to-b from-slate-50 to-white min-h-screen">
        {/* Header */}
        <div className="bg-slate-900 text-white py-10 md:py-16 px-4">
          <div className="container-custom max-w-3xl text-center">
            <h1 className="text-2xl md:text-4xl font-extrabold mb-3">Help Centre</h1>
            <p className="text-slate-300 text-sm md:text-base">
              Find answers to common questions about invest.com.au
            </p>
          </div>
        </div>

        <div className="container-custom max-w-4xl py-8 md:py-12 px-4">
          {/* Breadcrumb */}
          <nav className="text-xs text-slate-500 mb-8">
            <Link href="/" className="hover:text-slate-700">Home</Link>
            <span className="mx-1.5">/</span>
            <span className="text-slate-700">Help Centre</span>
          </nav>

          {/* Categories grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10">
            {HELP_CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/help/${cat.slug}`}
                className="group bg-white border border-slate-200 rounded-xl p-5 hover:border-blue-300 hover:shadow-sm transition-all"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl" aria-hidden="true">
                    {CATEGORY_ICONS[cat.slug] ?? "📄"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <h2 className="text-sm md:text-base font-bold text-slate-900 group-hover:text-blue-700 mb-1">
                      {cat.title}
                    </h2>
                    <p className="text-xs text-slate-500 line-clamp-2">{cat.description}</p>
                    <p className="text-xs text-slate-400 mt-2">
                      {cat.articles.length} article{cat.articles.length !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Quick links */}
          <div className="border-t border-slate-100 pt-8">
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-4">
              Popular Articles
            </h2>
            <ul className="space-y-2">
              {HELP_CATEGORIES.flatMap((cat) =>
                cat.articles.slice(0, 2).map((art) => (
                  <li key={`${cat.slug}/${art.slug}`}>
                    <Link
                      href={`/help/${cat.slug}/${art.slug}`}
                      className="text-sm text-blue-700 hover:underline"
                    >
                      {art.title}
                    </Link>
                    <span className="text-xs text-slate-400 ml-2">— {cat.title}</span>
                  </li>
                ))
              )}
            </ul>
          </div>

          {/* Contact */}
          <div className="mt-10 bg-slate-50 border border-slate-200 rounded-xl p-5 text-center">
            <p className="text-sm font-semibold text-slate-800 mb-1">Can&apos;t find what you&apos;re looking for?</p>
            <p className="text-xs text-slate-500 mb-3">
              Email us at{" "}
              <a href="mailto:help@invest.com.au" className="text-blue-700 hover:underline">
                help@invest.com.au
              </a>{" "}
              — we respond within 1 business day.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
