import Link from "next/link";
import { BCP47_TAG, LOCALE_LABEL, LOCALES, type Locale } from "@/lib/i18n/locales";
import { getSubPageDict, type SubPageDict } from "@/lib/i18n/dictionaries";

interface Props {
  locale: Locale;
  /**
   * Which sub-page dictionary to render. One of the keys in
   * SUB_PAGE_DICTS — currently siv | property | tax.
   */
  slug: "siv" | "property" | "tax";
}

/**
 * Shared renderer for the translated foreign-investor sub-pages.
 *
 * Every sub-page keeps the same structure (hero, N sections, CTA list,
 * language switcher, disclaimer) so translators only touch the
 * dictionary and never the component. Used by all 6 of:
 *
 *   /zh/foreign-investment/{siv,property,tax}
 *   /ko/foreign-investment/{siv,property,tax}
 *
 * The English canonicals continue to live at
 * /foreign-investment/{siv,property,tax} and keep their existing
 * richer layouts — this component is intentionally simpler than the
 * English versions, which is appropriate for a translated entry point
 * that links back to the English calculators for hands-on work.
 */
export default function ForeignInvestmentSubPage({ locale, slug }: Props) {
  const dict: SubPageDict = getSubPageDict(slug, locale);
  const canonicalPath = `/${locale === "en" ? "" : `${locale}/`}foreign-investment/${slug}`;

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
        </div>
      </section>

      <section className="container-custom max-w-3xl py-8 md:py-12 space-y-8">
        {dict.sections.map((s) => (
          <article key={s.heading}>
            <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-3">
              {s.heading}
            </h2>
            {s.body.map((para, i) => (
              <p
                key={i}
                className="text-sm md:text-base text-slate-700 leading-relaxed mb-3"
              >
                {para}
              </p>
            ))}
          </article>
        ))}

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <ul className="space-y-2">
            {dict.ctas.map((c) => (
              <li key={c.href}>
                <Link
                  href={c.href}
                  className="text-sm font-semibold text-amber-700 hover:text-amber-800 inline-flex items-center gap-1"
                >
                  {c.label} →
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">
            {LOCALES.map((l) => LOCALE_LABEL[l]).join(" · ")}
          </p>
          <div className="flex flex-wrap gap-2">
            {LOCALES.map((l) => {
              const href =
                l === "en"
                  ? `/foreign-investment/${slug}`
                  : `/${l}/foreign-investment/${slug}`;
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

      <link rel="canonical" href={canonicalPath} />
    </div>
  );
}
