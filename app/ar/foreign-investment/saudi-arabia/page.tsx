/**
 * Arabic Saudi Arabia country page (Phase 5d).
 *
 * Renders the hero + FAQ blocks from SA_CONFIG_AR (translated by an
 * AI sub-agent in Phase 5d, pending native-Arabic reviewer polish).
 *
 * Same shape as the UAE Arabic POC at
 * /ar/foreign-investment/united-arab-emirates. Reuses every styling
 * decision from that page so a single review pass can validate both
 * countries together. The English version at
 * /foreign-investment/saudi-arabia continues to carry the full
 * CountryHubTemplate (DTA table — N/A for SA, Vision 2030 sector
 * tiles, FIRB tool, broker grid) — this Arabic surface renders only
 * the hero + FAQ subset and links out to the English page for the
 * untranslated sections.
 *
 * Robots: noindex until the native-Arabic reviewer pass lands. The
 * UAE page sets the same noindex guard for the same reason.
 */

import Link from "next/link";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";
import { SA_CONFIG } from "@/lib/foreign-investment-country-data";
import { SA_CONFIG_AR } from "@/lib/i18n/translations/sa-ar";

export const metadata: Metadata = {
  title: SA_CONFIG_AR.metadata.title,
  description: SA_CONFIG_AR.metadata.description,
  // No hreflang alternate yet — see file header. Robots noindex
  // until the native-Arabic reviewer pass lands.
  robots: { index: false, follow: true },
  openGraph: {
    title: SA_CONFIG_AR.metadata.ogTitle,
    description: SA_CONFIG_AR.metadata.ogSub,
    locale: "ar_SA",
  },
  alternates: {
    canonical: `${SITE_URL}/ar/foreign-investment/${SA_CONFIG.slug}`,
  },
};

export const revalidate = 86400;

export default function SaudiArabiaInvestingPageArabic() {
  return (
    <main
      dir="rtl"
      lang="ar"
      className="bg-white text-slate-900"
      style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {/* Hero */}
        <section className="mb-10">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-700 mb-3">
            {SA_CONFIG_AR.hero.flagPillText}
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-2">
            {SA_CONFIG_AR.hero.h1Plain}{" "}
            <span className="text-amber-700">{SA_CONFIG_AR.hero.h1Highlight}</span>
          </h1>
          <p className="text-lg text-slate-600 mb-4">{SA_CONFIG_AR.hero.h1Sub}</p>
          <p className="text-base text-slate-700 leading-relaxed">
            {SA_CONFIG_AR.hero.paragraph}
          </p>

          {/* Stats — wrapped dir="ltr" because numerics + percent signs
              read more naturally LTR even inside Arabic prose. */}
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
            {SA_CONFIG_AR.hero.stats.map((stat, idx) => (
              <li
                key={idx}
                className="bg-slate-50 border border-slate-200 rounded-xl p-4"
              >
                <p className="text-xs uppercase tracking-wider text-slate-500 mb-1">
                  {stat.label}
                </p>
                <p
                  dir="ltr"
                  className="text-3xl font-bold text-amber-700 leading-none mb-1 text-end"
                >
                  {stat.value}
                </p>
                <p className="text-xs text-slate-500">{stat.sub}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* FAQ */}
        <section className="mb-10">
          <h2 className="text-2xl font-bold mb-6">الأسئلة الشائعة</h2>
          <ul className="space-y-6">
            {SA_CONFIG_AR.faq.map((entry, idx) => (
              <li key={idx} className="border-b border-slate-200 pb-6 last:border-0">
                <h3 className="text-lg font-semibold text-slate-900 mb-2">
                  {entry.q}
                </h3>
                <p className="text-base text-slate-700 leading-relaxed">{entry.a}</p>
              </li>
            ))}
          </ul>
        </section>

        {/* Pointer to English version for untranslated sections */}
        <section className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <p className="text-sm text-slate-700">
            للاطلاع على الدليل الكامل (قواعد FIRB المفصّلة، استراتيجيات
            تحويل العملات SAR → AUD، تفاصيل التمويل الإسلامي، شبكة
            وسطاء ASX، فرص رؤية 2030):
          </p>
          <Link
            href={`/foreign-investment/${SA_CONFIG.slug}`}
            className="inline-block mt-3 text-amber-800 font-semibold underline underline-offset-2"
          >
            View the full English version &rarr;
          </Link>
        </section>
      </div>
    </main>
  );
}
