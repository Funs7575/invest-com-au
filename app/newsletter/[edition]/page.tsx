import { createStaticClient } from "@/lib/supabase/static";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME, ORGANIZATION_JSONLD } from "@/lib/seo";
import { sanitizeHtml } from "@/lib/sanitize-html";
import { getGatedNewsletter } from "@/lib/server/premium-content";
import ProPaywall from "@/components/ProPaywall";

export const revalidate = 0;

export async function generateStaticParams() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return [];
  }
  const supabase = createStaticClient();
  const { data } = await supabase
    .from("newsletter_editions")
    .select("edition_date");
  return (data || []).map((e) => ({ edition: e.edition_date }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ edition: string }>;
}): Promise<Metadata> {
  const { edition } = await params;
  const date = new Date(edition + "T00:00:00Z");

  if (isNaN(date.getTime())) {
    return { title: "Edition Not Found" };
  }

  const formattedDate = date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const title = `Weekly Digest — ${formattedDate} — ${SITE_NAME}`;
  const description = `Invest.com.au weekly newsletter for ${formattedDate}. Fee changes, new articles, and broker deals across Australian investing platforms.`;

  return {
    title,
    description,
    openGraph: {
      type: "article",
      title,
      description,
      url: absoluteUrl(`/newsletter/${edition}`),
      publishedTime: edition,
      images: [
        {
          url: `/api/og?title=Weekly+Digest&subtitle=${encodeURIComponent(formattedDate)}&type=article`,
          width: 1200,
          height: 630,
        },
      ],
    },
    twitter: { card: "summary_large_image", title, description },
    alternates: { canonical: `/newsletter/${edition}` },
    robots: { index: true, follow: true },
  };
}

export default async function NewsletterEditionPage({
  params,
}: {
  params: Promise<{ edition: string }>;
}) {
  const { edition } = await params;
  const { edition: editionData, isPro, truncatedHtml } = await getGatedNewsletter(edition);

  if (!editionData) notFound();

  const date = new Date(editionData.edition_date + "T00:00:00Z");
  const formattedDate = date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Newsletter", url: absoluteUrl("/newsletter") },
    { name: formattedDate },
  ]);

  const newsArticleJsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: editionData.subject,
    datePublished: editionData.edition_date,
    dateModified: editionData.created_at,
    description: `Weekly investing digest for ${formattedDate}. ${editionData.fee_changes_count} fee changes, ${editionData.articles_count} new articles, ${editionData.deals_count} active deals.`,
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": absoluteUrl(`/newsletter/${edition}`),
    },
    publisher: ORGANIZATION_JSONLD,
    author: ORGANIZATION_JSONLD,
    isAccessibleForFree: false,
    hasPart: {
      "@type": "WebPageElement",
      isAccessibleForFree: false,
      cssSelector: "[data-pro-gated]",
    },
  };

  return (
    <div className="pt-5 pb-8 md:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(newsArticleJsonLd) }}
      />
      <div className="container-custom">
        <nav aria-label="Breadcrumb" className="text-xs md:text-sm text-slate-500 mb-2 md:mb-4">
          <Link href="/" className="hover:text-slate-900">
            Home
          </Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <Link href="/newsletter" className="hover:text-slate-900">
            Newsletter
          </Link>
          <span className="mx-1.5 md:mx-2">/</span>
          <span className="text-slate-700">{formattedDate}</span>
        </nav>

        <div className="mb-4 md:mb-8">
          <p className="text-xs md:text-sm text-amber-600 font-semibold mb-1">
            Weekly Digest
          </p>
          <h1 className="text-lg md:text-3xl font-extrabold text-slate-900 mb-2">
            {editionData.subject}
          </h1>
          <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs md:text-sm text-slate-500">
            <time dateTime={editionData.edition_date}>{formattedDate}</time>
            {editionData.fee_changes_count > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-medium text-[0.69rem] md:text-xs">
                {editionData.fee_changes_count} fee{" "}
                {editionData.fee_changes_count === 1 ? "change" : "changes"}
              </span>
            )}
            {editionData.articles_count > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium text-[0.69rem] md:text-xs">
                {editionData.articles_count}{" "}
                {editionData.articles_count === 1 ? "article" : "articles"}
              </span>
            )}
            {editionData.deals_count > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 font-medium text-[0.69rem] md:text-xs">
                {editionData.deals_count}{" "}
                {editionData.deals_count === 1 ? "deal" : "deals"}
              </span>
            )}
          </div>
        </div>

        {/* Rendered HTML content.
            For non-Pro readers the html source is already truncated server-
            side in `lib/server/premium-content.ts` (the full payload never
            leaves the server). The column-level GRANT on
            `newsletter_editions.html_content` blocks anon/authenticated REST
            reads of the full digest entirely — see migration
            20260517_w2_17_premium_content_column_grants.sql. Sanitised here
            via lib/sanitize-html.ts as defence-in-depth and to satisfy the
            invest/no-unsafe-inner-html lint rule. */}
        <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-sm">
          <div
            className="newsletter-html-content"
            data-pro-gated={!isPro || undefined}
            dangerouslySetInnerHTML={{ __html: sanitizeHtml(truncatedHtml) }}
          />
        </div>

        {!isPro && (
          <div className="mt-6" data-pro-gated>
            <ProPaywall
              title="Read the full digest"
              description="The rest of this edition (fee changes, deal explainers, new platform launches) is for Pro members. Get unlimited archive access plus the weekly digest delivered to your inbox."
              bullets={[
                "Full newsletter archive",
                "Fee-change alerts as they happen",
                "Pro-only deals & platform reviews",
                "Cancel anytime",
              ]}
            />
          </div>
        )}

        <div className="mt-6 md:mt-10 text-center">
          <Link
            href="/newsletter"
            className="text-sm font-semibold text-amber-600 hover:text-amber-700 transition-colors"
          >
            &larr; Browse all editions
          </Link>
        </div>
      </div>
    </div>
  );
}
