import Link from "next/link";
import { BCP47_TAG, LOCALE_LABEL, LOCALES, type Locale } from "@/lib/i18n/locales";
import { getForeignInvestmentDict } from "@/lib/i18n/dictionaries";

interface Props {
  locale: Locale;
}

/**
 * Localised foreign-investor landing page.
 *
 * Renders a single consistent shape — hero, four topic cards, three
 * expanded sections, language switcher, disclaimer — driven by the
 * dictionary for the passed locale. Used by:
 *
 *   /foreign-investment             (English)
 *   /zh/foreign-investment          (Simplified Chinese)
 *   /ko/foreign-investment          (Korean)
 *
 * Tools + calculators stay in English for now and are linked from
 * the topic cards.
 */
export default function ForeignInvestmentLocalizedPage({ locale }: Props) {
  const dict = getForeignInvestmentDict(locale);
  const canonicalBase =
    locale === "en" ? "/foreign-investment" : `/${locale}/foreign-investment`;

  return (
    <div lang={BCP47_TAG[locale]}>
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white py-10 md:py-14">
        <div className="container-custom max-w-4xl">
          <p className="text-[11px] font-bold uppercase tracking-wide text-amber-300 mb-2">
            {dict.hero.eyebrow}
          </p>
          <h1 className="text-3xl md:text-5xl font-extrabold mb-3 leading-tight">
            {dict.hero.heading}
          </h1>
          <p className="text-base md:text-lg text-slate-300 max-w-2xl">
            {dict.hero.subhead}
          </p>
          <div className="flex flex-wrap gap-3 mt-6">
            <Link
              href="/firb-fee-estimator"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-sm transition-colors"
            >
              {dict.hero.ctaPrimary}
            </Link>
            <Link
              href="/tools/withholding-tax-calculator"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/15 text-white font-semibold rounded-lg text-sm transition-colors"
            >
              {dict.hero.ctaSecondary}
            </Link>
          </div>
        </div>
      </section>

      <section className="container-custom max-w-5xl py-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {dict.topicCards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="block bg-white border border-slate-200 rounded-xl p-5 hover:border-amber-300 hover:shadow-md transition-all group"
            >
              <h2 className="text-base font-bold text-slate-900 mb-1 group-hover:text-amber-700">
                {card.title}
              </h2>
              <p className="text-sm text-slate-600 leading-relaxed">
                {card.description}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-custom max-w-4xl py-8 space-y-8">
        <article>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-3">
            {dict.firb.heading}
          </h2>
          {dict.firb.body.map((para, i) => (
            <p
              key={i}
              className="text-sm md:text-base text-slate-700 leading-relaxed mb-3"
            >
              {para}
            </p>
          ))}
          <Link
            href="/firb-fee-estimator"
            className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700 hover:text-amber-800"
          >
            {dict.firb.calculatorCta} →
          </Link>
        </article>

        <article>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-3">
            {dict.siv.heading}
          </h2>
          {dict.siv.body.map((para, i) => (
            <p
              key={i}
              className="text-sm md:text-base text-slate-700 leading-relaxed mb-3"
            >
              {para}
            </p>
          ))}
          <Link
            href="/foreign-investment/siv"
            className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700 hover:text-amber-800"
          >
            {dict.siv.cta} →
          </Link>
        </article>

        <article>
          <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-3">
            {dict.tax.heading}
          </h2>
          {dict.tax.body.map((para, i) => (
            <p
              key={i}
              className="text-sm md:text-base text-slate-700 leading-relaxed mb-3"
            >
              {para}
            </p>
          ))}
          <Link
            href="/tools/withholding-tax-calculator"
            className="inline-flex items-center gap-1 text-sm font-semibold text-amber-700 hover:text-amber-800"
          >
            {dict.tax.calculatorCta} →
          </Link>
        </article>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">
            {dict.languageSwitcher.availableIn}
          </p>
          <div className="flex flex-wrap gap-2">
            {LOCALES.map((l) => {
              const href =
                l === "en"
                  ? "/foreign-investment"
                  : `/${l}/foreign-investment`;
              const active = l === locale;
              return (
                <Link
                  key={l}
                  href={href}
                  hrefLang={BCP47_TAG[l]}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                    active
                      ? "bg-slate-900 text-white border-slate-900"
                      : "bg-white text-slate-700 border-slate-200 hover:bg-amber-50 hover:text-amber-700 hover:border-amber-200"
                  }`}
                >
                  {LOCALE_LABEL[l]}
                </Link>
              );
            })}
          </div>
        </div>

        <p className="text-[11px] text-slate-500 leading-relaxed">
          {dict.disclaimer}
        </p>
      </section>

      {/* Hidden canonical marker for hreflang debugging */}
      <link rel="canonical" href={canonicalBase} />
    </div>
  );
}
