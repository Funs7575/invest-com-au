import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { absoluteUrl, breadcrumbJsonLd, SITE_NAME, ORGANIZATION_JSONLD } from "@/lib/seo";

export const revalidate = 86400;

export async function generateStaticParams() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return [];
  }
  const supabase = await createClient();
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

interface NewsletterEdition {
  id: number;
  edition_date: string;
  subject: string;
  html_content: string;
  fee_changes_count: number;
  articles_count: number;
  deals_count: number;
  created_at: string;
}

export default async function NewsletterEditionPage({
  params,
}: {
  params: Promise<{ edition: string }>;
}) {
  const { edition } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("newsletter_editions")
    .select("*")
    .eq("edition_date", edition)
    .single();

  if (!data) notFound();

  const editionData = data as NewsletterEdition;

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
        {/* Breadcrumbs */}
        <nav className="text-xs md:text-sm text-slate-500 mb-2 md:mb-4">
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

        {/* Edition header */}
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

        {/* Rendered HTML content */}
        <div className="border border-slate-200 rounded-2xl bg-white overflow-hidden shadow-sm">
          <div
            className="newsletter-html-content"
            dangerouslySetInnerHTML={{ __html: editionData.html_content }}
          />
        </div>

        {/* Back link */}
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
