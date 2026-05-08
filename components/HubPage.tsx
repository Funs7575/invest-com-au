import type { ReactNode } from "react";
import HubHero from "@/components/HubHero";
import { breadcrumbJsonLd, SITE_URL } from "@/lib/seo";
import { GENERAL_ADVICE_WARNING, CRYPTO_WARNING, SUPER_WARNING } from "@/lib/compliance";
import type { HubConfig, ComplianceKey } from "@/lib/verticals";

/**
 * <HubPage> — layout HOC that orchestrates the full hub-page anatomy from a
 * HubConfig. See docs/audits/HUB_BLUEPRINT.md §2 for the slot ordering.
 *
 * Auto-rendered from config:
 *   - JSON-LD (BreadcrumbList + FAQPage when faqs present)
 *   - HubHero (from config.hero)
 *   - Breadcrumb trail (derived from config.slug / config.parentSlug)
 *   - Compliance footer (derived from config.complianceKey)
 *
 * Slot props (pass null/undefined to suppress a section):
 *   serviceGrid, directory, deepDives, faq, advisorCta, crossHubLinks, children
 *
 * W-12 sub-item 1 — hub foundation stream (REMEDIATION_QUEUE.md).
 */

export interface HubPageProps {
  config: HubConfig;
  /** Rendered <HubServiceGrid> (or equivalent) — optional. */
  serviceGrid?: ReactNode;
  /** Rendered directory component — optional. */
  directory?: ReactNode;
  /** Rendered deep-dives grid — optional. */
  deepDives?: ReactNode;
  /** Rendered <HubFAQ> (or equivalent) — optional. */
  faq?: ReactNode;
  /** Rendered <HubAdvisorCTA> — optional. */
  advisorCta?: ReactNode;
  /** Rendered <CrossHubLinks> — optional. */
  crossHubLinks?: ReactNode;
  /**
   * Catch-all slot for hub-specific sections that don't fit the named slots
   * (article strips, calculators, quizzes, affiliate rails, etc.).
   * Rendered between deepDives and faq.
   */
  children?: ReactNode;
}

/** Derive a short display label from a kebab-case slug. */
function slugToLabel(slug: string): string {
  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/** Derive breadcrumb trail from config. */
function buildBreadcrumbs(config: HubConfig): { name: string; href?: string }[] {
  const crumbs: { name: string; href?: string }[] = [
    { name: "Home", href: "/" },
  ];
  if (config.parentSlug) {
    crumbs.push({
      name: slugToLabel(config.parentSlug),
      href: `/${config.parentSlug}`,
    });
  }
  crumbs.push({ name: slugToLabel(config.slug) });
  return crumbs;
}

/** Map complianceKey → disclaimer paragraph(s). */
function getComplianceText(key: ComplianceKey): string {
  switch (key) {
    case "crypto":
      return `${CRYPTO_WARNING} ${GENERAL_ADVICE_WARNING}`;
    case "super":
      return `${SUPER_WARNING} ${GENERAL_ADVICE_WARNING}`;
    case "smsf":
      return `${SUPER_WARNING} ${GENERAL_ADVICE_WARNING}`;
    default:
      return GENERAL_ADVICE_WARNING;
  }
}

/** Build FAQPage JSON-LD from HubConfig.faqs. */
function faqJsonLd(faqs: HubConfig["faqs"]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export default function HubPage({
  config,
  serviceGrid,
  directory,
  deepDives,
  faq,
  advisorCta,
  crossHubLinks,
  children,
}: HubPageProps) {
  const breadcrumbs = buildBreadcrumbs(config);
  const breadcrumb = breadcrumbJsonLd(
    breadcrumbs.map((c) => ({
      name: c.name,
      ...(c.href ? { url: `${SITE_URL}${c.href}` } : {}),
    }))
  );
  const hasFaqs = config.faqs.length > 0;
  const complianceText = getComplianceText(config.complianceKey);

  return (
    <div data-testid="hub-page">
      {/* JSON-LD — breadcrumbs */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
        data-testid="hub-page-breadcrumb-ld"
      />

      {/* JSON-LD — FAQPage (only when faqs present) */}
      {hasFaqs && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(config.faqs)) }}
          data-testid="hub-page-faq-ld"
        />
      )}

      {/* Hero — auto-rendered from config */}
      <HubHero
        hero={config.hero}
        breadcrumbs={breadcrumbs}
      />

      {/* Service grid slot */}
      {serviceGrid && (
        <div data-testid="hub-page-service-grid">{serviceGrid}</div>
      )}

      {/* Directory slot */}
      {directory && (
        <div data-testid="hub-page-directory">{directory}</div>
      )}

      {/* Deep-dives slot */}
      {deepDives && (
        <div data-testid="hub-page-deep-dives">{deepDives}</div>
      )}

      {/* Catch-all children (article strips, calculators, quizzes, etc.) */}
      {children}

      {/* FAQ slot */}
      {faq && (
        <div data-testid="hub-page-faq">{faq}</div>
      )}

      {/* Advisor CTA footer slot */}
      {advisorCta && (
        <div data-testid="hub-page-advisor-cta">{advisorCta}</div>
      )}

      {/* Cross-hub rail slot */}
      {crossHubLinks && (
        <div data-testid="hub-page-cross-hub-links">{crossHubLinks}</div>
      )}

      {/* Compliance block — auto-rendered from complianceKey */}
      <section
        className="py-8 bg-slate-50 border-t border-slate-200"
        data-testid="hub-page-compliance"
      >
        <div className="container-custom max-w-4xl">
          <p className="text-[11px] text-slate-500 leading-relaxed">
            <strong>General advice warning.</strong>{" "}
            {complianceText}
          </p>
        </div>
      </section>
    </div>
  );
}
