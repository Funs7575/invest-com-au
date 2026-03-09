import Link from "next/link";
import type { Broker, Article } from "@/lib/types";
import type { VerticalConfig } from "@/lib/verticals";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  REVIEW_AUTHOR,
  SITE_NAME,
  SITE_URL,
  ORGANIZATION_JSONLD,
  CURRENT_YEAR,
} from "@/lib/seo";
import {
  getAffiliateLink,
  getBenefitCta,
  renderStars,
  AFFILIATE_REL,
} from "@/lib/tracking";
import {
  ADVERTISER_DISCLOSURE_SHORT,
  SPONSORED_DISCLOSURE_SHORT,
  GENERAL_ADVICE_WARNING,
  PDS_CONSIDERATION,
  FSG_NOTE,
  AFCA_REFERENCE,
} from "@/lib/compliance";
import { isSponsored } from "@/lib/sponsorship";
import BrokerCard from "@/components/BrokerCard";
import BrokerLogo from "@/components/BrokerLogo";
import CompactDisclaimerLine from "@/components/CompactDisclaimerLine";
import ContextualLeadMagnet from "@/components/ContextualLeadMagnet";
import ScrollReveal from "@/components/ScrollReveal";
import OnThisPage from "@/components/OnThisPage";
import SponsorBadge from "@/components/SponsorBadge";
import JargonTooltip from "@/components/JargonTooltip";
import Icon from "@/components/Icon";
import { CATEGORY_COLORS } from "@/lib/internal-links";
import PillarExitIntent from "@/components/PillarExitIntent";
import PersonalizedRecommendations from "@/components/PersonalizedRecommendations";

/* ─── Column config per vertical type ─── */

type ColumnDef = {
  label: string;
  jargon?: boolean;
  render: (b: Broker) => React.ReactNode;
  align?: "left" | "center";
};

function getColumns(slug: string): ColumnDef[] {
  if (slug === "crypto") {
    return [
      { label: "Trading Fee", render: (b) => b.asx_fee || "Varies" },
      { label: "Deposit", render: (b) => b.min_deposit || "Free" },
      {
        label: "AUSTRAC",
        align: "center",
        render: () => (
          <span className="text-emerald-600 font-semibold">&#10003;</span>
        ),
      },
      {
        label: "Rating",
        align: "center",
        render: (b) => (
          <>
            <span className="text-amber">{renderStars(b.rating || 0)}</span>
            <span className="text-sm text-slate-500 ml-1">{b.rating}</span>
          </>
        ),
      },
    ];
  }

  if (slug === "savings") {
    return [
      { label: "Interest Rate", render: (b) => b.asx_fee || "Varies" },
      { label: "Min Deposit", render: (b) => b.min_deposit || "$0" },
      {
        label: "Gov. Guaranteed",
        align: "center",
        render: () => (
          <span className="text-emerald-600 font-semibold">&#10003;</span>
        ),
      },
      {
        label: "Rating",
        align: "center",
        render: (b) => (
          <>
            <span className="text-amber">{renderStars(b.rating || 0)}</span>
            <span className="text-sm text-slate-500 ml-1">{b.rating}</span>
          </>
        ),
      },
    ];
  }

  if (slug === "super") {
    return [
      { label: "Admin Fee", render: (b) => b.asx_fee || "Varies" },
      {
        label: "APRA Regulated",
        align: "center",
        render: () => (
          <span className="text-emerald-600 font-semibold">&#10003;</span>
        ),
      },
      {
        label: "Insurance",
        align: "center",
        render: () => (
          <span className="text-emerald-600 font-semibold">&#10003;</span>
        ),
      },
      {
        label: "Rating",
        align: "center",
        render: (b) => (
          <>
            <span className="text-amber">{renderStars(b.rating || 0)}</span>
            <span className="text-sm text-slate-500 ml-1">{b.rating}</span>
          </>
        ),
      },
    ];
  }

  if (slug === "cfd") {
    return [
      { label: "Spread (EUR/USD)", render: (b) => b.asx_fee || "Varies" },
      { label: "US Fee", render: (b) => b.us_fee || "N/A" },
      {
        label: "ASIC",
        align: "center",
        render: () => (
          <span className="text-emerald-600 font-semibold">&#10003;</span>
        ),
      },
      {
        label: "Rating",
        align: "center",
        render: (b) => (
          <>
            <span className="text-amber">{renderStars(b.rating || 0)}</span>
            <span className="text-sm text-slate-500 ml-1">{b.rating}</span>
          </>
        ),
      },
    ];
  }

  // Default: share-trading
  return [
    { label: "ASX Fee", jargon: true, render: (b) => b.asx_fee || "N/A" },
    { label: "US Fee", jargon: true, render: (b) => b.us_fee || "N/A" },
    {
      label: "FX Rate",
      jargon: true,
      render: (b) => (b.fx_rate != null ? `${b.fx_rate}%` : "N/A"),
    },
    {
      label: "CHESS",
      jargon: true,
      align: "center",
      render: (b) => (
        <span
          className={
            b.chess_sponsored
              ? "text-emerald-600 font-semibold"
              : "text-red-500"
          }
        >
          {b.chess_sponsored ? "✓" : "✗"}
        </span>
      ),
    },
    {
      label: "Rating",
      align: "center",
      render: (b) => (
        <>
          <span className="text-amber">{renderStars(b.rating || 0)}</span>
          <span className="text-sm text-slate-500 ml-1">{b.rating}</span>
        </>
      ),
    },
  ];
}

/* ─── Lead magnet segment mapping ─── */

const SLUG_TO_SEGMENT: Record<string, "fee-audit" | "smsf-checklist" | "beginner-guide"> = {
  "share-trading": "fee-audit",
  crypto: "fee-audit",
  savings: "fee-audit",
  super: "smsf-checklist",
  cfd: "fee-audit",
};

/* ─── Main component ─── */

interface ExpertArticle {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  category: string | null;
  author_name: string | null;
  author_photo_url: string | null;
  views: number | null;
  created_at: string;
}

interface VerticalPillarPageProps {
  config: VerticalConfig;
  brokers: Broker[];
  relatedArticles: Pick<Article, "id" | "title" | "slug" | "category" | "read_time">[];
  advisors?: { slug: string; name: string; firm_name: string; type: string; location_display: string; rating: number; review_count: number; photo_url: string; verified: boolean }[];
  expertArticles?: ExpertArticle[];
}

export default function VerticalPillarPage({
  config,
  brokers,
  relatedArticles,
  advisors = [],
  expertArticles = [],
}: VerticalPillarPageProps) {
  const hasSponsored = brokers.some(isSponsored);
  const topPick = brokers[0] || null;
  const columns = getColumns(config.slug);
  const dealBrokers = brokers.filter((b) => b.deal && b.deal_text).slice(0, 3);
  const hasDeals = dealBrokers.length > 0;

  /* ─── JSON-LD ─── */
  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: config.h1,
    description: config.metaDescription,
    url: absoluteUrl(`/${config.slug}`),
    publisher: ORGANIZATION_JSONLD,
    dateModified: new Date().toISOString().split("T")[0],
  };

  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: config.h1,
    numberOfItems: brokers.length,
    itemListElement: brokers.slice(0, 10).map((b, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: b.name,
      url: absoluteUrl(`/broker/${b.slug}`),
    })),
  };

  const faqJsonLd =
    config.faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: config.faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.answer,
            },
          })),
        }
      : null;

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: config.h1 },
  ]);

  return (
    <>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webPageJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      <div className="py-5 md:py-12">
        <OnThisPage
          items={[
            ...(topPick ? [{ id: "top-pick", label: "Top Pick" }] : []),
            ...(hasDeals ? [{ id: "current-deals", label: "Deals" }] : []),
            { id: "subcategories", label: "Categories" },
            { id: "all-platforms", label: "All Platforms" },
            { id: "tools", label: "Tools" },
            ...(config.sections.length > 0
              ? [{ id: "editorial", label: "Analysis" }]
              : []),
            ...(advisors.length > 0 ? [{ id: "expert-advisors", label: "Advisors" }] : []),
            ...(expertArticles.length > 0 ? [{ id: "expert-insights", label: "Expert Insights" }] : []),
            ...(config.faqs.length > 0 ? [{ id: "faq", label: "FAQ" }] : []),
            ...(relatedArticles.length > 0
              ? [{ id: "related-articles", label: "Articles" }]
              : []),
          ]}
        />

        <div className="container-custom max-w-4xl">
          {/* Breadcrumb */}
          <nav className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span className="text-slate-700">{config.h1}</span>
          </nav>

          {/* ─── Hero ─── */}
          <div
            className={`bg-gradient-to-br ${config.color.gradient} border ${config.color.border} rounded-2xl p-4 md:p-8 mb-3 md:mb-4`}
          >
            <h1 className="text-xl md:text-4xl font-extrabold mb-2 md:mb-3 text-slate-900">
              {config.heroHeadline}
            </h1>
            <p className="text-xs md:text-base text-slate-600 mb-4 max-w-2xl">
              {config.heroSubtext}
            </p>

            {/* Key stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
              {config.stats.map((stat, i) => (
                <div
                  key={i}
                  className="bg-white/70 border border-white rounded-xl px-3 py-2 text-center"
                >
                  <div
                    className={`text-base md:text-xl font-extrabold ${config.color.text}`}
                  >
                    {stat.value}
                  </div>
                  <div className="text-[0.6rem] md:text-xs text-slate-500 font-medium">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>

            <p className="text-[0.62rem] md:text-xs text-slate-400 mt-3">
              {ADVERTISER_DISCLOSURE_SHORT}
            </p>
            {hasSponsored && (
              <p className="text-[0.62rem] md:text-xs text-blue-500 mt-1">
                {SPONSORED_DISCLOSURE_SHORT}
              </p>
            )}
          </div>

          {/* General Advice Warning */}
          <div className="hidden md:block bg-slate-50 border border-slate-200 rounded-lg p-3 mb-3 text-[0.69rem] text-slate-500 leading-relaxed">
            <strong className="text-slate-600">
              &#9888;&#65039; General Advice Warning:
            </strong>{" "}
            {GENERAL_ADVICE_WARNING}
          </div>
          <div className="md:hidden mb-3">
            <details className="bg-slate-50 border border-slate-200 rounded-lg">
              <summary className="px-3 py-2 text-[0.62rem] text-slate-500 font-medium cursor-pointer flex items-center gap-1">
                <svg
                  className="w-3 h-3 text-amber-500 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                General advice only — not a personal recommendation.
              </summary>
              <p className="px-3 pb-2.5 text-[0.62rem] text-slate-500 leading-relaxed">
                {GENERAL_ADVICE_WARNING}
              </p>
            </details>
          </div>

          {/* Vertical-specific disclaimer */}
          {config.disclaimer && (
            <div
              className={`${config.color.bg} border ${config.color.border} rounded-lg px-3 py-2 mb-3`}
            >
              <p
                className={`text-[0.69rem] ${config.color.text} leading-relaxed`}
              >
                <strong>&#9888; Risk Warning:</strong> {config.disclaimer}
              </p>
            </div>
          )}

          {/* PDS / FSG / AFCA */}
          <p className="text-[0.62rem] md:text-xs text-slate-400 leading-relaxed mb-3">
            {PDS_CONSIDERATION} {FSG_NOTE} {AFCA_REFERENCE}
          </p>

          {/* Author byline */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 mb-4 pb-4 border-b border-slate-100">
            <span className="flex items-center gap-1.5">
              <svg
                className="w-3.5 h-3.5 text-slate-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
              Reviewed by{" "}
              <Link
                href="/reviewers/editorial-team"
                className="font-semibold text-slate-700 hover:text-slate-900 transition-colors"
              >
                {REVIEW_AUTHOR.name}
              </Link>
              <span className="text-slate-400">
                &middot; {REVIEW_AUTHOR.jobTitle}
              </span>
            </span>
          </div>

          {/* ─── Personalized Recommendations (from quiz) ─── */}
          <div className="mb-4 md:mb-6">
            <PersonalizedRecommendations />
          </div>

          {/* ─── Top Pick ─── */}
          {topPick && (
            <div
              id="top-pick"
              className={`${config.color.bg} border ${config.color.border} rounded-xl p-4 md:p-5 mb-6 md:mb-8 scroll-mt-20`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`text-xs font-bold uppercase tracking-wide ${config.color.text} ${config.color.bg} px-2 py-0.5 rounded-full`}
                >
                  Our Top Pick
                </span>
                {isSponsored(topPick) && <SponsorBadge broker={topPick} />}
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <BrokerLogo broker={topPick} size="lg" />
                  <div>
                    <h3 className="text-xl font-bold">
                      <Link
                        href={`/broker/${topPick.slug}`}
                        className="hover:text-slate-900 transition-colors"
                      >
                        {topPick.name}
                      </Link>
                    </h3>
                    <p className="text-sm text-slate-600 mt-0.5">
                      {topPick.tagline}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-sm">
                      <span className="text-amber">
                        {renderStars(topPick.rating || 0)}
                      </span>
                      <span className="text-slate-500">
                        {topPick.rating}/5
                      </span>
                    </div>
                  </div>
                </div>
                <a
                  href={getAffiliateLink(topPick)}
                  target="_blank"
                  rel={AFFILIATE_REL}
                  className={`shrink-0 px-6 py-3 ${config.color.accent} text-white font-semibold rounded-lg hover:opacity-90 transition-colors text-center`}
                >
                  {getBenefitCta(topPick, "compare")}
                </a>
              </div>
            </div>
          )}

          {/* ─── Current Deals ─── */}
          {hasDeals && (
            <div id="current-deals" className="mb-6 md:mb-8 scroll-mt-20">
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-lg md:text-xl font-bold">Current Deals</h2>
                <span className={`text-[0.6rem] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full ${config.color.bg} ${config.color.text}`}>
                  {dealBrokers.length} {dealBrokers.length === 1 ? "offer" : "offers"}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {dealBrokers.map((broker) => {
                  const expiryDate = broker.deal_expiry ? new Date(broker.deal_expiry) : null;
                  const expiryFormatted = expiryDate
                    ? expiryDate.toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
                    : null;
                  return (
                    <div
                      key={broker.id}
                      className={`relative border-2 ${config.color.border} rounded-xl p-4 bg-white hover:shadow-md transition-all`}
                    >
                      {/* DEAL badge */}
                      <div className="absolute -top-2.5 left-3">
                        <span className={`inline-block text-[0.56rem] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full text-white ${config.color.accent}`}>
                          DEAL
                        </span>
                      </div>

                      {/* Broker info */}
                      <div className="flex items-center gap-2.5 mt-1 mb-2.5">
                        <BrokerLogo broker={broker} size="md" />
                        <div className="min-w-0">
                          <Link
                            href={`/broker/${broker.slug}`}
                            className="text-sm font-bold text-slate-900 hover:text-slate-700 transition-colors truncate block"
                          >
                            {broker.name}
                          </Link>
                          {broker.rating && (
                            <span className="text-[0.62rem] text-slate-400">{renderStars(broker.rating)} {broker.rating}/5</span>
                          )}
                        </div>
                      </div>

                      {/* Deal text */}
                      <div className="bg-amber-50 border border-amber-200/60 rounded-lg px-3 py-2 mb-3">
                        <p className="text-sm font-semibold text-slate-800 leading-snug">
                          {broker.deal_text}
                        </p>
                        {expiryFormatted && (
                          <p className="text-[0.6rem] text-amber-600 font-medium mt-1">
                            Exp. {expiryFormatted}
                          </p>
                        )}
                      </div>

                      {/* CTA */}
                      <a
                        href={getAffiliateLink(broker)}
                        target="_blank"
                        rel={AFFILIATE_REL}
                        className={`block w-full text-center py-2.5 ${config.color.accent} text-white text-xs font-bold rounded-lg hover:opacity-90 transition-colors`}
                      >
                        {getBenefitCta(broker, "compare")}
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ─── Subcategory Navigation ─── */}
          <div id="subcategories" className="mb-6 md:mb-8 scroll-mt-20">
            <h2 className="text-lg md:text-xl font-bold mb-3">
              Browse by Category
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
              {config.subcategories.map((sub, i) => (
                <Link
                  key={i}
                  href={sub.href}
                  className="block p-3 border border-slate-200 rounded-xl hover:border-slate-400 hover:bg-slate-50/50 transition-all group"
                >
                  <span className="text-sm font-semibold text-slate-800 group-hover:text-slate-900">
                    {sub.label}
                  </span>
                  <p className="text-[0.6rem] md:text-xs text-slate-500 mt-0.5 line-clamp-2">
                    {sub.description}
                  </p>
                </Link>
              ))}
            </div>
          </div>

          {/* ─── All Platforms Table ─── */}
          <h2
            id="all-platforms"
            className="text-lg md:text-2xl font-bold mb-3 md:mb-4 scroll-mt-20"
          >
            All Platforms ({brokers.length})
          </h2>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto mb-8">
            <ScrollReveal
              animation="table-row-stagger"
              as="table"
              className="w-full border border-slate-200 rounded-lg"
            >
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold text-sm">
                    #
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-sm">
                    Platform
                  </th>
                  {columns.map((col, i) => (
                    <th
                      key={i}
                      className={`px-4 py-3 font-semibold text-sm ${
                        col.align === "center" ? "text-center" : "text-left"
                      }`}
                    >
                      {col.jargon ? (
                        <JargonTooltip term={col.label} />
                      ) : (
                        col.label
                      )}
                    </th>
                  ))}
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {brokers.map((broker, i) => (
                  <tr
                    key={broker.id}
                    className={`hover:bg-slate-50 ${
                      i === 0 ? `${config.color.bg}/40` : ""
                    }`}
                  >
                    <td className="px-4 py-3 text-sm font-semibold text-slate-400">
                      {i + 1}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <BrokerLogo broker={broker} size="sm" />
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <Link
                              href={`/broker/${broker.slug}`}
                              className="font-semibold text-brand hover:text-slate-900 transition-colors"
                            >
                              {broker.name}
                            </Link>
                            {isSponsored(broker) && (
                              <SponsorBadge broker={broker} />
                            )}
                          </div>
                          {i === 0 && (
                            <div
                              className={`text-[0.69rem] font-extrabold ${config.color.text} uppercase tracking-wide`}
                            >
                              Top Pick
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    {columns.map((col, ci) => (
                      <td
                        key={ci}
                        className={`px-4 py-3 text-sm ${
                          col.align === "center" ? "text-center" : ""
                        }`}
                      >
                        {col.render(broker)}
                      </td>
                    ))}
                    <td className="px-4 py-3 text-center">
                      <a
                        href={getAffiliateLink(broker)}
                        target="_blank"
                        rel={AFFILIATE_REL}
                        className={`inline-block px-4 py-2 ${config.color.accent} text-white text-sm font-semibold rounded-lg hover:opacity-90 transition-colors`}
                      >
                        {getBenefitCta(broker, "compare")}
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </ScrollReveal>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-2 mb-6">
            {brokers.map((broker, i) => (
              <BrokerCard
                key={broker.id}
                broker={broker}
                badge={i === 0 ? "Top Pick" : undefined}
                context="compare"
              />
            ))}
          </div>
          <CompactDisclaimerLine />

          {/* ─── Quick Tools ─── */}
          <div id="tools" className="mb-6 md:mb-10 scroll-mt-20">
            <h2 className="text-lg md:text-xl font-bold mb-3">Quick Tools</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
              {config.tools.map((tool, i) => (
                <Link
                  key={i}
                  href={tool.href}
                  className="flex items-center gap-2.5 p-3 border border-slate-200 rounded-xl hover:border-slate-400 hover:bg-slate-50 transition-all group"
                >
                  <div
                    className={`w-8 h-8 rounded-lg ${config.color.bg} flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform`}
                  >
                    <Icon
                      name={tool.icon}
                      size={16}
                      className={config.color.text}
                    />
                  </div>
                  <span className="text-sm font-semibold text-slate-800">
                    {tool.label}
                  </span>
                </Link>
              ))}
            </div>
          </div>

          {/* ─── Editorial Sections ─── */}
          {config.sections.length > 0 && (
            <div
              id="editorial"
              className="space-y-5 md:space-y-8 mb-6 md:mb-10 scroll-mt-20"
            >
              {config.sections.map((section, i) => (
                <section key={i}>
                  <h2 className="text-xl font-bold mb-2">{section.heading}</h2>
                  <p className="text-slate-600 leading-relaxed">
                    {section.body}
                  </p>
                </section>
              ))}
            </div>
          )}

          {/* ─── Lead Magnet ─── */}
          <div className="mb-6 md:mb-10">
            <ContextualLeadMagnet
              segment={SLUG_TO_SEGMENT[config.slug] || "fee-audit"}
            />
          </div>

          {/* ─── Expert Advisors ─── */}
          {advisors.length > 0 && config.advisorTypes && (
            <div id="expert-advisors" className="mb-6 md:mb-10 scroll-mt-20">
              <div className="bg-gradient-to-br from-violet-50 to-white border border-violet-200 rounded-2xl p-4 md:p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg md:text-xl font-bold text-slate-900 flex items-center gap-2">
                      <svg className="w-5 h-5 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                      Need Professional Advice?
                    </h2>
                    <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                      Verified Australian professionals who specialise in this area
                    </p>
                  </div>
                  <Link
                    href="/advisors"
                    className="hidden md:inline-flex items-center gap-1 text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors"
                  >
                    View all &rarr;
                  </Link>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:gap-3 mb-4">
                  {advisors.map((advisor) => {
                    const typeLabel = advisor.type.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
                    return (
                      <Link
                        key={advisor.slug}
                        href={`/advisor/${advisor.slug}`}
                        className="flex items-center gap-3 p-3 bg-white border border-violet-100 rounded-xl hover:border-violet-300 hover:shadow-md transition-all group"
                      >
                        <img
                          src={advisor.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(advisor.name)}&size=80&background=random`}
                          alt={advisor.name}
                          width={44}
                          height={44}
                          className="rounded-full shrink-0 w-11 h-11 object-cover"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-bold text-slate-900 group-hover:text-violet-700 transition-colors truncate">
                              {advisor.name}
                            </p>
                            {advisor.verified && (
                              <svg className="w-3.5 h-3.5 text-violet-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            )}
                          </div>
                          <p className="text-[0.65rem] text-slate-500 truncate">{advisor.firm_name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[0.6rem] text-violet-600 font-medium">{typeLabel}</span>
                            <span className="text-[0.55rem] text-slate-300">&middot;</span>
                            <span className="text-[0.6rem] text-slate-400">{advisor.location_display}</span>
                            {advisor.rating > 0 && (
                              <>
                                <span className="text-[0.55rem] text-slate-300">&middot;</span>
                                <span className="text-[0.6rem] text-amber-600 font-semibold">{advisor.rating}/5</span>
                              </>
                            )}
                          </div>
                        </div>
                        <svg className="w-4 h-4 text-slate-300 group-hover:text-violet-400 transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                      </Link>
                    );
                  })}
                </div>

                {/* Browse by type buttons */}
                <div className="flex flex-wrap gap-2">
                  {config.advisorTypes.map((at) => (
                    <Link
                      key={at.type}
                      href={at.href}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-100 text-violet-700 text-xs font-semibold rounded-lg hover:bg-violet-200 transition-colors"
                    >
                      {at.label} &rarr;
                    </Link>
                  ))}
                  <Link
                    href="/find-advisor"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    Find by location &rarr;
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* ─── Expert Insights ─── */}
          {expertArticles && expertArticles.length > 0 && (
            <section id="expert-insights" className="mb-6 md:mb-10 scroll-mt-20">
              <h2 className="text-xl md:text-2xl font-extrabold text-slate-900 mb-4">Expert Insights</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {expertArticles.map((article: ExpertArticle) => (
                  <a key={article.id} href={`/expert/${article.slug}`} className="bg-white border border-slate-200 rounded-xl p-4 hover:shadow-md hover:border-slate-300 transition-all group">
                    <div className="flex items-center gap-2 mb-2.5">
                      <img
                        src={article.author_photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(article.author_name || 'Expert')}&background=7c3aed&color=fff&size=40`}
                        alt={article.author_name || 'Expert'}
                        className="w-8 h-8 rounded-full object-cover"
                      />
                      <div>
                        <div className="text-[0.62rem] font-bold text-slate-700">{article.author_name || 'Expert Contributor'}</div>
                        <div className="text-[0.55rem] text-slate-400">{article.views ? `${article.views.toLocaleString()} views` : 'Expert article'}</div>
                      </div>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-violet-700 transition-colors mb-1.5 line-clamp-2">{article.title}</h3>
                    {article.excerpt && <p className="text-xs text-slate-500 line-clamp-2">{article.excerpt}</p>}
                    {article.category && (
                      <span className="inline-block mt-2 px-2 py-0.5 bg-violet-50 text-violet-600 text-[0.58rem] font-medium rounded-full">{article.category}</span>
                    )}
                  </a>
                ))}
              </div>
              <div className="mt-3 text-center">
                <a href="/expert" className="text-xs font-bold text-violet-600 hover:text-violet-800 transition-colors">View all expert articles &rarr;</a>
              </div>
            </section>
          )}

          {/* ─── FAQ Section ─── */}
          {config.faqs.length > 0 && (
            <div id="faq" className="mb-6 md:mb-10 scroll-mt-20">
              <h2 className="text-xl font-bold mb-4">
                Frequently Asked Questions
              </h2>
              <div className="space-y-3">
                {config.faqs.map((faq, i) => (
                  <details
                    key={i}
                    className="border border-slate-200 rounded-lg"
                  >
                    <summary className="px-4 py-3 min-h-[44px] font-semibold text-sm cursor-pointer hover:bg-slate-50 transition-colors flex items-center">
                      {faq.question}
                    </summary>
                    <p className="px-4 pb-4 text-sm text-slate-600 leading-relaxed">
                      {faq.answer}
                    </p>
                  </details>
                ))}
              </div>
            </div>
          )}

          {/* ─── Related Articles ─── */}
          {relatedArticles.length > 0 && (
            <div id="related-articles" className="mb-6 md:mb-10 scroll-mt-20">
              <h3 className="text-lg font-bold mb-4">Related Articles</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {relatedArticles.map((ra) => {
                  const color =
                    CATEGORY_COLORS[ra.category || ""] ||
                    "bg-slate-100 text-slate-700";
                  return (
                    <Link
                      key={ra.id}
                      href={`/article/${ra.slug}`}
                      className="border border-slate-200 rounded-xl p-3 md:p-5 hover:shadow-lg hover:scale-[1.02] transition-all bg-white flex flex-col"
                    >
                      {ra.category && (
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full self-start mb-2 ${color}`}
                        >
                          {ra.category}
                        </span>
                      )}
                      <h4 className="text-sm font-bold mb-2 line-clamp-2 flex-1">
                        {ra.title}
                      </h4>
                      {ra.read_time && (
                        <span className="text-xs text-slate-400">
                          {ra.read_time} min read
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          <CompactDisclaimerLine />
        </div>
      </div>

      {/* ─── Exit Intent (client component) ─── */}
      <PillarExitIntent slug={config.slug} />
    </>
  );
}
