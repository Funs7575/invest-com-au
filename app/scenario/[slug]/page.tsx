import { createClient } from "@/lib/supabase/server";
import type { Scenario, Broker } from "@/lib/types";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getAffiliateLink, AFFILIATE_REL } from "@/lib/tracking";
import AuthorByline from "@/components/AuthorByline";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import { ADVERTISER_DISCLOSURE_SHORT } from "@/lib/compliance";
import { getScenarioContent } from "@/lib/scenario-content";
import ContextualLeadMagnet from "@/components/ContextualLeadMagnet";
import OnThisPage from "@/components/OnThisPage";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: scenario } = await supabase
    .from("scenarios")
    .select("title, hero_title")
    .eq("slug", slug)
    .single();

  if (!scenario) return { title: "Scenario Not Found" };

  const title = scenario.title;
  const description =
    scenario.hero_title ||
    `Find the best broker for ${scenario.title.toLowerCase()}. Compare fees, features, and platforms.`;
  const ogImageUrl = `/api/og?title=${encodeURIComponent(`Best Broker for ${scenario.title}`)}&subtitle=${encodeURIComponent(description.slice(0, 80))}&type=scenario`;

  return {
    title,
    description,
    openGraph: {
      title: `${title} — ${SITE_NAME}`,
      description,
      url: absoluteUrl(`/scenario/${slug}`),
      images: [{ url: ogImageUrl, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: "summary_large_image" as const,
      title: `${title} — ${SITE_NAME}`,
      description,
      images: [ogImageUrl],
    },
    alternates: {
      canonical: `/scenario/${slug}`,
    },
  };
}

export default async function ScenarioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: scenario } = await supabase
    .from("scenarios")
    .select("*")
    .eq("slug", slug)
    .single();

  if (!scenario) notFound();

  const s = scenario as Scenario;

  // Fetch actual broker data for recommended brokers
  let recBrokers: Broker[] = [];
  if (s.brokers && s.brokers.length > 0) {
    const { data } = await supabase
      .from("brokers")
      .select("*")
      .eq("status", "active")
      .in("slug", s.brokers);
    recBrokers = (data as Broker[]) || [];
  }

  // Get rich guide content if available
  const guide = getScenarioContent(slug);

  // JSON-LD structured data — FAQ format for rich snippets
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      ...(s.problem ? [{
        "@type": "Question",
        name: `What's the challenge with ${s.title.toLowerCase()}?`,
        acceptedAnswer: { "@type": "Answer", text: s.problem },
      }] : []),
      ...(s.solution ? [{
        "@type": "Question",
        name: `What's the best approach for ${s.title.toLowerCase()}?`,
        acceptedAnswer: { "@type": "Answer", text: s.solution },
      }] : []),
      ...(guide?.faqs?.map(faq => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: { "@type": "Answer", text: faq.answer },
      })) || []),
    ],
  };

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Investing For", url: absoluteUrl("/scenarios") },
    { name: s.title },
  ]);

  return (
    <>
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
    />
    <div className="py-5 md:py-12">
      <div className="container-custom max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <div className="text-xs md:text-sm text-slate-500 mb-3 md:mb-6">
          <Link href="/" className="hover:text-brand">
            Home
          </Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <Link href="/scenarios" className="hover:text-brand">
            Investing For
          </Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <span className="text-brand">{s.title}</span>
        </div>

        {/* Icon + Title */}
        <div className="flex items-start gap-2.5 md:gap-4 mb-1.5 md:mb-2">
          {s.icon && <span className="text-2xl md:text-4xl shrink-0">{s.icon}</span>}
          <h1 className="text-xl md:text-4xl font-extrabold leading-tight text-brand">
            {s.title}
          </h1>
        </div>

        {/* Subtitle */}
        {s.hero_title && (
          <p className="text-sm md:text-lg text-slate-600 mb-4 md:mb-8 leading-relaxed">
            {s.hero_title}
          </p>
        )}

        {/* Author Byline */}
        <AuthorByline variant="light" />

        {/* Sticky On This Page nav */}
        {(() => {
          const tocItems: { id: string; label: string }[] = [];
          if (s.problem) tocItems.push({ id: "the-problem", label: "The Problem" });
          if (s.solution) tocItems.push({ id: "the-solution", label: "The Solution" });
          if (s.considerations?.length) tocItems.push({ id: "key-considerations", label: "Key Considerations" });
          if (recBrokers.length > 0) tocItems.push({ id: "brokers-to-compare", label: "Brokers to Compare" });
          if (guide?.sections) guide.sections.forEach((sec, i) => tocItems.push({ id: `guide-${i}`, label: sec.heading }));
          if (guide?.faqs?.length) tocItems.push({ id: "faqs", label: "FAQ" });
          return tocItems.length > 2 ? <OnThisPage items={tocItems} /> : null;
        })()}

        {/* The Problem */}
        {s.problem && (
          <div id="the-problem" className="bg-red-50 border border-red-200 rounded-xl p-4 md:p-6 mb-4 md:mb-6 scroll-mt-24">
            <h2 className="font-extrabold text-base md:text-lg mb-1.5 md:mb-2 text-red-800">
              The Problem
            </h2>
            <p className="text-sm md:text-base text-slate-700 leading-relaxed">{s.problem}</p>
          </div>
        )}

        {/* The Solution */}
        {s.solution && (
          <div id="the-solution" className="bg-green-50 border border-green-200 rounded-xl p-4 md:p-6 mb-5 md:mb-8 scroll-mt-24">
            <h2 className="font-extrabold text-base md:text-lg mb-1.5 md:mb-2 text-green-800">
              The Solution
            </h2>
            <p className="text-sm md:text-base text-slate-700 leading-relaxed">{s.solution}</p>
          </div>
        )}

        {/* Key Considerations */}
        {s.considerations && s.considerations.length > 0 && (
          <>
            <h2 id="key-considerations" className="text-lg md:text-xl font-extrabold mb-2 md:mb-3 text-brand scroll-mt-24">
              Key Considerations
            </h2>
            <ul className="mb-5 md:mb-8 space-y-2">
              {s.considerations.map((item: string, i: number) => (
                <li key={i} className="flex items-start gap-2.5 md:gap-3 text-sm md:text-base text-slate-700">
                  <span className="text-slate-700 font-bold shrink-0">
                    {i + 1}.
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Quiz nudge — placed between considerations and broker list */}
        <div className="mb-5 md:mb-8">
          <Link
            href="/quiz"
            className="text-xs md:text-sm text-slate-700 font-semibold hover:underline transition-colors min-h-[44px] inline-flex items-center"
          >
            Not sure which is right? Take our 60-second quiz &rarr;
          </Link>
        </div>

        {/* Brokers Worth Comparing */}
        {recBrokers.length > 0 && (
          <>
            <h2 id="brokers-to-compare" className="text-lg md:text-xl font-extrabold mb-2 md:mb-3 text-brand scroll-mt-24">
              Brokers Worth Comparing
            </h2>
            <p className="text-[0.69rem] md:text-xs text-slate-400 mb-2.5 md:mb-3">{ADVERTISER_DISCLOSURE_SHORT}</p>
            <div className="space-y-2.5 md:space-y-3 mb-5 md:mb-8">
              {recBrokers.map((b) => (
                <div
                  key={b.slug}
                  className="flex items-center gap-3 md:gap-4 p-3 md:p-4 bg-white border border-slate-200 rounded-xl flex-wrap"
                >
                  <div
                    className="w-10 h-10 md:w-12 md:h-12 rounded-lg flex items-center justify-center text-xs md:text-sm font-bold shrink-0"
                    style={{ background: `${b.color}20`, color: b.color }}
                  >
                    {b.icon || b.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-sm md:text-base text-brand">{b.name}</h3>
                    {b.tagline && (
                      <p className="text-[0.69rem] md:text-xs text-slate-600 truncate">{b.tagline}</p>
                    )}
                    <div className="flex flex-wrap gap-x-2.5 md:gap-x-3 gap-y-0.5 mt-1 text-[0.62rem] md:text-[0.69rem] text-slate-500">
                      {b.asx_fee && <span>ASX: {b.asx_fee}</span>}
                      {b.rating && (
                        <span>
                          Rating: {b.rating.toFixed(1)}/5
                        </span>
                      )}
                      <span>
                        CHESS: {b.chess_sponsored ? "Yes" : "No"}
                      </span>
                      <span>
                        SMSF: {b.smsf_support ? "Yes" : "No"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2 shrink-0 w-full sm:w-auto">
                    <Link
                      href={`/broker/${b.slug}`}
                      className="flex-1 sm:flex-initial text-center px-3 py-2.5 md:py-2 text-xs md:text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors min-h-[40px] inline-flex items-center justify-center"
                    >
                      Review
                    </Link>
                    <a
                      href={getAffiliateLink(b)}
                      target="_blank"
                      rel={AFFILIATE_REL}
                      className="flex-1 sm:flex-initial text-center px-3 py-2.5 md:py-2 text-xs md:text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors min-h-[40px] inline-flex items-center justify-center"
                    >
                      {b.cta_text || `Visit ${b.name}`}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Rich editorial guide content */}
        {(() => {
          const guide = getScenarioContent(slug);
          if (!guide) return null;
          return (
            <>
              {/* Guide sections */}
              <div className="space-y-5 md:space-y-8 mb-5 md:mb-8">
                {guide.sections.map((section, i) => (
                  <section key={i} id={`guide-${i}`} className="scroll-mt-24">
                    <h2 className="text-lg md:text-xl font-extrabold mb-1.5 md:mb-2 text-brand">{section.heading}</h2>
                    <p className="text-sm md:text-base text-slate-700 leading-relaxed">{section.body}</p>
                  </section>
                ))}
              </div>

              {/* Contextual lead magnet */}
              <div className="mb-5 md:mb-8">
                <ContextualLeadMagnet segment={slug === "smsf" ? "smsf-checklist" : slug === "expats" ? "us-shares-guide" : "fee-audit"} />
              </div>

              {/* FAQ section */}
              {guide.faqs.length > 0 && (
                <div id="faqs" className="mb-5 md:mb-8 scroll-mt-24">
                  <h2 className="text-lg md:text-xl font-extrabold mb-3 md:mb-4 text-brand">Frequently Asked Questions</h2>
                  <div className="space-y-2 md:space-y-3">
                    {guide.faqs.map((faq, i) => (
                      <details key={i} className="border border-slate-200 rounded-lg">
                        <summary className="px-3 md:px-4 py-2.5 md:py-3 font-semibold text-xs md:text-sm cursor-pointer hover:bg-slate-50 transition-colors min-h-[44px] flex items-center">
                          {faq.question}
                        </summary>
                        <p className="px-3 md:px-4 pb-3 md:pb-4 text-xs md:text-sm text-slate-600 leading-relaxed">
                          {faq.answer}
                        </p>
                      </details>
                    ))}
                  </div>
                </div>
              )}

              {/* Related links */}
              <div className="bg-slate-50 rounded-xl p-3.5 md:p-5 mb-5 md:mb-8">
                <h3 className="text-xs md:text-sm font-bold text-slate-700 mb-2 md:mb-3">Related Guides</h3>
                <div className="flex flex-wrap gap-1.5 md:gap-2">
                  {guide.relatedLinks.map((link, i) => (
                    <Link
                      key={i}
                      href={link.href}
                      className="px-2.5 md:px-3 py-1.5 md:py-1.5 bg-white border border-slate-200 rounded-full text-xs md:text-sm text-slate-700 hover:border-slate-700 hover:text-slate-900 transition-colors min-h-[36px] inline-flex items-center"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            </>
          );
        })()}

        {/* Bottom CTA */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 md:p-8 text-center">
          <h2 className="text-base md:text-lg font-extrabold mb-1.5 md:mb-2 text-brand">
            Need help deciding?
          </h2>
          <p className="text-slate-600 mb-3.5 md:mb-5 text-xs md:text-sm max-w-md mx-auto">
            Compare all brokers side-by-side or use our 60-second quiz to filter platforms by your criteria.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 md:gap-3">
            <Link
              href="/compare"
              className="w-full sm:w-auto px-5 md:px-6 py-3 bg-slate-900 text-white text-sm font-bold rounded-lg hover:bg-slate-800 transition-colors min-h-[44px] inline-flex items-center justify-center"
            >
              Compare All Brokers
            </Link>
            <Link
              href="/quiz"
              className="w-full sm:w-auto px-5 md:px-6 py-3 border border-slate-300 text-brand text-sm font-bold rounded-lg hover:bg-white transition-colors min-h-[44px] inline-flex items-center justify-center"
            >
              Take the Quiz
            </Link>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
