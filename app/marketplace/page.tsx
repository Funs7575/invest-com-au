import type { Metadata } from "next";
import Link from "next/link";
import { AUSTRALIAN_STATES } from "@/lib/seo/best-pages";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import { getEnabledIntents } from "@/lib/getmatched/intents";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: `Find a verified provider — by category and state (${CURRENT_YEAR}) | Invest.com.au`,
  description:
    "Browse verified Australian providers by category (SMSF property, financial advice, mortgage help, and more) and by state.",
  alternates: { canonical: absoluteUrl("/marketplace") },
};

export default async function FindHubPage() {
  const intents = await getEnabledIntents();
  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Marketplace", url: absoluteUrl("/marketplace") },
  ]);

  return (
    <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      <nav className="text-xs text-slate-500 mb-3">
        <Link href="/" className="hover:underline">Home</Link>
        <span className="mx-2">/</span>
        <span className="text-slate-700">Find a provider</span>
      </nav>
      <h1 className="text-3xl font-extrabold text-slate-900 mb-2">
        Find a verified Australian provider
      </h1>
      <p className="text-slate-600 mb-8 leading-relaxed">
        Pick what you need help with, then drill into your state to see verified
        providers ranked by outcome score, response latency, and tier.
      </p>

      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {intents.map((intent) => (
          <div key={intent.slug} className="bg-white border border-slate-200 rounded-2xl p-5">
            <h2 className="text-base font-bold text-slate-900 mb-1.5">
              {intent.label}
            </h2>
            <ul className="grid grid-cols-2 gap-1.5 mt-2">
              {AUSTRALIAN_STATES.map((s) => (
                <li key={s.slug}>
                  <Link
                    href={`/marketplace/${intent.slug}/${s.slug}`}
                    className="block text-xs text-slate-700 hover:text-amber-700 hover:underline"
                  >
                    {s.code}
                  </Link>
                </li>
              ))}
              <li className="col-span-2 mt-1">
                <Link
                  href={`/marketplace/${intent.slug}`}
                  className="text-xs text-amber-700 font-semibold hover:underline"
                >
                  All Australia →
                </Link>
              </li>
            </ul>
          </div>
        ))}
      </section>
    </main>
  );
}
