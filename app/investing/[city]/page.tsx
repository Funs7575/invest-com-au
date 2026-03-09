import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Broker } from "@/lib/types";
import { getCityBySlug, getAllCitySlugs, CITIES } from "@/lib/cities";
import {
  absoluteUrl,
  breadcrumbJsonLd,
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
  GENERAL_ADVICE_WARNING,
} from "@/lib/compliance";
import { boostFeaturedPartner, isSponsored } from "@/lib/sponsorship";
import BrokerLogo from "@/components/BrokerLogo";
import BrokerCard from "@/components/BrokerCard";
import CompactDisclaimerLine from "@/components/CompactDisclaimerLine";
import AdvisorPrompt from "@/components/AdvisorPrompt";
import ScrollReveal from "@/components/ScrollReveal";
import SponsorBadge from "@/components/SponsorBadge";
import Icon from "@/components/Icon";

export const revalidate = 3600;

export async function generateStaticParams() {
  return getAllCitySlugs().map((city) => ({ city }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city: slug } = await params;
  const city = getCityBySlug(slug);
  if (!city) return {};

  return {
    title: city.metaTitle,
    description: city.metaDescription,
    alternates: { canonical: `/investing/${city.slug}` },
    openGraph: {
      title: city.metaTitle,
      description: city.metaDescription,
      url: absoluteUrl(`/investing/${city.slug}`),
      images: [
        {
          url: `/api/og?title=${encodeURIComponent(city.h1)}&subtitle=${encodeURIComponent(city.metaDescription.slice(0, 80))}&type=best`,
          width: 1200,
          height: 630,
          alt: city.h1,
        },
      ],
    },
    twitter: { card: "summary_large_image" },
  };
}

export default async function CityInvestingPage({
  params,
}: {
  params: Promise<{ city: string }>;
}) {
  const { city: slug } = await params;
  const city = getCityBySlug(slug);
  if (!city) notFound();

  const supabase = await createClient();

  const { data: brokers } = await supabase
    .from("brokers")
    .select("*")
    .eq("status", "active")
    .in("platform_type", ["share_broker", "crypto_exchange", "robo_advisor", "super_fund"]);

  const sorted = boostFeaturedPartner(
    [...((brokers as Broker[]) || [])].sort(
      (a, b) => (b.rating ?? 0) - (a.rating ?? 0)
    ),
    0
  );

  const hasSponsored = sorted.some(isSponsored);
  const relatedCities = city.relatedCities
    .map((s) => getCityBySlug(s))
    .filter(Boolean);

  const verticals = [
    { label: "Share Trading", href: "/share-trading", icon: "trending-up", color: "bg-amber-50 text-amber-700 border-amber-200" },
    { label: "Crypto Exchanges", href: "/crypto", icon: "bitcoin", color: "bg-orange-50 text-orange-700 border-orange-200" },
    { label: "Savings Accounts", href: "/savings", icon: "piggy-bank", color: "bg-sky-50 text-sky-700 border-sky-200" },
    { label: "Super Funds", href: "/super", icon: "shield", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
    { label: "CFD & Forex", href: "/cfd", icon: "bar-chart", color: "bg-rose-50 text-rose-700 border-rose-200" },
  ];

  /* ─── JSON-LD ─── */
  const webPageJsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: city.h1,
    description: city.metaDescription,
    url: absoluteUrl(`/investing/${city.slug}`),
    publisher: ORGANIZATION_JSONLD,
    dateModified: new Date().toISOString().split("T")[0],
    about: {
      "@type": "City",
      name: city.name,
      containedInPlace: {
        "@type": "State",
        name: city.state,
      },
    },
  };

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: city.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Investing", url: absoluteUrl("/investing") },
    { name: city.name },
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
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />

      <div className="py-5 md:py-12">
        <div className="container-custom max-w-4xl">
          {/* Breadcrumb */}
          <nav className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
            <Link href="/" className="hover:text-slate-900">
              Home
            </Link>
            <span className="mx-2">/</span>
            <Link href="/investing" className="hover:text-slate-900">
              Investing
            </Link>
            <span className="mx-2">/</span>
            <span className="text-slate-700">{city.name}</span>
          </nav>

          {/* ─── Hero ─── */}
          <div className="bg-gradient-to-br from-slate-50 to-white border border-slate-200 rounded-2xl p-4 md:p-8 mb-3 md:mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded-full">
                {city.stateShort}
              </span>
              <span className="text-xs text-slate-400">
                Pop. {city.population}
              </span>
            </div>
            <h1 className="text-xl md:text-4xl font-extrabold mb-2 md:mb-3 text-slate-900">
              {city.h1}
            </h1>
            <p className="text-xs md:text-base text-slate-600 mb-4 max-w-2xl leading-relaxed">
              {city.intro}
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
              <div className="bg-white/70 border border-white rounded-xl px-3 py-2 text-center">
                <div className="text-base md:text-xl font-extrabold text-slate-800">
                  {sorted.length}+
                </div>
                <div className="text-[0.6rem] md:text-xs text-slate-500 font-medium">
                  Platforms Compared
                </div>
              </div>
              <div className="bg-white/70 border border-white rounded-xl px-3 py-2 text-center">
                <div className="text-base md:text-xl font-extrabold text-slate-800">
                  $0
                </div>
                <div className="text-[0.6rem] md:text-xs text-slate-500 font-medium">
                  Lowest Brokerage
                </div>
              </div>
              <div className="bg-white/70 border border-white rounded-xl px-3 py-2 text-center">
                <div className="text-base md:text-xl font-extrabold text-slate-800">
                  {CURRENT_YEAR}
                </div>
                <div className="text-[0.6rem] md:text-xs text-slate-500 font-medium">
                  Data Updated
                </div>
              </div>
              <div className="bg-white/70 border border-white rounded-xl px-3 py-2 text-center">
                <div className="text-base md:text-xl font-extrabold text-slate-800">
                  100%
                </div>
                <div className="text-[0.6rem] md:text-xs text-slate-500 font-medium">
                  Independent
                </div>
              </div>
            </div>

            <p className="text-[0.56rem] md:text-xs text-slate-400 mt-3">
              {ADVERTISER_DISCLOSURE_SHORT}
            </p>
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

          {/* ─── Why Invest in {City} ─── */}
          <section className="mb-6 md:mb-10">
            <h2 className="text-lg md:text-2xl font-bold mb-3">
              Why Invest in {city.name}?
            </h2>
            <p className="text-sm md:text-base text-slate-600 leading-relaxed">
              {city.localContext}
            </p>
          </section>

          {/* ─── Comparison Table ─── */}
          <h2 className="text-lg md:text-2xl font-bold mb-3 md:mb-4">
            Top Investment Platforms Available in {city.name}
          </h2>

          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto mb-4">
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
                  <th className="px-4 py-3 text-left font-semibold text-sm">
                    ASX Fee
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-sm">
                    US Fee
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-sm">
                    CHESS
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-sm">
                    Rating
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {sorted.slice(0, 10).map((broker, i) => (
                  <tr
                    key={broker.id}
                    className={`hover:bg-slate-50 ${i === 0 ? "bg-amber-50/40" : ""}`}
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
                            <div className="text-[0.69rem] font-extrabold text-amber-700 uppercase tracking-wide">
                              Top Pick
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {broker.asx_fee || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {broker.us_fee || "N/A"}
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span
                        className={
                          broker.chess_sponsored
                            ? "text-emerald-600 font-semibold"
                            : "text-red-500"
                        }
                      >
                        {broker.chess_sponsored ? "\u2713" : "\u2717"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-center">
                      <span className="text-amber">
                        {renderStars(broker.rating || 0)}
                      </span>
                      <span className="text-sm text-slate-500 ml-1">
                        {broker.rating}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <a
                        href={getAffiliateLink(broker)}
                        target="_blank"
                        rel={AFFILIATE_REL}
                        className="inline-block px-4 py-2 bg-slate-900 text-white text-sm font-semibold rounded-lg hover:bg-slate-800 transition-colors"
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
          <div className="md:hidden space-y-2 mb-4">
            {sorted.slice(0, 10).map((broker, i) => (
              <BrokerCard
                key={broker.id}
                broker={broker}
                badge={i === 0 ? "Top Pick" : undefined}
                context="compare"
              />
            ))}
          </div>
          <CompactDisclaimerLine />

          {/* ─── Explore by Category ─── */}
          <section className="mb-6 md:mb-10 mt-6 md:mt-10">
            <h2 className="text-lg md:text-xl font-bold mb-3">
              Explore Investment Categories
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-3">
              {verticals.map((v) => (
                <Link
                  key={v.href}
                  href={v.href}
                  className={`flex items-center gap-2.5 p-3 border rounded-xl hover:shadow-md transition-all group ${v.color}`}
                >
                  <div className="w-8 h-8 rounded-lg bg-white/60 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Icon name={v.icon} size={16} />
                  </div>
                  <span className="text-sm font-semibold">{v.label}</span>
                </Link>
              ))}
            </div>
          </section>

          {/* ─── Find a Financial Advisor CTA ─── */}
          <section className="mb-6 md:mb-10">
            <div className="bg-gradient-to-br from-violet-50 to-slate-50 border border-violet-200/60 rounded-xl p-4 md:p-6">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                  <Icon name="briefcase" size={20} className="text-violet-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base md:text-lg font-bold text-slate-900 mb-1">
                    Find a Financial Advisor in {city.name}
                  </h2>
                  <p className="text-xs md:text-sm text-slate-500 mb-3 leading-relaxed">
                    Browse verified financial planners, SMSF accountants, and
                    wealth managers serving {city.name} and{" "}
                    {city.stateShort}. Free consultation requests, no obligation.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/find-advisor?location=${city.slug}`}
                      className="px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors"
                    >
                      Find an Advisor in {city.name} &rarr;
                    </Link>
                    <Link
                      href="/find-advisor"
                      className="px-4 py-2 border border-slate-200 text-slate-600 text-xs font-semibold rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Browse All Advisors &rarr;
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ─── FAQ Section ─── */}
          <section className="mb-6 md:mb-10">
            <h2 className="text-xl font-bold mb-4">
              Frequently Asked Questions — Investing in {city.name}
            </h2>
            <div className="space-y-3">
              {city.faqs.map((faq, i) => (
                <details
                  key={i}
                  className="border border-slate-200 rounded-lg"
                >
                  <summary className="px-4 py-3 font-semibold text-sm cursor-pointer hover:bg-slate-50 transition-colors">
                    {faq.question}
                  </summary>
                  <p className="px-4 pb-4 text-sm text-slate-600 leading-relaxed">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </section>

          {/* ─── Related Cities ─── */}
          {relatedCities.length > 0 && (
            <section className="mb-6 md:mb-10">
              <h2 className="text-lg md:text-xl font-bold mb-3">
                Investing in Other Australian Cities
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
                {relatedCities.map(
                  (rc) =>
                    rc && (
                      <Link
                        key={rc.slug}
                        href={`/investing/${rc.slug}`}
                        className="block p-3 md:p-4 border border-slate-200 rounded-xl hover:border-slate-400 hover:bg-slate-50/50 transition-all group"
                      >
                        <div className="text-sm font-bold text-slate-800 group-hover:text-slate-900">
                          {rc.name}
                        </div>
                        <div className="text-[0.6rem] md:text-xs text-slate-500 mt-0.5">
                          {rc.stateShort} &middot; Pop. {rc.population}
                        </div>
                      </Link>
                    )
                )}
              </div>
            </section>
          )}

          <CompactDisclaimerLine />
        </div>
      </div>
    </>
  );
}
