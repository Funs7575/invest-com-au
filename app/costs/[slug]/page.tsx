import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import type { Broker } from "@/lib/types";
import {
  getCostScenarioBySlug,
  getAllCostScenarioSlugs,
} from "@/lib/cost-scenarios";
import {
  absoluteUrl,
  breadcrumbJsonLd,
  SITE_NAME,
  REVIEW_AUTHOR,
  REVIEW_METHODOLOGY_URL,
} from "@/lib/seo";
import { getAffiliateLink, AFFILIATE_REL } from "@/lib/tracking";
import AuthorByline from "@/components/AuthorByline";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import CompactDisclaimerLine from "@/components/CompactDisclaimerLine";

export const revalidate = 3600; // ISR: revalidate every hour

export function generateStaticParams() {
  return getAllCostScenarioSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const scenario = getCostScenarioBySlug(slug);
  if (!scenario) return { title: "Not Found" };

  return {
    title: `${scenario.title} — ${SITE_NAME}`,
    description: scenario.metaDescription,
    openGraph: {
      title: scenario.title,
      description: scenario.metaDescription,
      url: absoluteUrl(`/costs/${slug}`),
    },
    alternates: { canonical: `/costs/${slug}` },
  };
}

function formatCurrency(n: number): string {
  return n.toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default async function CostScenarioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const scenario = getCostScenarioBySlug(slug);
  if (!scenario) notFound();

  const supabase = await createClient();
  const { data: allBrokers } = await supabase
    .from("brokers")
    .select("*")
    .eq("status", "active");

  const brokers = ((allBrokers as Broker[]) || [])
    .filter(scenario.filter)
    .sort(scenario.sort);

  // Calculate costs for each broker
  const brokerCosts = brokers.map((b) => ({
    broker: b,
    annualCost: scenario.calculateAnnualCost(b),
  }));

  const cheapest = brokerCosts[0]?.annualCost ?? 0;
  const mostExpensive = brokerCosts[brokerCosts.length - 1]?.annualCost ?? 0;

  // JSON-LD
  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Cost Comparisons", url: absoluteUrl("/costs") },
    { name: scenario.h1 },
  ]);

  const faqLd =
    scenario.faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: scenario.faqs.map((f) => ({
            "@type": "Question",
            name: f.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: f.answer,
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
      {faqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
        />
      )}
      <Header />
      <main className="max-w-4xl mx-auto px-4 py-12">
        {/* Breadcrumbs */}
        <nav className="text-xs text-slate-400 mb-6" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-slate-600">Home</Link>
          <span className="mx-1.5">/</span>
          <Link href="/costs" className="hover:text-slate-600">Cost Comparisons</Link>
          <span className="mx-1.5">/</span>
          <span className="text-slate-600">{scenario.h1}</span>
        </nav>

        <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 mb-3">
          {scenario.h1}
        </h1>
        <p className="text-slate-600 mb-2 max-w-2xl">{scenario.intro}</p>

        <AuthorByline
          name={REVIEW_AUTHOR.name}
          verifiedDate={
            brokers.length > 0
              ? new Date(
                  brokers.reduce((latest, b) => {
                    const ts = b.updated_at || "";
                    return ts > latest ? ts : latest;
                  }, "")
                ).toLocaleDateString("en-AU", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })
              : undefined
          }
          showMethodologyLink
        />

        {/* Scenario details */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-8">
          <h2 className="font-semibold text-slate-900 text-sm mb-2">
            Scenario: {scenario.inputs.description}
          </h2>
          <ul className="text-xs text-slate-500 space-y-1">
            {scenario.costBreakdown.map((line, i) => (
              <li key={i} className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0" />
                {line}
              </li>
            ))}
          </ul>
          {brokerCosts.length > 1 && (
            <p className="text-xs text-slate-400 mt-2">
              Savings: up to{" "}
              <span className="font-bold text-blue-700">
                {formatCurrency(mostExpensive - cheapest)}
              </span>{" "}
              per year by choosing the cheapest broker.
            </p>
          )}
        </div>

        {/* Cost comparison table */}
        <div className="overflow-x-auto mb-10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left">
                <th className="py-3 pr-4 font-semibold text-slate-900">#</th>
                <th className="py-3 pr-4 font-semibold text-slate-900">Broker</th>
                <th className="py-3 pr-4 font-semibold text-slate-900 text-right">
                  ASX Fee
                </th>
                {scenario.inputs.usTradesPerMonth != null && (
                  <>
                    <th className="py-3 pr-4 font-semibold text-slate-900 text-right">
                      US Fee
                    </th>
                    <th className="py-3 pr-4 font-semibold text-slate-900 text-right">
                      FX Rate
                    </th>
                  </>
                )}
                <th className="py-3 font-semibold text-slate-900 text-right">
                  Total Cost
                </th>
                <th className="py-3 pl-4"></th>
              </tr>
            </thead>
            <tbody>
              {brokerCosts.map(({ broker: b, annualCost }, i) => {
                const isCheapest = i === 0;
                return (
                  <tr
                    key={b.id}
                    className={`border-b border-slate-100 ${
                      isCheapest
                        ? "bg-amber-50/40 border-l-2 border-l-amber-400"
                        : ""
                    }`}
                  >
                    <td className="py-3 pr-4 text-slate-400 text-xs">
                      {isCheapest ? "🏆" : i + 1}
                    </td>
                    <td className="py-3 pr-4">
                      <Link
                        href={`/broker/${b.slug}`}
                        className="font-semibold text-slate-900 hover:text-blue-700 hover:underline"
                      >
                        {b.name}
                      </Link>
                      {isCheapest && (
                        <span className="ml-2 text-[10px] font-bold uppercase bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">
                          Cheapest
                        </span>
                      )}
                    </td>
                    <td className="py-3 pr-4 text-right text-slate-700">
                      {b.asx_fee || "—"}
                    </td>
                    {scenario.inputs.usTradesPerMonth != null && (
                      <>
                        <td className="py-3 pr-4 text-right text-slate-700">
                          {b.us_fee || "—"}
                        </td>
                        <td className="py-3 pr-4 text-right text-slate-700">
                          {b.fx_rate != null ? `${b.fx_rate}%` : "—"}
                        </td>
                      </>
                    )}
                    <td className="py-3 text-right font-bold text-slate-900">
                      {annualCost === 0 ? (
                        <span className="text-emerald-700">$0</span>
                      ) : (
                        formatCurrency(annualCost)
                      )}
                    </td>
                    <td className="py-3 pl-4">
                      {b.affiliate_url && (
                        <a
                          href={getAffiliateLink(b)}
                          target="_blank"
                          rel={AFFILIATE_REL}
                          className="inline-block px-3 py-1.5 text-xs font-semibold bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors whitespace-nowrap"
                        >
                          {b.cta_text || "Visit Broker"}
                        </a>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <CompactDisclaimerLine />

        {/* Editorial content */}
        {scenario.sections.map((section, i) => (
          <section key={i} className="mb-8">
            <h2 className="text-xl font-bold text-slate-900 mb-2">
              {section.heading}
            </h2>
            <p className="text-slate-600 leading-relaxed">{section.body}</p>
          </section>
        ))}

        {/* FAQs */}
        {scenario.faqs.length > 0 && (
          <section className="mb-10">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {scenario.faqs.map((faq, i) => (
                <div
                  key={i}
                  className="bg-white border border-slate-200 rounded-lg p-4"
                >
                  <h3 className="font-semibold text-slate-900 mb-1">
                    {faq.question}
                  </h3>
                  <p className="text-sm text-slate-600">{faq.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Related links */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
          <h3 className="font-semibold text-slate-900 mb-3">Related</h3>
          <div className="flex flex-wrap gap-2">
            {scenario.relatedLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm px-3 py-1.5 bg-white border border-slate-200 rounded-lg hover:border-slate-400 transition-colors text-slate-700"
              >
                {link.label} →
              </Link>
            ))}
          </div>
        </div>

        {/* How we calculated */}
        <div className="mt-8 text-xs text-slate-400 text-center">
          <p>
            Costs calculated using verified broker fees.{" "}
            <Link href="/methodology" className="underline hover:text-slate-900">
              How we calculate
            </Link>{" "}
            &middot;{" "}
            <Link href="/how-we-earn" className="underline hover:text-slate-900">
              How we earn money
            </Link>{" "}
            &middot;{" "}
            <Link href="/how-we-verify" className="underline hover:text-slate-900">
              Fee verification process
            </Link>
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
