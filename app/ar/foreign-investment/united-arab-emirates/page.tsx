/**
 * Arabic UAE country page (Phase 5b POC).
 *
 * Renders the hero + FAQ blocks from AE_CONFIG_AR (translated by an
 * AI sub-agent in Phase 5a, pending native-Arabic reviewer polish).
 *
 * NOT YET WIRED to public hreflang. Reasons:
 *   - The translation hasn't been through a native-Arabic reviewer
 *   - The full CountryHubTemplate has many sections (DTA rate table,
 *     FX corridor, pension transfer, FIRB tiles…) that AE_CONFIG_AR
 *     doesn't translate. This page renders only the translated
 *     subset — hero + FAQ + a "view English version" link for the
 *     untranslated content. Better than blocking the whole launch
 *     on full translation; still better than shipping mixed
 *     EN/AR rendering.
 *   - The root <html lang> + <html dir> remain en-AU / ltr because
 *     proxy.ts doesn't stamp the pathname header yet (Phase 5c).
 *     Local dir="rtl" on the <main> wrapper handles text flow.
 *
 * The route exists so:
 *   1. The translation file gets exercised (build-time check that
 *      AE_CONFIG_AR's shape stays valid)
 *   2. A reviewer can visit /ar/foreign-investment/united-arab-emirates
 *      to see the rendered Arabic in context
 *   3. Phase 5c can wire hreflang once the native-review pass lands
 */

import Link from "next/link";
import type { Metadata } from "next";
import { SITE_URL } from "@/lib/seo";
import { AE_CONFIG } from "@/lib/foreign-investment-country-data";
import { AE_CONFIG_AR } from "@/lib/i18n/translations/ae-ar";

export const metadata: Metadata = {
  title: AE_CONFIG_AR.metadata.title,
  description: AE_CONFIG_AR.metadata.description,
  // No hreflang alternate yet — see file header comment. Robots are
  // told not to index until the native-Arabic reviewer pass lands.
  robots: { index: false, follow: true },
  openGraph: {
    title: AE_CONFIG_AR.metadata.ogTitle,
    description: AE_CONFIG_AR.metadata.ogSub,
    locale: "ar_AE",
  },
  alternates: {
    canonical: `${SITE_URL}/ar/foreign-investment/${AE_CONFIG.slug}`,
  },
};

export const revalidate = 86400;

export default function UAEInvestingPageArabic() {
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
            {AE_CONFIG_AR.hero.flagPillText}
          </p>
          <h1 className="text-3xl sm:text-4xl font-bold leading-tight mb-2">
            {AE_CONFIG_AR.hero.h1Plain}{" "}
            <span className="text-amber-700">{AE_CONFIG_AR.hero.h1Highlight}</span>
          </h1>
          <p className="text-lg text-slate-600 mb-4">{AE_CONFIG_AR.hero.h1Sub}</p>
          <p className="text-base text-slate-700 leading-relaxed">
            {AE_CONFIG_AR.hero.paragraph}
          </p>

          {/* Stats — wrapped dir="ltr" because numerics + percent signs
              read more naturally LTR even inside Arabic prose. */}
          <ul className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
            {AE_CONFIG_AR.hero.stats.map((stat, idx) => (
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
            {AE_CONFIG_AR.faq.map((entry, idx) => (
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
            للاطلاع على الدليل الكامل (جدول معدلات اتفاقية الازدواج الضريبي،
            استراتيجيات FX، تحويل المعاشات، التفاصيل الكاملة للضريبة):
          </p>
          <Link
            href={`/foreign-investment/${AE_CONFIG.slug}`}
            className="inline-block mt-3 text-amber-800 font-semibold underline underline-offset-2"
          >
            View the full English version &rarr;
          </Link>
        </section>
      </div>
    </main>
  );
}
