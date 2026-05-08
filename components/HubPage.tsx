import type { ReactNode } from "react";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import {
  GENERAL_ADVICE_WARNING,
  REGULATORY_NOTE,
  ADVERTISER_DISCLOSURE_SHORT,
  CRYPTO_WARNING,
  PROPERTY_GENERAL_DISCLAIMER,
} from "@/lib/compliance";
import HubHero from "@/components/HubHero";
import HubServiceGrid from "@/components/HubServiceGrid";
import type { HubConfig } from "@/lib/verticals";

/**
 * <HubPage> — config-driven hub layout HOC (W-12, hub foundation stream).
 *
 * Accepts a `HubConfig` from `lib/verticals.ts` and renders the canonical hub
 * anatomy per HUB_BLUEPRINT.md §2:
 *   breadcrumb + FAQPage JSON-LD → HubHero → HubServiceGrid → {children} →
 *   FAQ accordion → compliance block.
 *
 * The `children` slot carries hub-specific content that depends on components
 * still in open PRs (DirectoryGrid, CalculatorShell, EligibilityQuiz,
 * HubArticleStrip, HubDeepDiveGrid, HubAdvisorCTA, CrossHubLinks). Those
 * will be wired into HubPage as each PR merges.
 *
 * After W-12 lands, new hubs ship as: one HubConfig row in lib/verticals.ts +
 * a page.tsx of ~10 LOC that passes the config here.
 */

// Per-complianceKey addenda appended below the standard GAW.
const COMPLIANCE_ADDENDA: Record<string, string> = {
  crypto: CRYPTO_WARNING,
  property: PROPERTY_GENERAL_DISCLAIMER,
  smsf:
    "Self-Managed Super Funds are subject to superannuation law. SMSF trustees are responsible for ensuring their fund meets all legal obligations. Seek specialist SMSF advice from a licensed adviser before making decisions.",
  grants:
    "Grant eligibility, amounts, and program availability change frequently. Verify current details directly with the relevant government agency or program administrator before applying.",
  wholesale_s708:
    "Some opportunities referenced may only be available to wholesale investors as defined by s708 of the Corporations Act 2001 (Cth). Nothing on this page constitutes an offer of a financial product.",
  aged_care:
    "Aged care costs and means-testing rules are set by government regulation and change frequently. Verify current fees and assessment thresholds with My Aged Care or a licensed aged care adviser.",
  tax_agent:
    "Tax information on this page is general in nature. Tax laws change frequently. Consult a registered tax agent for advice specific to your situation.",
};

interface HubPageProps {
  config: HubConfig;
  /**
   * Hub-specific content rendered between the service grid and the FAQ
   * section — calculators, directories, quizzes, articles, deep-dives, etc.
   */
  children?: ReactNode;
}

export default function HubPage({ config, children }: HubPageProps) {
  const { slug, parentSlug, title, hero, serviceGrid, faqs, complianceKey } =
    config;

  // ── Breadcrumbs (for HubHero nav + JSON-LD) ──────────────────────────────
  const breadcrumbs = [
    { name: "Home", href: "/" },
    ...(parentSlug
      ? [
          {
            name: parentSlug.charAt(0).toUpperCase() + parentSlug.slice(1),
            href: `/${parentSlug}`,
          },
        ]
      : []),
    { name: title },
  ];

  // ── JSON-LD ───────────────────────────────────────────────────────────────
  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    ...(parentSlug
      ? [{ name: parentSlug, url: `${SITE_URL}/${parentSlug}` }]
      : []),
    { name: title, url: `${SITE_URL}/${slug}` },
  ]);

  const faqLd =
    faqs.length > 0
      ? faqJsonLd(faqs.map((f) => ({ q: f.question, a: f.answer })))
      : null;

  // ── Compliance ────────────────────────────────────────────────────────────
  const complianceAddendum = COMPLIANCE_ADDENDA[complianceKey] ?? null;

  // ── Service grid mapping ──────────────────────────────────────────────────
  // ServiceCard (HubConfig) → HubServiceItem (HubServiceGrid prop).
  // icon defaults to "arrow-right"; cta defaults to "Learn more".
  const serviceItems =
    serviceGrid && serviceGrid.length > 0
      ? serviceGrid.map((card) => ({
          title: card.title,
          description: card.description,
          href: card.href,
          icon: card.icon ?? "arrow-right",
          cta: card.cta ?? "Learn more",
        }))
      : null;

  const serviceGridColumns: 2 | 3 =
    serviceItems && serviceItems.length > 4 ? 3 : 2;

  return (
    <>
      {/* ── Structured data ──────────────────────────────────────────────── */}
      <script
        type="application/ld+json"
        data-testid="hub-breadcrumb-jsonld"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {faqLd && (
        <script
          type="application/ld+json"
          data-testid="hub-faqpage-jsonld"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}

      <div className="bg-white min-h-screen" data-testid="hub-page">
        {/* ── §1 HERO ────────────────────────────────────────────────────── */}
        <HubHero hero={hero} breadcrumbs={breadcrumbs} />

        {/* ── §2 SERVICE GRID ───────────────────────────────────────────── */}
        {serviceItems && (
          <HubServiceGrid
            heading={`${title} Services`}
            items={serviceItems}
            columns={serviceGridColumns}
          />
        )}

        {/* ── §3 HUB-SPECIFIC CONTENT (children slot) ───────────────────── */}
        {/* Filled progressively as W-04..W-11 PRs merge into main:
            HubArticleStrip, HubDeepDiveGrid, HubAdvisorCTA, DirectoryGrid,
            CalculatorShell, EligibilityQuiz, CrossHubLinks. */}
        {children}

        {/* ── §4 FAQ ACCORDION ──────────────────────────────────────────── */}
        {faqs.length > 0 && (
          <section
            className="py-12 bg-slate-50"
            data-testid="hub-faq-section"
          >
            <div className="container-custom max-w-4xl">
              <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-8">
                Frequently Asked Questions
              </h2>
              <div className="divide-y divide-slate-200">
                {faqs.map((faq, i) => (
                  <details
                    key={i}
                    className="group py-4"
                    data-testid="hub-faq-item"
                  >
                    <summary className="flex cursor-pointer items-center justify-between gap-4 text-base font-bold text-slate-900 list-none [&::-webkit-details-marker]:hidden">
                      {faq.question}
                      <span
                        className="shrink-0 text-amber-500 transition-transform group-open:rotate-180"
                        aria-hidden="true"
                      >
                        ▼
                      </span>
                    </summary>
                    <p className="mt-3 text-sm leading-relaxed text-slate-600">
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── §5 COMPLIANCE BLOCK ───────────────────────────────────────── */}
        <section
          className="border-t border-slate-200 bg-white py-8"
          data-testid="hub-compliance"
        >
          <div className="container-custom max-w-4xl space-y-2 text-xs text-slate-500">
            <p>{GENERAL_ADVICE_WARNING}</p>
            {complianceAddendum && (
              <p data-testid="hub-compliance-addendum">{complianceAddendum}</p>
            )}
            <p>{REGULATORY_NOTE}</p>
            <p>{ADVERTISER_DISCLOSURE_SHORT}</p>
          </div>
        </section>
      </div>
    </>
  );
}
