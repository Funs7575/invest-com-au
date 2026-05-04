import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { FOREIGN_INVESTOR_GENERAL_DISCLAIMER, DTA_DISCLAIMER } from "@/lib/compliance";
import { AFFILIATE_REL } from "@/lib/tracking";
import { PLATFORM_TYPE_LABELS, type Broker } from "@/lib/types";
import type {
  CountryConfig,
  PathCard,
  FxOption,
  CtaLink,
  AccordionEntry,
} from "@/lib/foreign-investment-country-data";
import RememberCountry from "@/components/foreign-investment/RememberCountry";
import CountryLeadForm from "@/components/foreign-investment/CountryLeadForm";
import CountryAudiencesSection from "@/components/foreign-investment/sections/CountryAudiencesSection";
import CountryFaqSection from "@/components/foreign-investment/sections/CountryFaqSection";
import SectionHeading from "@/components/SectionHeading";
import ForeignInvestmentNav from "@/app/foreign-investment/ForeignInvestmentNav";

/**
 * Generic country-hub renderer. Drives the entire foreign-investment
 * country page from a CountryConfig — every section is opt-in via
 * config presence, with sensible fallbacks. Adding a new country or
 * lifting an existing one to UK-level depth is "fill out the config",
 * not "duplicate 600 lines of JSX".
 *
 * Section order matches the canonical UK page; sections without a
 * matching config block are silently skipped.
 *
 * Server component: fetches share-broker rows + cross-vertical
 * platform opportunities in parallel from supabase.
 */

interface Props {
  config: CountryConfig;
}

const CTA_PRIMARY =
  "inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-sm px-5 py-2.5 rounded-lg transition-colors";
const CTA_DARK =
  "inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm px-5 py-2.5 rounded-lg transition-colors";
const CTA_SECONDARY =
  "inline-flex items-center gap-2 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors";

const PATH_EYEBROW: Record<PathCard["eyebrowColor"], string> = {
  blue: "text-blue-700",
  amber: "text-amber-700",
  emerald: "text-emerald-700",
  slate: "text-slate-700",
  red: "text-red-700",
};

const FX_BADGE: Record<FxOption["badgeAccent"], string> = {
  red: "bg-red-100 text-red-700",
  emerald: "bg-emerald-100 text-emerald-700",
  blue: "bg-blue-100 text-blue-700",
  amber: "bg-amber-100 text-amber-700",
  slate: "bg-slate-100 text-slate-700",
};

async function fetchPageData(config: CountryConfig) {
  const supabase = await createClient();

  // Brokers section — share brokers that accept non-residents.
  const brokersPromise = supabase
    .from("brokers")
    .select(
      "id, name, slug, color, logo_url, cta_text, affiliate_url, rating, accepts_non_residents, foreign_investor_notes, platform_type, status",
    )
    .eq("platform_type", "share_broker")
    .eq("accepts_non_residents", true)
    .eq("status", "active")
    .order("rating", { ascending: false })
    .limit(6);

  // Cross-vertical opportunities — fetch each in parallel.
  const opportunityPromises = (config.opportunities ?? []).map((opp) => {
    let q = supabase
      .from("brokers")
      .select(
        "id, name, slug, color, logo_url, cta_text, affiliate_url, rating, platform_type, status, accepts_non_residents",
      )
      .eq("platform_type", opp.platformType)
      .eq("status", "active")
      .order("rating", { ascending: false })
      .limit(opp.limit ?? 6);
    if (opp.nonResidentsOnly) q = q.eq("accepts_non_residents", true);
    return q;
  });

  const [brokersRes, ...oppRes] = await Promise.all([brokersPromise, ...opportunityPromises]);

  return {
    brokers: ((brokersRes.data ?? []) as unknown as Broker[]) ?? [],
    opportunityRows: oppRes.map((r) => ((r.data ?? []) as unknown as Broker[]) ?? []),
  };
}

function CtaRow({ links }: { links: ReadonlyArray<CtaLink> }) {
  if (links.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-3">
      {links.map((c, idx) => (
        <Link
          key={c.href}
          href={c.href}
          className={c.primary || idx === 0 ? CTA_DARK : CTA_SECONDARY}
        >
          {c.label} &rarr;
        </Link>
      ))}
    </div>
  );
}

function AccordionList({ entries }: { entries: ReadonlyArray<AccordionEntry> }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {entries.map((e) => (
        <details key={e.summary} className="group bg-white border border-slate-200 rounded-2xl">
          <summary className="cursor-pointer px-5 py-4 text-sm font-bold text-slate-900 flex items-center justify-between gap-3 hover:bg-slate-50 rounded-2xl">
            {e.summary}
            <span aria-hidden className="text-slate-400 group-open:rotate-180 transition-transform">↓</span>
          </summary>
          <ul className="space-y-2 text-sm text-slate-700 px-5 pb-5">
            {e.bullets.map((b, i) => (
              <li key={i}>• <Md text={b} /></li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
}

/**
 * Inline-markdown renderer that supports `**bold**` only. Country
 * configs ship literal copy with occasional bold callouts; using JSX
 * keeps everything safely React-escaped without `dangerouslySetInnerHTML`.
 */
function Md({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((p, i) => {
        if (p.startsWith("**") && p.endsWith("**")) {
          return <strong key={i}>{p.slice(2, -2)}</strong>;
        }
        return <span key={i}>{p}</span>;
      })}
    </>
  );
}

function PlatformCardGrid({ rows, kind }: { rows: ReadonlyArray<Broker>; kind: string }) {
  if (rows.length === 0) {
    return (
      <p className="text-sm text-slate-500 italic">
        No active {kind} listed yet — we&apos;re reviewing the market.
      </p>
    );
  }
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {rows.map((p) => (
        <div
          key={p.id}
          className="border border-slate-200 rounded-xl p-4 hover:border-amber-200 transition-colors"
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-extrabold shrink-0"
              style={{ backgroundColor: p.color || "#1e293b" }}
            >
              {p.name?.charAt(0)}
            </div>
            <div>
              <p className="font-bold text-slate-800 text-sm">{p.name}</p>
              {p.rating && <p className="text-xs text-amber-600">★ {p.rating.toFixed(1)}</p>}
            </div>
          </div>
          {p.affiliate_url && (
            <a
              href={p.affiliate_url}
              target="_blank"
              rel={AFFILIATE_REL}
              className="block w-full text-center px-3 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-lg text-xs transition-colors"
            >
              {p.cta_text || "Open Account"} &rarr;
            </a>
          )}
        </div>
      ))}
    </div>
  );
}

export default async function CountryHubTemplate({ config }: Props) {
  const { brokers, opportunityRows } = await fetchPageData(config);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: config.faq.map((entry) => ({
      "@type": "Question",
      name: entry.q,
      acceptedAnswer: { "@type": "Answer", text: entry.a },
    })),
  };

  const breadcrumbName = `Investing from ${config.countryShort}`;

  return (
    <div className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(
            breadcrumbJsonLd([
              { name: "Home", url: SITE_URL },
              { name: "Foreign Investment", url: `${SITE_URL}/foreign-investment` },
              { name: breadcrumbName },
            ]),
          ),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <RememberCountry code={config.code} />
      <ForeignInvestmentNav current={`/foreign-investment/${config.slug}`} />

      {/* ── Hero ── */}
      <section className="relative bg-white border-b border-slate-100 overflow-hidden py-8 md:py-12">
        <div className="container-custom">
          <nav className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="text-slate-300">/</span>
            <Link href="/foreign-investment" className="hover:text-slate-900">Foreign Investment</Link>
            <span className="text-slate-300">/</span>
            <span className="text-slate-900 font-medium">From {config.countryName}</span>
          </nav>

          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="text-base">{config.flag}</span>
              <span>{config.hero.flagPillText}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-4 tracking-tight text-slate-900">
              {config.hero.h1Plain}{" "}
              <span className="text-amber-500">{config.hero.h1Highlight}</span>
              <br />
              <span className="text-xl sm:text-2xl text-slate-600">{config.hero.h1Sub}</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-6">
              {config.hero.paragraph}
            </p>

            <div
              className={`grid gap-3 ${
                config.hero.stats.length === 4
                  ? "grid-cols-2 sm:grid-cols-4"
                  : "grid-cols-3"
              }`}
            >
              {config.hero.stats.map((stat) => (
                <div
                  key={stat.label}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center"
                >
                  <p className="text-xl font-extrabold text-amber-600">{stat.value}</p>
                  <p className="text-xs font-semibold text-slate-900">{stat.label}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{stat.sub}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Sticky TOC ── */}
      <nav
        aria-label="On-page table of contents"
        className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-slate-200"
      >
        <div className="container-custom">
          <div className="flex gap-1 overflow-x-auto py-2 -mx-2 px-2 text-xs">
            {config.toc.map((s) => (
              <a
                key={s.id}
                href={`#${s.id}`}
                className="shrink-0 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-amber-100 hover:text-amber-800 text-slate-700 font-semibold whitespace-nowrap transition-colors"
              >
                {s.label}
              </a>
            ))}
          </div>
        </div>
      </nav>

      <div className="container-custom py-8 md:py-12 space-y-12 md:space-y-16">

        {/* ── Critical warning ── */}
        {config.criticalWarning && (
          <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-5">
            <div className="flex items-start gap-3">
              <svg className="w-6 h-6 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <p className="font-bold text-red-800">{config.criticalWarning.title}</p>
                <p className="text-sm text-red-700 mt-1 leading-relaxed">
                  <Md text={config.criticalWarning.body} />
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── Jump-to cards ── */}
        {config.jumpToCards && config.jumpToCards.length > 0 && (
          <section aria-label="Jump to your situation">
            <p className="text-xs font-extrabold uppercase tracking-wider text-amber-600 mb-3">
              Jump to your situation
            </p>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {config.jumpToCards.map((card) => (
                <a
                  key={card.title}
                  href={card.href}
                  className="group block p-4 border border-slate-200 rounded-xl hover:border-amber-300 hover:bg-amber-50/40 transition-colors"
                >
                  <div className="text-2xl mb-1.5" aria-hidden>{card.emoji}</div>
                  <div className="text-sm font-bold text-slate-900 group-hover:text-amber-700 mb-0.5">{card.title}</div>
                  <div className="text-xs text-slate-500 leading-snug">{card.body}</div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* ── Two audiences + PDF lead form ── */}
        <div>
          <CountryAudiencesSection
            heading={config.audiences.heading}
            sub={config.audiences.sub}
            cards={config.audiences.cards}
          />
          {config.leadForms.pdfChecklist && (
            <CountryLeadForm
              kind="pdf-checklist"
              countryCode={config.code}
              title={config.leadForms.pdfChecklist.title}
              body={config.leadForms.pdfChecklist.body}
              ctaLabel={config.leadForms.pdfChecklist.ctaLabel}
              successHeading={config.leadForms.pdfChecklist.successHeading}
              successBody={config.leadForms.pdfChecklist.successBody}
              extraFields={config.leadForms.pdfChecklist.extraFields}
              accent={config.leadForms.pdfChecklist.accent}
            />
          )}
        </div>

        {/* ── Property + FIRB ── */}
        <section id="property" className="scroll-mt-20 space-y-5">
          <SectionHeading
            eyebrow={config.property.eyebrow}
            title={config.property.title}
            sub={config.property.sub}
          />
          {config.property.banHeadline && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-start gap-3">
              <svg className="w-5 h-5 text-red-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <p className="font-bold text-red-800 text-sm">{config.property.banHeadline}</p>
                <p className="text-sm text-red-700 mt-0.5">
                  {config.property.banDetail}
                  {config.property.banLink && (
                    <>
                      {" "}
                      <Link href={config.property.banLink.href} className="underline font-semibold">
                        {config.property.banLink.label} &rarr;
                      </Link>
                    </>
                  )}
                </p>
              </div>
            </div>
          )}
          <div className="grid sm:grid-cols-3 gap-4">
            {config.property.tiles.map((b) => (
              <div
                key={b.label}
                className={`p-5 rounded-xl border-2 ${
                  b.state === "open"
                    ? "border-emerald-200 bg-emerald-50/40"
                    : "border-red-200 bg-red-50/40"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span
                    aria-hidden
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-white text-base font-extrabold ${
                      b.state === "open" ? "bg-emerald-600" : "bg-red-600"
                    }`}
                  >
                    {b.state === "open" ? "✓" : "✗"}
                  </span>
                  <span
                    className={`text-xs font-bold uppercase tracking-wider ${
                      b.state === "open" ? "text-emerald-700" : "text-red-700"
                    }`}
                  >
                    {b.state === "open" ? `Open to ${config.countryShort}` : "Blocked until 03/2027"}
                  </span>
                </div>
                <p className="text-sm font-bold text-slate-900">{b.label}</p>
                <p className="text-xs text-slate-600 mt-1">{b.note}</p>
              </div>
            ))}
          </div>
          {config.property.countrySideReminders.length > 0 && (
            <details className="group bg-slate-50 rounded-2xl border border-slate-200">
              <summary className="cursor-pointer px-5 py-3 text-sm font-bold text-slate-900 flex items-center justify-between gap-3 hover:bg-slate-100 rounded-2xl">
                {config.property.countrySideRemindersHeading}
                <span aria-hidden className="text-slate-400 group-open:rotate-180 transition-transform">↓</span>
              </summary>
              <ul className="text-sm text-slate-700 space-y-1.5 px-5 pb-5">
                {config.property.countrySideReminders.map((r, i) => (
                  <li key={i}>• <Md text={r} /></li>
                ))}
              </ul>
            </details>
          )}
          <CtaRow links={config.property.ctaLinks} />

          {config.leadForms.propertyShortlist && (
            <CountryLeadForm
              kind="property-budget"
              countryCode={config.code}
              title={config.leadForms.propertyShortlist.title}
              body={config.leadForms.propertyShortlist.body}
              ctaLabel={config.leadForms.propertyShortlist.ctaLabel}
              successHeading={config.leadForms.propertyShortlist.successHeading}
              successBody={config.leadForms.propertyShortlist.successBody}
              extraFields={config.leadForms.propertyShortlist.extraFields}
              accent={config.leadForms.propertyShortlist.accent}
            />
          )}
        </section>

        {/* ── Three paths to ASX shares ── */}
        {config.pathsToShares && (
          <section id="shares" className="scroll-mt-20">
            <SectionHeading
              eyebrow={config.pathsToShares.eyebrow}
              title={config.pathsToShares.title}
              sub={config.pathsToShares.sub}
            />
            <div className="grid lg:grid-cols-3 gap-4">
              {config.pathsToShares.cards.map((card) => (
                <div
                  key={card.title}
                  className={`rounded-2xl p-5 flex flex-col ${
                    card.highlight ? "border-2 border-amber-300 bg-amber-50/30" : "border border-slate-200"
                  }`}
                >
                  <p className={`text-xs font-extrabold uppercase tracking-wider mb-2 ${PATH_EYEBROW[card.eyebrowColor]}`}>
                    {card.eyebrow}
                  </p>
                  <h3 className="text-base font-bold text-slate-900 mb-2">{card.title}</h3>
                  <p className="text-sm text-slate-700 leading-relaxed mb-3 flex-1">{card.body}</p>
                  <ul className="text-xs text-slate-600 space-y-1 mb-3">
                    {card.pros.map((p, i) => (
                      <li key={`p${i}`}>✓ {p}</li>
                    ))}
                    {card.cons.map((c, i) => (
                      <li key={`c${i}`}>✗ {c}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <CtaRow links={config.pathsToShares.ctaLinks} />
            </div>
          </section>
        )}

        {/* ── Investment options grid (US-style) ── */}
        {config.investmentOptions && (
          <section id="investment-options" className="scroll-mt-20">
            <SectionHeading
              eyebrow={config.investmentOptions.eyebrow}
              title={config.investmentOptions.title}
              sub={config.investmentOptions.sub}
            />
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {config.investmentOptions.items.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={`group block p-4 border rounded-xl transition-all ${
                    item.state === "open"
                      ? "border-slate-200 hover:border-amber-300"
                      : "border-red-100 bg-red-50/30 opacity-90"
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    {item.state === "open" ? (
                      <svg className="w-4 h-4 text-emerald-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-red-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                    <span className={`font-bold text-sm ${item.state === "open" ? "text-slate-800 group-hover:text-amber-700" : "text-red-800"}`}>
                      {item.label}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed ml-6">{item.body}</p>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ── FX corridor ── */}
        {config.fxCorridor && (
          <section id="fx" className="scroll-mt-20">
            <SectionHeading
              eyebrow={config.fxCorridor.eyebrow}
              title={config.fxCorridor.title}
              sub={config.fxCorridor.sub}
            />
            <div className="grid sm:grid-cols-3 gap-4">
              {config.fxCorridor.options.map((opt) => (
                <div key={opt.name} className="border border-slate-200 rounded-xl p-4 bg-white">
                  <span className={`inline-block text-[10px] font-bold uppercase px-2 py-0.5 rounded ${FX_BADGE[opt.badgeAccent]} mb-2`}>
                    {opt.badge}
                  </span>
                  <h3 className="font-bold text-sm text-slate-900 mb-1">{opt.name}</h3>
                  <p className="text-xs text-slate-500 mb-1"><strong>FX margin:</strong> {opt.cost}</p>
                  <p className="text-xs text-slate-500 mb-2"><strong>Speed:</strong> {opt.speed}</p>
                  <p className="text-xs text-slate-600">{opt.note}</p>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <Link href={config.fxCorridor.ctaHref} className={CTA_DARK}>
                {config.fxCorridor.ctaLabel} &rarr;
              </Link>
            </div>

            {config.leadForms.fxQuote && (
              <CountryLeadForm
                kind="fx-quote"
                countryCode={config.code}
                title={config.leadForms.fxQuote.title}
                body={config.leadForms.fxQuote.body}
                ctaLabel={config.leadForms.fxQuote.ctaLabel}
                successHeading={config.leadForms.fxQuote.successHeading}
                successBody={config.leadForms.fxQuote.successBody}
                extraFields={config.leadForms.fxQuote.extraFields}
                accent={config.leadForms.fxQuote.accent}
              />
            )}
          </section>
        )}

        {/* ── Reporting obligations ── */}
        {config.reportingObligations && (
          <section id="reporting" className="scroll-mt-20">
            <SectionHeading
              eyebrow={config.reportingObligations.eyebrow}
              title={config.reportingObligations.title}
              sub={config.reportingObligations.sub}
            />
            <div className="grid sm:grid-cols-2 gap-5">
              {config.reportingObligations.cards.map((c) => (
                <div key={c.title} className="border border-slate-200 rounded-xl p-5">
                  <h3 className="font-bold text-slate-800 mb-3 text-sm">{c.title}</h3>
                  <ul className="space-y-2 text-xs text-slate-600">
                    {c.bullets.map((b, i) => (
                      <li key={i}>• <Md text={b} /></li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Fund trap (PFIC etc.) ── */}
        {config.fundTrap && (
          <section id="fund-trap" className="scroll-mt-20">
            <SectionHeading
              eyebrow={config.fundTrap.eyebrow}
              title={config.fundTrap.title}
              sub={config.fundTrap.sub}
            />
            <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
              <h3 className="font-bold text-red-800 mb-3">{config.fundTrap.warningTitle}</h3>
              <ul className="space-y-3 text-sm text-red-700">
                {config.fundTrap.bullets.map((b, i) => (
                  <li key={i}>• <Md text={b} /></li>
                ))}
              </ul>
            </div>
            {config.fundTrap.recommendation && (
              <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-800">
                  <Md text={config.fundTrap.recommendation} />
                </p>
              </div>
            )}
          </section>
        )}

        {/* ── DTA + tax side ── */}
        <section id="tax" className="scroll-mt-20">
          <SectionHeading
            eyebrow={config.dta.eyebrow}
            title={config.dta.title}
            sub={config.dta.sub}
          />
          <div className="overflow-x-auto mb-5">
            <table className="w-full text-sm border border-slate-200 rounded-xl overflow-hidden">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">Income type</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">Without DTA</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs">With DTA ({config.countryShort} residents)</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs hidden md:table-cell">{config.dta.countrySideHeading}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {config.dta.rows.map((r) => (
                  <tr key={r.type} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-800">{r.type}</td>
                    <td className="px-4 py-3 text-red-700 font-semibold">{r.noTreaty}</td>
                    <td className="px-4 py-3 text-emerald-700 font-bold">{r.withTreaty}</td>
                    <td className="px-4 py-3 text-xs text-slate-500 hidden md:table-cell">{r.countrySideNote}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {config.dta.countryReporting.length > 0 && (
            <details className="group bg-slate-50 rounded-2xl border border-slate-200">
              <summary className="cursor-pointer px-5 py-3 text-sm font-bold text-slate-900 flex items-center justify-between gap-3 hover:bg-slate-100 rounded-2xl">
                {config.dta.countryReportingHeading}
                <span aria-hidden className="text-slate-400 group-open:rotate-180 transition-transform">↓</span>
              </summary>
              <ul className="text-sm text-slate-700 space-y-1.5 px-5 pb-5">
                {config.dta.countryReporting.map((r, i) => (
                  <li key={i}>• {r}</li>
                ))}
              </ul>
            </details>
          )}
          <div className="mt-5">
            <Link href={config.dta.ctaHref} className={CTA_PRIMARY}>
              {config.dta.ctaLabel} &rarr;
            </Link>
          </div>
        </section>

        {/* ── Treaty thresholds (FTA) ── */}
        {config.treatyThresholds && (
          <section id="treaty" className="scroll-mt-20">
            <SectionHeading
              eyebrow={config.treatyThresholds.eyebrow}
              title={config.treatyThresholds.title}
              sub={config.treatyThresholds.sub}
            />
            <div className="grid sm:grid-cols-2 gap-5">
              {config.treatyThresholds.items.map((item) => (
                <div key={item.title} className="border border-slate-200 rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-bold text-slate-800 text-sm">{item.title}</h3>
                    <span className="shrink-0 text-xs font-bold px-2 py-1 bg-amber-100 text-amber-800 rounded-full">{item.threshold}</span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Retirement transfer (QROPS etc.) ── */}
        {config.retirementTransfer && (
          <section id="retirement" className="scroll-mt-20">
            <SectionHeading
              eyebrow={config.retirementTransfer.eyebrow}
              title={config.retirementTransfer.title}
              sub={config.retirementTransfer.sub}
            />
            {config.retirementTransfer.callout && (
              <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-4">
                <p className="text-sm text-amber-900">
                  <Md text={config.retirementTransfer.callout} />
                </p>
              </div>
            )}
            <AccordionList entries={config.retirementTransfer.accordions} />
            <div className="mt-5">
              <CtaRow links={config.retirementTransfer.ctaLinks} />
            </div>
            {config.leadForms.pensionTransfer && (
              <CountryLeadForm
                kind="pension-transfer"
                countryCode={config.code}
                title={config.leadForms.pensionTransfer.title}
                body={config.leadForms.pensionTransfer.body}
                ctaLabel={config.leadForms.pensionTransfer.ctaLabel}
                successHeading={config.leadForms.pensionTransfer.successHeading}
                successBody={config.leadForms.pensionTransfer.successBody}
                extraFields={config.leadForms.pensionTransfer.extraFields}
                accent={config.leadForms.pensionTransfer.accent}
              />
            )}
          </section>
        )}

        {/* ── Inheritance / estate tax ── */}
        {config.inheritance && (
          <section id="inheritance" className="scroll-mt-20">
            <SectionHeading
              eyebrow={config.inheritance.eyebrow}
              title={config.inheritance.title}
              sub={config.inheritance.sub}
            />
            <div className="grid sm:grid-cols-3 gap-4">
              {config.inheritance.cards.map((card) => (
                <div key={card.title} className="border border-slate-200 rounded-xl p-4">
                  {card.eyebrow && (
                    <p className="text-xs font-extrabold uppercase tracking-wider text-slate-500 mb-1">
                      {card.eyebrow}
                    </p>
                  )}
                  <p className="text-sm font-bold text-slate-900 mb-1">{card.title}</p>
                  <p className="text-sm text-slate-800">{card.body}</p>
                </div>
              ))}
            </div>
            {config.inheritance.ctaLink && (
              <div className="mt-5">
                <Link href={config.inheritance.ctaLink.href} className={CTA_PRIMARY}>
                  {config.inheritance.ctaLink.label} &rarr;
                </Link>
              </div>
            )}
          </section>
        )}

        {/* ── Australian expat in <country> ── */}
        {config.expat && (
          <section id="expat" className="scroll-mt-20">
            <SectionHeading
              eyebrow={config.expat.eyebrow}
              title={config.expat.title}
              sub={config.expat.sub}
            />
            <div className="grid lg:grid-cols-3 gap-4">
              {config.expat.cards.map((card) => (
                <div key={card.title} className="border border-slate-200 rounded-xl p-4">
                  <h3 className="font-bold text-sm text-slate-900 mb-2">{card.title}</h3>
                  <p className="text-xs text-slate-700">{card.body}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Migration pathways ── */}
        {config.migration && (
          <section id="migration" className="scroll-mt-20">
            <SectionHeading
              eyebrow={config.migration.eyebrow}
              title={config.migration.title}
              sub={config.migration.sub}
            />
            <div className="grid sm:grid-cols-2 gap-4">
              {config.migration.pathways.map((v) => (
                <div key={v.name} className="border border-slate-200 rounded-xl p-4">
                  <p className="font-bold text-sm text-slate-900 mb-1">{v.name}</p>
                  <p className="text-xs text-slate-600">{v.note}</p>
                </div>
              ))}
            </div>
            <div className="mt-5">
              <Link href={config.migration.ctaLink.href} className={CTA_DARK}>
                {config.migration.ctaLink.label} &rarr;
              </Link>
            </div>
          </section>
        )}

        {/* ── Sector opportunity ── */}
        {config.sectorOpportunity && (
          <section id="sector" className="scroll-mt-20">
            <div className="bg-gradient-to-r from-emerald-50 to-emerald-100/40 border border-emerald-200 rounded-2xl p-6">
              <p className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 mb-3">
                {config.sectorOpportunity.eyebrow}
              </p>
              <h3 className="text-lg font-bold text-slate-900 mb-3">{config.sectorOpportunity.title}</h3>
              {config.sectorOpportunity.stats && (
                <div className="grid sm:grid-cols-3 gap-4 mb-5">
                  {config.sectorOpportunity.stats.map((s) => (
                    <div key={s.label} className="text-center">
                      <p className="text-2xl font-extrabold text-emerald-700">{s.value}</p>
                      <p className="text-xs text-emerald-600">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-sm text-emerald-800 leading-relaxed mb-4">{config.sectorOpportunity.body}</p>
              <div className="flex flex-wrap gap-3">
                {config.sectorOpportunity.ctaLinks.map((cta, idx) => (
                  <Link
                    key={cta.href}
                    href={cta.href}
                    className={
                      cta.primary || idx === 0
                        ? "inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm px-5 py-2.5 rounded-lg transition-colors"
                        : "inline-flex items-center gap-2 border border-emerald-300 hover:bg-emerald-50 text-emerald-700 font-semibold text-sm px-5 py-2.5 rounded-lg transition-colors"
                    }
                  >
                    {cta.label} &rarr;
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── Cross-vertical opportunities ── */}
        {config.opportunities && config.opportunities.length > 0 && (
          <section id="opportunities" className="scroll-mt-20 space-y-10">
            {config.opportunities.map((opp, idx) => {
              const rows = opportunityRows[idx] ?? [];
              return (
                <div key={opp.platformType} className="space-y-4">
                  <SectionHeading
                    eyebrow={opp.eyebrow}
                    title={opp.title}
                    sub={opp.sub}
                  />
                  <PlatformCardGrid rows={rows} kind={PLATFORM_TYPE_LABELS[opp.platformType].toLowerCase() + "s"} />
                  <p className="text-xs text-slate-500">
                    <Link href={opp.compareHref} className="text-amber-600 hover:text-amber-700 underline">
                      {opp.compareLabel} &rarr;
                    </Link>
                  </p>
                </div>
              );
            })}
          </section>
        )}

        {/* ── Brokers ── */}
        {brokers.length > 0 && (
          <section id="brokers" className="scroll-mt-20">
            <SectionHeading
              eyebrow={config.brokers?.eyebrow ?? "Brokers"}
              title={config.brokers?.title ?? `ASX brokers that accept ${config.adjective} residents`}
              sub={
                config.brokers?.sub ??
                "Verify eligibility and current account-opening conditions directly with each broker before applying."
              }
            />
            <PlatformCardGrid rows={brokers} kind="share brokers" />
            <p className="text-xs text-slate-500 mt-3">
              <Link href="/compare/non-residents" className="text-amber-600 hover:text-amber-700 underline">
                Compare all non-resident brokers &rarr;
              </Link>
            </p>
          </section>
        )}

        {/* ── FAQ ── */}
        <CountryFaqSection
          eyebrow="FAQ"
          title={`Frequently asked — ${config.adjective} investors in Australia`}
          sub="Schema-marked for search visibility. If your question isn't here, the advisor CTA below routes to a cross-border specialist."
          entries={config.faq}
        />

        {/* ── Advisor anchor ── */}
        {config.advisorAnchor && (
          <section
            className={
              config.advisorAnchor.theme === "dark"
                ? "bg-slate-900 text-white rounded-2xl p-6 md:p-8"
                : "bg-amber-50 border border-amber-200 rounded-2xl p-6"
            }
          >
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="max-w-xl">
                <p
                  className={`text-xs font-extrabold uppercase tracking-wider mb-2 ${
                    config.advisorAnchor.theme === "dark" ? "text-amber-400" : "text-amber-700"
                  }`}
                >
                  {config.advisorAnchor.eyebrow}
                </p>
                <h2
                  className={`text-xl md:text-2xl font-bold mb-2 ${
                    config.advisorAnchor.theme === "dark" ? "text-white" : "text-amber-900"
                  }`}
                >
                  {config.advisorAnchor.title}
                </h2>
                <p
                  className={`text-sm leading-relaxed ${
                    config.advisorAnchor.theme === "dark" ? "text-slate-300" : "text-amber-800"
                  }`}
                >
                  {config.advisorAnchor.body}
                </p>
              </div>
              <Link
                href={config.advisorAnchor.ctaHref}
                className={
                  config.advisorAnchor.theme === "dark"
                    ? "shrink-0 px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold rounded-xl text-sm transition-colors"
                    : "shrink-0 px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-sm transition-colors"
                }
              >
                {config.advisorAnchor.ctaLabel} &rarr;
              </Link>
            </div>
          </section>
        )}

        {/* ── Related ── */}
        <section>
          <SectionHeading eyebrow="Related" title={`More for ${config.adjective} investors and expats`} />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {config.related.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="group block p-4 border border-slate-200 rounded-xl hover:border-amber-300 hover:bg-amber-50/20 transition-all"
              >
                <span className="font-semibold text-sm text-slate-800 group-hover:text-amber-700">
                  {link.title} &rarr;
                </span>
              </Link>
            ))}
          </div>
        </section>

        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
          <p className="text-xs text-slate-500 leading-relaxed">{DTA_DISCLAIMER}</p>
          <p className="text-xs text-slate-500 leading-relaxed">{FOREIGN_INVESTOR_GENERAL_DISCLAIMER}</p>
        </div>
      </div>
    </div>
  );
}
