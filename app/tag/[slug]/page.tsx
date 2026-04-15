import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Article } from "@/lib/types";

export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

/** Slug → display — lowercase the slug, turn dashes into spaces, title-case */
function prettifyTag(slug: string): string {
  return slug
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const tag = prettifyTag(slug);
  return {
    title: `${tag} — Articles & Guides`,
    description: `Every Invest.com.au article tagged ${tag}. Independent Australian investing research.`,
    alternates: { canonical: `/tag/${slug}` },
  };
}

/**
 * /tag/[slug] — hub page for a tag.
 *
 * Articles have a `tags` string[] column; this route lists every
 * article that contains the tag. Returns 404 if no articles match
 * so we don't index empty pages.
 */
export default async function TagPage({ params }: Props) {
  const { slug } = await params;
  const tagValue = slug.toLowerCase();

  const supabase = await createClient();
  const { data } = await supabase
    .from("articles")
    .select("id, slug, title, excerpt, cover_image_url, category, read_time, published_at, tags")
    .eq("status", "published")
    .contains("tags", [tagValue])
    .order("published_at", { ascending: false })
    .limit(60);

  const articles = (data as Article[] | null) || [];
  if (articles.length === 0) notFound();

  const tagDisplay = prettifyTag(slug);

  return (
    <div className="py-6 md:py-12">
      <div className="container-custom">
        <nav className="text-xs md:text-sm text-slate-500 mb-2 md:mb-4">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span className="mx-1.5">/</span>
          <Link href="/articles" className="hover:text-slate-900">Articles</Link>
          <span className="mx-1.5">/</span>
          <span className="text-slate-700">Tag: {tagDisplay}</span>
        </nav>

        <div className="mb-6">
          <span className="text-[0.65rem] font-extrabold uppercase tracking-wider text-amber-500">
            Tag
          </span>
          <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-1.5">
            {tagDisplay}
          </h1>
          <p className="text-xs md:text-sm text-slate-500">
            {articles.length} article{articles.length === 1 ? "" : "s"} tagged “{tagDisplay}”
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6">
          {articles.map((a) => (
            <Link
              key={a.id}
              href={`/article/${a.slug}`}
              className="border border-slate-200 rounded-xl bg-white hover:shadow-lg hover:scale-[1.01] transition-all flex flex-col overflow-hidden group"
            >
              {a.cover_image_url && (
                <div className="aspect-[16/9] overflow-hidden bg-slate-100 relative">
                  <Image
                    src={a.cover_image_url}
                    alt={a.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                </div>
              )}
              <div className="p-3 md:p-5 flex flex-col flex-1">
                <h2 className="text-sm md:text-base font-bold text-slate-900 leading-snug line-clamp-2 mb-1.5">
                  {a.title}
                </h2>
                {a.excerpt && (
                  <p className="hidden md:block text-xs text-slate-600 line-clamp-2 mb-3">
                    {a.excerpt}
                  </p>
                )}
                <span className="mt-auto text-xs font-semibold text-primary group-hover:underline">
                  Read →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
