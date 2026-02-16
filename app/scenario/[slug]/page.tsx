import { createClient } from "@/lib/supabase/server";
import type { Scenario, Broker } from "@/lib/types";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getAffiliateLink } from "@/lib/tracking";
import AuthorByline from "@/components/AuthorByline";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME } from "@/lib/seo";
import { ADVERTISER_DISCLOSURE_SHORT } from "@/lib/compliance";

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
    <div className="py-12">
      <div className="container-custom max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <div className="text-sm text-slate-500 mb-6">
          <Link href="/" className="hover:text-brand">
            Home
          </Link>
          <span className="mx-2">/</span>
          <Link href="/scenarios" className="hover:text-brand">
            Investing For
          </Link>
          <span className="mx-2">/</span>
          <span className="text-brand">{s.title}</span>
        </div>

        {/* Icon + Title */}
        <div className="flex items-start gap-4 mb-2">
          {s.icon && <span className="text-4xl shrink-0">{s.icon}</span>}
          <h1 className="text-3xl md:text-4xl font-extrabold leading-tight text-brand">
            {s.title}
          </h1>
        </div>

        {/* Subtitle */}
        {s.hero_title && (
          <p className="text-lg text-slate-600 mb-8 leading-relaxed">
            {s.hero_title}
          </p>
        )}

        {/* Author Byline */}
        <AuthorByline variant="light" />

        {/* The Problem */}
        {s.problem && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-6">
            <h2 className="font-extrabold text-lg mb-2 text-red-800">
              The Problem
            </h2>
            <p className="text-slate-700 leading-relaxed">{s.problem}</p>
          </div>
        )}

        {/* The Solution */}
        {s.solution && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-8">
            <h2 className="font-extrabold text-lg mb-2 text-green-800">
              The Solution
            </h2>
            <p className="text-slate-700 leading-relaxed">{s.solution}</p>
          </div>
        )}

        {/* Key Considerations */}
        {s.considerations && s.considerations.length > 0 && (
          <>
            <h2 className="text-xl font-extrabold mb-3 text-brand">
              Key Considerations
            </h2>
            <ul className="mb-8 space-y-2">
              {s.considerations.map((item: string, i: number) => (
                <li key={i} className="flex items-start gap-3 text-slate-700">
                  <span className="text-green-700 font-bold shrink-0">
                    {i + 1}.
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {/* Quiz nudge — placed between considerations and broker list */}
        <div className="mb-8">
          <Link
            href="/quiz"
            className="text-sm text-green-700 font-semibold hover:underline transition-colors"
          >
            Not sure which is right? Take our 60-second quiz &rarr;
          </Link>
        </div>

        {/* Brokers Worth Comparing */}
        {recBrokers.length > 0 && (
          <>
            <h2 className="text-xl font-extrabold mb-3 text-brand">
              Brokers Worth Comparing
            </h2>
            <p className="text-xs text-slate-400 mb-3">{ADVERTISER_DISCLOSURE_SHORT}</p>
            <div className="space-y-3 mb-8">
              {recBrokers.map((b) => (
                <div
                  key={b.slug}
                  className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl flex-wrap"
                >
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-sm font-bold shrink-0"
                    style={{ background: `${b.color}20`, color: b.color }}
                  >
                    {b.icon || b.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-[200px]">
                    <h3 className="font-bold text-brand">{b.name}</h3>
                    {b.tagline && (
                      <p className="text-xs text-slate-600">{b.tagline}</p>
                    )}
                    <div className="flex gap-3 mt-1 text-[0.65rem] text-slate-500">
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
                  <div className="flex gap-2 shrink-0">
                    <Link
                      href={`/broker/${b.slug}`}
                      className="px-3 py-2 text-sm border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Review
                    </Link>
                    <a
                      href={getAffiliateLink(b)}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="px-3 py-2 text-sm bg-green-700 text-white rounded-lg hover:bg-green-800 transition-colors"
                    >
                      {b.cta_text || `Visit ${b.name}`}
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Bottom CTA */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center">
          <h2 className="text-lg font-extrabold mb-2 text-brand">
            Need help deciding?
          </h2>
          <p className="text-slate-600 mb-5 text-sm max-w-md mx-auto">
            Compare all brokers side-by-side or use our 60-second quiz to filter platforms by your criteria.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/compare"
              className="px-6 py-3 bg-green-700 text-white text-sm font-bold rounded-lg hover:bg-green-800 transition-colors"
            >
              Compare All Brokers
            </Link>
            <Link
              href="/quiz"
              className="px-6 py-3 border border-slate-300 text-brand text-sm font-bold rounded-lg hover:bg-white transition-colors"
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
