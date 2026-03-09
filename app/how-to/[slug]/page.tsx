import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import { PLATFORM_TYPE_LABELS } from "@/lib/types";
import { getGuide, getAllGuideSlugs, getAllGuides } from "@/lib/how-to-guides";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  SITE_NAME,
  SITE_URL,
  CURRENT_YEAR,
  CURRENT_MONTH_YEAR,
  ORGANIZATION_JSONLD,
  REVIEW_AUTHOR,
} from "@/lib/seo";
import { ADVERTISER_DISCLOSURE_SHORT, GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import { getAffiliateLink, getBenefitCta, renderStars, AFFILIATE_REL } from "@/lib/tracking";
import { boostFeaturedPartner, isSponsored } from "@/lib/sponsorship";
import BrokerLogo from "@/components/BrokerLogo";
import CompactDisclaimerLine from "@/components/CompactDisclaimerLine";
import ContextualLeadMagnet from "@/components/ContextualLeadMagnet";
import AdvisorPrompt from "@/components/AdvisorPrompt";
import ScrollReveal from "@/components/ScrollReveal";
import Icon from "@/components/Icon";

export const revalidate = 3600;

export function generateStaticParams() {
  return getAllGuideSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) return {};

  return {
    title: guide.title,
    description: guide.metaDescription,
    alternates: { canonical: `/how-to/${guide.slug}` },
    openGraph: {
      title: guide.h1,
      description: guide.metaDescription,
      url: `/how-to/${guide.slug}`,
      images: [
        {
          url: `/api/og/how-to?slug=${encodeURIComponent(guide.slug)}`,
          width: 1200,
          height: 630,
          alt: guide.h1,
        },
      ],
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function HowToGuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = getGuide(slug);
  if (!guide) notFound();

  const supabase = await createClient();

  // Fetch brokers for recommendation table
  const { data: brokers } = await supabase
    .from("brokers")
    .select(
      "id, name, slug, color, icon, logo_url, rating, asx_fee, asx_fee_value, us_fee, us_fee_value, fx_rate, chess_sponsored, smsf_support, is_crypto, platform_type, min_deposit, inactivity_fee, pros, cons, cta_text, affiliate_url, sponsorship_tier, benefit_cta, deal, deal_text, status"
    )
    .eq("status", "active")
    .order("rating", { ascending: false });

  const allBrokers = (brokers as Broker[]) || [];
  const filteredBrokers = allBrokers.filter(guide.relatedBrokerFilter);
  const topBrokers = boostFeaturedPartner(filteredBrokers).slice(0, 5);

  // Other guides for related section
  const allGuides = getAllGuides().filter((g) => g.slug !== guide.slug);

  // JSON-LD
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "How-To Guides", url: absoluteUrl("/how-to") },
    { name: guide.h1 },
  ]);

  const howToJsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: guide.h1,
    description: guide.intro,
    totalTime: "PT10M",
    estimatedCost: {
      "@type": "MonetaryAmount",
      currency: "AUD",
      value: "0",
    },
    step: guide.steps.map((step, i) => ({
      "@type": "HowToStep",
      position: i + 1,
      name: step.heading,
      text: step.body.slice(0, 500),
      url: absoluteUrl(`/how-to/${guide.slug}#step-${i + 1}`),
    })),
    author: {
      "@type": "Person",
      name: REVIEW_AUTHOR.name,
      url: REVIEW_AUTHOR.url,
    },
    publisher: ORGANIZATION_JSONLD,
    datePublished: "2025-01-15",
    dateModified: new Date().toISOString().split("T")[0],
  };

  const faqJsonLd =
    guide.faqs.length >= 2
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: guide.faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.answer,
            },
          })),
        }
      : null;

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
      )}

      <div className="py-5 md:py-12">
        <div className="container-custom max-w-3xl">
          {/* Breadcrumb */}
          <nav className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <span className="mx-1.5 md:mx-2">/</span>
            <Link href="/how-to" className="hover:text-slate-900">
              How-To Guides
            </Link>
            <span className="mx-1.5 md:mx-2">/</span>
            <span className="text-slate-700 line-clamp-1">{guide.h1}</span>
          </nav>

          {/* Hero */}
          <div className="mb-6 md:mb-10">
            <div className="flex items-center gap-2 mb-2 md:mb-3">
              <span className="text-[0.6rem] md:text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                STEP-BY-STEP GUIDE
              </span>
              <span className="text-[0.6rem] md:text-xs text-slate-400">
                ~10 min read
              </span>
            </div>
            <h1 className="text-xl md:text-4xl font-extrabold mb-2 md:mb-4">
              {guide.h1}
            </h1>
            <p className="text-xs md:text-base text-slate-500 leading-relaxed">
              {guide.intro}
            </p>
            <div className="flex items-center gap-3 mt-3 md:mt-4 text-[0.6rem] md:text-xs text-slate-400">
              <span>
                By{" "}
                <a
                  href={REVIEW_AUTHOR.url}
                  className="underline hover:text-slate-700"
                >
                  {REVIEW_AUTHOR.name}
                </a>
              </span>
              <span>Updated {CURRENT_MONTH_YEAR}</span>
            </div>
          </div>

          {/* Table of contents */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 md:p-5 mb-6 md:mb-10">
            <h2 className="text-sm md:text-base font-bold text-slate-900 mb-2">
              In This Guide
            </h2>
            <ol className="space-y-1">
              {guide.steps.map((step, i) => (
                <li key={i}>
                  <a
                    href={`#step-${i + 1}`}
                    className="flex items-center gap-2 text-xs md:text-sm text-slate-600 hover:text-slate-900 py-0.5"
                  >
                    <span className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-slate-900 text-white text-[0.6rem] md:text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    {step.heading}
                  </a>
                </li>
              ))}
            </ol>
          </div>

          {/* Disclosure */}
          <p className="text-[0.6rem] md:text-xs text-slate-400 mb-6 md:mb-8">
            {ADVERTISER_DISCLOSURE_SHORT}
          </p>

          {/* Steps */}
          {guide.steps.map((step, i) => (
            <div key={i}>
              <ScrollReveal>
                <section
                  id={`step-${i + 1}`}
                  className="mb-8 md:mb-12 scroll-mt-20"
                >
                  <div className="flex items-start gap-3 mb-3 md:mb-4">
                    <span className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-slate-900 text-white text-sm md:text-base font-bold flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <h2 className="text-lg md:text-2xl font-bold text-slate-900 pt-1">
                      {step.heading}
                    </h2>
                  </div>
                  <div className="pl-11 md:pl-[52px]">
                    {step.body.split("\n\n").map((para, j) => (
                      <p
                        key={j}
                        className="text-sm md:text-base text-slate-600 leading-relaxed mb-3 md:mb-4"
                      >
                        {para}
                      </p>
                    ))}
                  </div>
                </section>
              </ScrollReveal>

              {/* After step 1: broker comparison table */}
              {i === 0 && topBrokers.length > 0 && (
                <ScrollReveal>
                  <div className="bg-white border border-slate-200 rounded-xl p-3.5 md:p-5 mb-8 md:mb-12">
                    <h3 className="text-sm md:text-lg font-bold text-slate-900 mb-3 md:mb-4">
                      Top {PLATFORM_TYPE_LABELS[topBrokers[0].platform_type]}s
                      for This Guide
                    </h3>
                    <div className="space-y-2 md:space-y-3">
                      {topBrokers.map((broker, idx) => (
                        <div
                          key={broker.slug}
                          className="flex items-center gap-2.5 md:gap-4 p-2.5 md:p-3.5 border border-slate-100 rounded-lg hover:border-slate-200 transition-colors"
                        >
                          <span className="text-[0.6rem] md:text-xs font-bold text-slate-400 w-4 shrink-0">
                            {idx + 1}
                          </span>
                          <BrokerLogo broker={broker} size="sm" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <Link
                                href={`/broker/${broker.slug}`}
                                className="text-xs md:text-sm font-semibold text-slate-900 hover:underline truncate"
                              >
                                {broker.name}
                              </Link>
                              {isSponsored(broker) && (
                                <span className="text-[0.5rem] md:text-[0.6rem] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                  Promoted
                                </span>
                              )}
                            </div>
                            <p className="text-[0.6rem] md:text-xs text-slate-400 truncate">
                              {broker.asx_fee
                                ? `ASX: ${broker.asx_fee}`
                                : PLATFORM_TYPE_LABELS[broker.platform_type]}
                              {broker.rating
                                ? ` · ${renderStars(broker.rating)} ${broker.rating}/5`
                                : ""}
                            </p>
                          </div>
                          <a
                            href={getAffiliateLink(broker)}
                            rel={AFFILIATE_REL}
                            className="shrink-0 text-[0.6rem] md:text-xs font-semibold text-white bg-slate-900 px-3 py-1.5 md:px-4 md:py-2 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap"
                          >
                            {getBenefitCta(broker, "compare")}
                          </a>
                        </div>
                      ))}
                    </div>
                    <p className="text-[0.62rem] md:text-xs text-slate-400 mt-2 md:mt-3">
                      {ADVERTISER_DISCLOSURE_SHORT}
                    </p>
                  </div>
                </ScrollReveal>
              )}

              {/* After step 3: lead magnet */}
              {i === 2 && (
                <div className="mb-8 md:mb-12">
                  <ContextualLeadMagnet segment="beginner-guide" />
                </div>
              )}
            </div>
          ))}

          {/* Advisor prompt */}
          <div className="mb-8 md:mb-12">
            <AdvisorPrompt context="general" />
          </div>

          {/* FAQ section */}
          {guide.faqs.length > 0 && (
            <section className="mb-8 md:mb-12">
              <h2 className="text-lg md:text-2xl font-bold text-slate-900 mb-4 md:mb-6">
                Frequently Asked Questions
              </h2>
              <div className="space-y-3 md:space-y-4">
                {guide.faqs.map((faq, i) => (
                  <details
                    key={i}
                    className="group border border-slate-200 rounded-lg"
                  >
                    <summary className="flex items-center justify-between cursor-pointer p-3 md:p-4 text-sm md:text-base font-semibold text-slate-900 hover:bg-slate-50 rounded-lg">
                      {faq.question}
                      <Icon
                        name="chevron-down"
                        size={16}
                        className="text-slate-400 group-open:rotate-180 transition-transform shrink-0 ml-2"
                      />
                    </summary>
                    <div className="px-3 pb-3 md:px-4 md:pb-4 -mt-1">
                      <p className="text-xs md:text-sm text-slate-600 leading-relaxed">
                        {faq.answer}
                      </p>
                    </div>
                  </details>
                ))}
              </div>
            </section>
          )}

          {/* Related guides */}
          {allGuides.length > 0 && (
            <section className="mb-8 md:mb-12">
              <h2 className="text-lg md:text-2xl font-bold text-slate-900 mb-3 md:mb-5">
                Related Guides
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                {allGuides.map((g) => (
                  <Link
                    key={g.slug}
                    href={`/how-to/${g.slug}`}
                    className="group flex items-center gap-3 p-3 md:p-4 border border-slate-200 rounded-lg hover:border-slate-400 transition-all"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs md:text-sm font-semibold text-slate-900 group-hover:underline truncate">
                        {g.h1}
                      </p>
                      <p className="text-[0.6rem] md:text-xs text-slate-400">
                        {g.steps.length} steps · ~10 min read
                      </p>
                    </div>
                    <Icon
                      name="chevron-right"
                      size={16}
                      className="text-slate-400 group-hover:text-slate-700 shrink-0"
                    />
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Related best pages */}
          {guide.relatedBestPages.length > 0 && (
            <section className="mb-6 md:mb-10">
              <h3 className="text-sm md:text-base font-bold text-slate-900 mb-2 md:mb-3">
                Related Comparisons
              </h3>
              <div className="flex flex-wrap gap-2">
                {guide.relatedBestPages.map((page) => (
                  <Link
                    key={page.href}
                    href={page.href}
                    className="text-xs md:text-sm text-slate-600 border border-slate-200 px-3 py-1.5 rounded-lg hover:border-slate-400 hover:text-slate-900 transition-colors"
                  >
                    {page.label}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* General advice warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 md:p-4 mb-4 md:mb-6">
            <p className="text-[0.6rem] md:text-xs text-amber-800 leading-relaxed">
              <strong>Important:</strong> {GENERAL_ADVICE_WARNING}
            </p>
          </div>

          <CompactDisclaimerLine />
        </div>
      </div>
    </>
  );
}
