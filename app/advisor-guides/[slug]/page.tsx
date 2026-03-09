import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { getAdvisorGuide, getAllAdvisorGuideSlugs } from "@/lib/advisor-guides";
import { PROFESSIONAL_TYPE_LABELS } from "@/lib/types";
import { absoluteUrl, breadcrumbJsonLd, CURRENT_YEAR } from "@/lib/seo";
import AdvisorPrompt from "@/components/AdvisorPrompt";
import Icon from "@/components/Icon";

export function generateStaticParams() {
  return getAllAdvisorGuideSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const guide = getAdvisorGuide(slug);
  if (!guide) return {};

  return {
    title: `${guide.title} (${CURRENT_YEAR})`,
    description: guide.metaDescription,
    openGraph: { title: `${guide.title} — Invest.com.au`, description: guide.metaDescription },
    twitter: { card: "summary_large_image" },
    alternates: { canonical: `/advisor-guides/${slug}` },
  };
}

export default async function AdvisorGuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const guide = getAdvisorGuide(slug);
  if (!guide) notFound();

  const typeLabel = PROFESSIONAL_TYPE_LABELS[guide.type];

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Find an Advisor", url: absoluteUrl("/advisors") },
    { name: guide.title },
  ]);

  const faqLd = guide.faqs.length > 0 ? {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: guide.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  } : null;

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: guide.title,
    description: guide.metaDescription,
    publisher: { "@type": "Organization", name: "Invest.com.au" },
    mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(`/advisor-guides/${slug}`) },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      {faqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />}

      <article className="py-5 md:py-12">
        <div className="container-custom max-w-3xl">
          {/* Breadcrumb */}
          <nav className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
            <Link href="/" className="hover:text-slate-900">Home</Link>
            <span className="mx-1.5 md:mx-2">/</span>
            <Link href="/advisors" className="hover:text-slate-900">Advisors</Link>
            <span className="mx-1.5 md:mx-2">/</span>
            <span className="text-slate-700">Guide</span>
          </nav>

          {/* Header */}
          <h1 className="text-xl md:text-4xl font-extrabold text-slate-900 mb-2 md:mb-4 leading-tight">
            {guide.title}
          </h1>
          <p className="text-sm md:text-base text-slate-500 mb-6 md:mb-10 leading-relaxed max-w-2xl">
            {guide.intro}
          </p>

          {/* Content sections */}
          <div className="space-y-6 md:space-y-10 mb-8 md:mb-12">
            {guide.sections.map((section, i) => (
              <section key={i}>
                <h2 className="text-lg md:text-2xl font-bold text-slate-900 mb-2 md:mb-3">{section.heading}</h2>
                <p className="text-sm md:text-base text-slate-600 leading-relaxed">{section.body}</p>
              </section>
            ))}
          </div>

          {/* Checklist */}
          {guide.checklist.length > 0 && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 md:p-6 mb-6 md:mb-8">
              <h2 className="text-base md:text-lg font-bold text-emerald-900 mb-3 flex items-center gap-2">
                <Icon name="check-circle" size={20} className="text-emerald-600" />
                Checklist Before You Hire
              </h2>
              <div className="space-y-2">
                {guide.checklist.map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-[0.62rem] font-bold shrink-0 mt-0.5">{i + 1}</span>
                    <span className="text-xs md:text-sm text-slate-700">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Red flags */}
          {guide.redFlags.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 md:p-6 mb-6 md:mb-8">
              <h2 className="text-base md:text-lg font-bold text-red-900 mb-3 flex items-center gap-2">
                <Icon name="alert-triangle" size={20} className="text-red-500" />
                Red Flags to Watch For
              </h2>
              <div className="space-y-2">
                {guide.redFlags.map((flag, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="text-red-500 mt-0.5 shrink-0">✗</span>
                    <span className="text-xs md:text-sm text-slate-700">{flag}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FAQs */}
          {guide.faqs.length > 0 && (
            <div className="mb-6 md:mb-8">
              <h2 className="text-base md:text-lg font-bold text-slate-900 mb-3">Frequently Asked Questions</h2>
              <div className="space-y-2">
                {guide.faqs.map((faq, i) => (
                  <details key={i} className="bg-white border border-slate-200 rounded-lg group">
                    <summary className="px-3.5 py-3 font-semibold text-xs md:text-sm text-slate-800 cursor-pointer hover:bg-slate-50 transition-colors list-none flex items-center justify-between">
                      {faq.q}
                      <span className="text-slate-400 group-open:rotate-180 transition-transform ml-2 shrink-0">▾</span>
                    </summary>
                    <p className="px-3.5 pb-3 text-xs md:text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                  </details>
                ))}
              </div>
            </div>
          )}

          {/* CTA */}
          <AdvisorPrompt type={guide.type} />

          {/* Related guides */}
          <div className="mt-8 md:mt-12 pt-6 border-t border-slate-200">
            <h3 className="text-sm md:text-base font-bold text-slate-900 mb-3">More Advisor Guides</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "SMSF Accountant", href: "/advisor-guides/how-to-choose-smsf-accountant" },
                { label: "Financial Planner", href: "/advisor-guides/how-to-choose-financial-planner" },
                { label: "Tax Agent", href: "/advisor-guides/how-to-choose-tax-agent-investments" },
                { label: "Property Advisor", href: "/advisor-guides/how-to-choose-property-investment-advisor" },
                { label: "Mortgage Broker", href: "/advisor-guides/how-to-choose-mortgage-broker" },
                { label: "Estate Planner", href: "/advisor-guides/how-to-choose-estate-planner" },
              ].filter(g => g.href !== `/advisor-guides/${slug}`).map(g => (
                <Link key={g.href} href={g.href} className="text-xs md:text-sm px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors font-medium text-slate-600">{g.label} Guide</Link>
              ))}
            </div>
            <h3 className="text-sm md:text-base font-bold text-slate-900 mt-4 mb-3">Compare Advisor Types</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "SMSF Accountant vs DIY", href: "/advisor-guides/smsf-accountant-vs-diy" },
                { label: "Financial Planner vs Robo", href: "/advisor-guides/financial-planner-vs-robo-advisor" },
                { label: "Tax Agent vs Accountant", href: "/advisor-guides/tax-agent-vs-accountant" },
                { label: "Mortgage Broker vs Bank", href: "/advisor-guides/mortgage-broker-vs-bank" },
                { label: "Buyer's Agent vs DIY", href: "/advisor-guides/buyers-agent-vs-diy" },
                { label: "Compare All Types", href: "/advisor-guides/compare" },
              ].filter(g => g.href !== `/advisor-guides/${slug}`).map(g => (
                <Link key={g.href} href={g.href} className="text-xs md:text-sm px-3 py-1.5 bg-violet-50 border border-violet-200 rounded-lg hover:bg-violet-100 transition-colors font-medium text-violet-700">{g.label}</Link>
              ))}
            </div>
          </div>

          {/* Compliance */}
          <div className="mt-6 text-[0.56rem] md:text-xs text-slate-400 text-center leading-relaxed">
            This guide is for informational purposes only and does not constitute financial advice. Always verify credentials on the ASIC Financial Advisers Register or Tax Practitioners Board before engaging any professional.
          </div>
        </div>
      </article>
    </>
  );
}
