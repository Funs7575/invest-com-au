import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { breadcrumbJsonLd, absoluteUrl } from "@/lib/seo";
import { HELP_CATEGORIES, getCategoryBySlug } from "@/lib/help-content";

export const revalidate = 86400;

export function generateStaticParams() {
  return HELP_CATEGORIES.map((cat) => ({ category: cat.slug }));
}

export async function generateMetadata(
  { params }: { params: Promise<{ category: string }> },
): Promise<Metadata> {
  const { category: categorySlug } = await params;
  const cat = getCategoryBySlug(categorySlug);
  if (!cat) return {};
  return {
    title: `${cat.title} | Help Centre | Invest.com.au`,
    description: cat.description,
    alternates: { canonical: `/help/${cat.slug}` },
    openGraph: {
      title: `${cat.title} | Help Centre`,
      description: cat.description,
      url: absoluteUrl(`/help/${cat.slug}`),
    },
  };
}

export default async function HelpCategoryPage(
  { params }: { params: Promise<{ category: string }> },
) {
  const { category: categorySlug } = await params;
  const cat = getCategoryBySlug(categorySlug);
  if (!cat) notFound();

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Help Centre", url: absoluteUrl("/help") },
    { name: cat.title, url: absoluteUrl(`/help/${cat.slug}`) },
  ]);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }}
      />

      <div className="bg-gradient-to-b from-slate-50 to-white min-h-screen">
        {/* Header */}
        <div className="bg-slate-900 text-white py-8 md:py-12 px-4">
          <div className="container-custom max-w-3xl">
            <nav className="text-xs text-slate-400 mb-3">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="mx-1.5">/</span>
              <Link href="/help" className="hover:text-white">Help Centre</Link>
              <span className="mx-1.5">/</span>
              <span className="text-slate-200">{cat.title}</span>
            </nav>
            <h1 className="text-xl md:text-3xl font-extrabold mb-2">{cat.title}</h1>
            <p className="text-slate-300 text-sm">{cat.description}</p>
          </div>
        </div>

        <div className="container-custom max-w-3xl py-8 md:py-12 px-4">
          {/* Articles */}
          <ul className="space-y-3">
            {cat.articles.map((art) => (
              <li key={art.slug}>
                <Link
                  href={`/help/${cat.slug}/${art.slug}`}
                  className="group block bg-white border border-slate-200 rounded-xl p-4 md:p-5 hover:border-blue-300 hover:shadow-sm transition-all"
                >
                  <h2 className="text-sm md:text-base font-bold text-slate-900 group-hover:text-blue-700 mb-1">
                    {art.title}
                  </h2>
                  <p className="text-xs text-slate-500">{art.summary}</p>
                  <p className="text-[0.65rem] text-slate-400 mt-2">
                    Updated {art.updatedAt}
                  </p>
                </Link>
              </li>
            ))}
          </ul>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <Link href="/help" className="text-xs text-blue-700 hover:underline">
              ← Back to Help Centre
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
