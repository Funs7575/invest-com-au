/**
 * /foreign-investment/journey/[country]
 *
 * Guided cross-border investing journey — sequences the existing country-data
 * (FIRB rules, DTA rates, FX corridor, pension transfer, migration pathways)
 * into an ordered step-by-step path, ending with an advisor handoff.
 *
 * Country-parameterised so each of the 12 hub countries gets a canonical
 * journey URL:
 *   /foreign-investment/journey/united-kingdom
 *   /foreign-investment/journey/united-states
 *   … etc.
 *
 * All data is sourced from COUNTRY_CONFIGS (lib/foreign-investment-country-data.ts)
 * via buildExpatJourney (lib/expat-journey.ts). No new data is fabricated.
 *
 * Compliance:
 *   - General information only — GENERAL_ADVICE_WARNING rendered in full
 *   - FOREIGN_INVESTOR_GENERAL_DISCLAIMER at the foot
 *   - Advisor CTAs are flat-fee referral (no personal advice or product rec)
 *   - No performance claims or product rankings
 */

import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, absoluteUrl, CURRENT_YEAR } from "@/lib/seo";
import {
  GENERAL_ADVICE_WARNING,
  FOREIGN_INVESTOR_GENERAL_DISCLAIMER,
} from "@/lib/compliance";
import {
  getCountryConfig,
  COUNTRY_CONFIGS,
} from "@/lib/foreign-investment-country-data";
import { intentCountryFromSlug } from "@/lib/intent-context";
import { buildExpatJourney, type JourneyStep } from "@/lib/expat-journey";
import ForeignInvestmentNav from "../../ForeignInvestmentNav";
import RememberCountry from "@/components/foreign-investment/RememberCountry";

// ─── Bold-markdown renderer (safe: returns JSX, never innerHTML) ─────────────

function renderBold(text: string) {
  return text
    .split(/\*\*(.+?)\*\*/g)
    .map((part, i) => (i % 2 === 1 ? <strong key={i}>{part}</strong> : part));
}

// ─── Static params ───────────────────────────────────────────────────────────

export function generateStaticParams() {
  return Object.values(COUNTRY_CONFIGS)
    .filter(Boolean)
    .map((c) => ({ country: c!.slug }));
}

// ─── Metadata ────────────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: Promise<{ country: string }>;
}): Promise<Metadata> {
  const { country } = await params;
  const code = intentCountryFromSlug(country);
  if (!code) return { title: "Guide Not Found" };
  const config = getCountryConfig(code);
  if (!config) return { title: "Guide Not Found" };

  const title = `${config.adjective} Investor Journey: Step-by-Step Guide to Investing in Australia (${CURRENT_YEAR})`;
  const description = `Guided cross-border investing journey for ${config.adjective} residents. Covers FIRB eligibility, property rules, investment options, DTA tax rates, FX, ${config.retirementTransfer ? "pension transfer, " : ""}${config.migration ? "visa pathways, " : ""}and advisor referral. General information only.`;

  return {
    title,
    description,
    openGraph: {
      title: `${config.adjective} Investor Journey — Investing in Australia ${CURRENT_YEAR}`,
      description: `Step-by-step guide: FIRB, tax, FX, and advisor handoff for ${config.adjective} investors.`,
      url: `${SITE_URL}/foreign-investment/journey/${config.slug}`,
      images: [
        {
          url: `/api/og?title=${encodeURIComponent(`${config.flag} Cross-Border Investing Journey: ${config.countryShort} → Australia`)}&sub=${encodeURIComponent(`FIRB · Tax · FX · Advisors · ${CURRENT_YEAR}`)}`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: { card: "summary_large_image" },
    alternates: {
      canonical: `${SITE_URL}/foreign-investment/journey/${config.slug}`,
    },
  };
}

export const revalidate = 86400;

// ─── JSON-LD ──────────────────────────────────────────────────────────────────

function buildHowToJsonLd(
  config: ReturnType<typeof getCountryConfig>,
  steps: ReadonlyArray<JourneyStep>,
) {
  if (!config) return null;
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: `How to invest in Australia as a ${config.adjective} resident — ${CURRENT_YEAR} guide`,
    description: `Step-by-step guide covering FIRB eligibility, tax obligations, investment options, FX, and finding a specialist advisor.`,
    url: absoluteUrl(`/foreign-investment/journey/${config.slug}`),
    image: `/api/og?title=${encodeURIComponent(`${config.adjective} Cross-Border Investing Journey`)}&sub=${encodeURIComponent("FIRB · Tax · FX · Advisors")}`,
    step: steps.map((s) => ({
      "@type": "HowToStep",
      name: s.railLabel,
      text: s.summary,
      url: absoluteUrl(
        `/foreign-investment/journey/${config.slug}#${s.id}`,
      ),
    })),
  };
}

// ─── UI components ────────────────────────────────────────────────────────────

function CalloutBox({
  title,
  body,
  variant = "warn",
}: {
  title: string;
  body: string;
  variant?: "warn" | "critical";
}) {
  const styles =
    variant === "critical"
      ? "bg-red-50 border-red-200 text-red-900"
      : "bg-amber-50 border-amber-200 text-amber-900";
  const labelStyle =
    variant === "critical" ? "text-red-700" : "text-amber-700";

  return (
    <div className={`rounded-xl border p-4 mt-4 ${styles}`}>
      <p className={`text-xs font-bold uppercase tracking-wide mb-1 ${labelStyle}`}>
        {variant === "critical" ? "Important" : "Note"}
      </p>
      <p className="text-xs font-semibold mb-1">{title}</p>
      <p className="text-xs leading-relaxed">{renderBold(body)}</p>
    </div>
  );
}

function StepCard({ step }: { step: JourneyStep }) {
  return (
    <section
      id={step.id}
      className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden scroll-mt-24"
    >
      {/* Step header */}
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-amber-500 text-slate-900 text-xs font-extrabold shrink-0">
          {step.stepNumber}
        </span>
        <h2 className="font-extrabold text-slate-900 text-sm md:text-base leading-tight">
          {step.heading}
        </h2>
      </div>

      <div className="px-6 py-5 space-y-4">
        {/* Summary */}
        <p className="text-sm text-slate-600 leading-relaxed">{step.summary}</p>

        {/* Callout */}
        {step.calloutTitle && (
          <CalloutBox
            title={step.calloutTitle}
            body={step.calloutBody ?? ""}
            variant={step.calloutVariant}
          />
        )}

        {/* Bullets */}
        {step.bullets.length > 0 && (
          <ul className="space-y-2.5">
            {step.bullets.map((bullet, i) => (
              <li key={i} className="flex gap-2.5 text-xs text-slate-700 leading-relaxed">
                <span className="text-amber-500 font-bold mt-0.5 shrink-0">—</span>
                <span>{renderBold(bullet)}</span>
              </li>
            ))}
          </ul>
        )}

        {/* Links */}
        {step.links.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {step.links.map((link) =>
              link.primary ? (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs px-4 py-2 rounded-lg transition-colors"
                >
                  {link.label}
                </Link>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex items-center gap-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs px-4 py-2 rounded-lg transition-colors"
                >
                  {link.label}
                </Link>
              ),
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ExpatJourneyPage({
  params,
}: {
  params: Promise<{ country: string }>;
}) {
  const { country } = await params;
  const code = intentCountryFromSlug(country);
  if (!code) notFound();
  const config = getCountryConfig(code);
  if (!config) notFound();

  const journey = buildExpatJourney(config);

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: SITE_URL },
    { name: "Foreign Investment", url: `${SITE_URL}/foreign-investment` },
    {
      name: config.countryName,
      url: `${SITE_URL}/foreign-investment/${config.slug}`,
    },
    {
      name: "Journey",
      url: `${SITE_URL}/foreign-investment/journey/${config.slug}`,
    },
  ]);

  const howToLd = buildHowToJsonLd(config, journey.steps);

  return (
    <div className="bg-white min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {howToLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(howToLd) }}
        />
      )}

      {/* Persist country intent cookie for cross-navigation continuity */}
      <RememberCountry code={code} />

      <ForeignInvestmentNav current="" />

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <section className="relative bg-white border-b border-slate-100 py-8 md:py-12">
        <div className="container-custom">
          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" className="text-xs text-slate-500 mb-5 flex items-center gap-1.5 flex-wrap">
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <span>/</span>
            <Link href="/foreign-investment" className="hover:text-slate-900">
              Foreign Investment
            </Link>
            <span>/</span>
            <Link
              href={`/foreign-investment/${config.slug}`}
              className="hover:text-slate-900"
            >
              {config.countryName}
            </Link>
            <span>/</span>
            <span className="text-slate-900 font-medium">Journey</span>
          </nav>

          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-100 border border-slate-200 rounded-full text-xs font-semibold text-slate-600 mb-4">
              <span className="text-base">{config.flag}</span>
              {config.countryName} · Cross-Border Investing Journey · {CURRENT_YEAR}
            </div>

            <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold leading-[1.1] mb-3 tracking-tight text-slate-900">
              {config.adjective} investor{" "}
              <span className="text-amber-600">step-by-step journey</span>
            </h1>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed mb-6">
              This guide sequences the key decisions for a {config.adjective}{" "}
              resident investing in Australia — from understanding your
              eligibility and FIRB obligations through to tax, FX, and finding
              the right specialist. General information only — not financial
              advice.
            </p>

            {/* General advice warning — above the fold */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                {GENERAL_ADVICE_WARNING}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Planner CTA strip ─────────────────────────────────────────── */}
      <div className="container-custom pt-6 pb-0">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between">
          <div>
            <p className="text-sm font-extrabold text-emerald-900 leading-tight">
              Ready to track your progress?
            </p>
            <p className="text-xs text-emerald-700 mt-0.5">
              Open the interactive planner — tick off steps as you go. Progress
              saves to your browser (or account if signed in).
            </p>
          </div>
          <Link
            href={`/foreign-investment/journey/${config.slug}/plan`}
            className="inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors shrink-0"
          >
            Open Planner
          </Link>
        </div>
      </div>

      {/* ── Progress rail + steps ─────────────────────────────────────── */}
      <div className="container-custom py-10 md:py-14">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Sticky progress rail (desktop) */}
          <aside className="hidden lg:block sticky top-24 w-52 shrink-0">
            <p className="text-[0.65rem] font-bold uppercase tracking-widest text-slate-500 mb-3">
              Your journey
            </p>
            <nav aria-label="Navigation" className="space-y-1">
              {journey.steps.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-amber-700 transition-colors group"
                >
                  <span className="w-5 h-5 rounded-full bg-slate-100 group-hover:bg-amber-100 text-slate-500 group-hover:text-amber-700 text-[0.6rem] font-extrabold flex items-center justify-center shrink-0 transition-colors">
                    {s.stepNumber}
                  </span>
                  {s.railLabel}
                </a>
              ))}
            </nav>

            {/* Track progress — planner link */}
            <div className="mt-6 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <p className="text-[0.65rem] font-bold uppercase tracking-wide text-emerald-700 mb-1">
                Track your progress
              </p>
              <Link
                href={`/foreign-investment/journey/${config.slug}/plan`}
                className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
              >
                Open interactive planner →
              </Link>
            </div>

            {/* Country guide link */}
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-[0.65rem] font-bold uppercase tracking-wide text-amber-700 mb-1">
                Full country guide
              </p>
              <Link
                href={`/foreign-investment/${config.slug}`}
                className="text-xs font-semibold text-amber-700 hover:text-amber-800"
              >
                {config.flag} {config.countryName} investing hub →
              </Link>
            </div>
          </aside>

          {/* Steps */}
          <div className="flex-1 min-w-0 space-y-6">
            {journey.steps.map((step) => (
              <StepCard key={step.id} step={step} />
            ))}
          </div>
        </div>
      </div>

      {/* ── Related journeys ──────────────────────────────────────────── */}
      <section className="py-10 bg-slate-50 border-t border-slate-100">
        <div className="container-custom">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4">
            Other country journeys
          </p>
          <div className="flex flex-wrap gap-2">
            {Object.values(COUNTRY_CONFIGS)
              .filter((c) => c && c.code !== config.code)
              .map((c) => (
                <Link
                  key={c!.slug}
                  href={`/foreign-investment/journey/${c!.slug}`}
                  className="px-3 py-1.5 bg-white border border-slate-200 hover:border-amber-300 text-xs font-semibold text-slate-700 hover:text-amber-700 rounded-lg transition-colors"
                >
                  {c!.flag} {c!.countryShort}
                </Link>
              ))}
          </div>
        </div>
      </section>

      {/* ── Compliance footer ─────────────────────────────────────────── */}
      <section className="py-6 bg-white border-t border-slate-200">
        <div className="container-custom">
          <p className="text-xs text-slate-500 leading-relaxed">
            {FOREIGN_INVESTOR_GENERAL_DISCLAIMER}
          </p>
        </div>
      </section>
    </div>
  );
}
