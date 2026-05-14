import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { breadcrumbJsonLd, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { HELP_CATEGORIES, getArticleBySlug } from "@/lib/help-content";

export const revalidate = 86400;

export function generateStaticParams() {
  return HELP_CATEGORIES.flatMap((cat) =>
    cat.articles.map((art) => ({ category: cat.slug, article: art.slug })),
  );
}

export async function generateMetadata(
  { params }: { params: Promise<{ category: string; article: string }> },
): Promise<Metadata> {
  const { category, article } = await params;
  const found = getArticleBySlug(category, article);
  if (!found) return {};
  const { category: cat, article: art } = found;
  return {
    title: `${art.title} | Help Centre | Invest.com.au`,
    description: art.summary,
    alternates: { canonical: `/help/${cat.slug}/${art.slug}` },
    openGraph: {
      title: `${art.title} | Help Centre`,
      description: art.summary,
      url: absoluteUrl(`/help/${cat.slug}/${art.slug}`),
    },
  };
}

export default async function HelpArticlePage(
  { params }: { params: Promise<{ category: string; article: string }> },
) {
  const { category, article } = await params;
  const found = getArticleBySlug(category, article);
  if (!found) notFound();

  const { category: cat, article: art } = found;

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Help Centre", url: absoluteUrl("/help") },
    { name: cat.title, url: absoluteUrl(`/help/${cat.slug}`) },
    { name: art.title, url: absoluteUrl(`/help/${cat.slug}/${art.slug}`) },
  ]);

  const faqSchema = art.faqs
    ? faqJsonLd(art.faqs.map((f) => ({ q: f.question, a: f.answer })))
    : null;

  const otherArticles = cat.articles.filter((a) => a.slug !== art.slug);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}

      <div className="bg-white min-h-screen">
        {/* Breadcrumb nav */}
        <div className="bg-slate-50 border-b border-slate-100 py-3 px-4">
          <div className="container-custom max-w-3xl">
            <nav className="text-xs text-slate-500">
              <Link href="/" className="hover:text-slate-700">Home</Link>
              <span className="mx-1.5">/</span>
              <Link href="/help" className="hover:text-slate-700">Help Centre</Link>
              <span className="mx-1.5">/</span>
              <Link href={`/help/${cat.slug}`} className="hover:text-slate-700">{cat.title}</Link>
              <span className="mx-1.5">/</span>
              <span className="text-slate-700">{art.title}</span>
            </nav>
          </div>
        </div>

        <div className="container-custom max-w-3xl py-8 md:py-12 px-4">
          {/* Article header */}
          <div className="mb-6 md:mb-8">
            <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-2">
              {cat.title}
            </p>
            <h1 className="text-xl md:text-3xl font-extrabold text-slate-900 mb-3">
              {art.title}
            </h1>
            <p className="text-sm md:text-base text-slate-500">{art.summary}</p>
            <p className="text-xs text-slate-400 mt-2">Last updated: {art.updatedAt}</p>
          </div>

          {/* Article body */}
          <div className="prose prose-slate prose-sm md:prose-base max-w-none mb-8">
            {art.body.map((paragraph, i) => (
              <p key={i} className="mb-4 text-slate-700 leading-relaxed">
                {paragraph}
              </p>
            ))}
          </div>

          {/* FAQs */}
          {art.faqs && art.faqs.length > 0 && (
            <div className="mb-8">
              <h2 className="text-base md:text-xl font-bold text-slate-900 mb-4">
                Frequently asked questions
              </h2>
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100">
                {art.faqs.map((faq) => (
                  <div key={faq.question} className="p-4 md:p-5">
                    <h3 className="text-sm font-semibold text-slate-900 mb-1.5">
                      {faq.question}
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{faq.answer}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Related articles */}
          {otherArticles.length > 0 && (
            <div className="border-t border-slate-100 pt-6 mb-8">
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wide mb-3">
                Related in {cat.title}
              </h2>
              <ul className="space-y-2">
                {otherArticles.map((other) => (
                  <li key={other.slug}>
                    <Link
                      href={`/help/${cat.slug}/${other.slug}`}
                      className="text-sm text-blue-700 hover:underline"
                    >
                      {other.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between pt-6 border-t border-slate-100">
            <Link href={`/help/${cat.slug}`} className="text-xs text-blue-700 hover:underline">
              ← Back to {cat.title}
            </Link>
            <Link href="/help" className="text-xs text-slate-500 hover:text-slate-700">
              Help Centre home
            </Link>
          </div>

          {/* Contact prompt */}
          <div className="mt-8 bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
            <p className="text-xs text-slate-600">
              Was this helpful?{" "}
              <a href="mailto:help@invest.com.au" className="text-blue-700 hover:underline">
                Let us know
              </a>{" "}
              or{" "}
              <a href="mailto:help@invest.com.au" className="text-blue-700 hover:underline">
                ask a question
              </a>
              .
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
