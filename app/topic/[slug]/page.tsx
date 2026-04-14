import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Article } from "@/lib/types";

export const revalidate = 3600;

const TOPIC_LABELS: Record<string, { title: string; description: string }> = {
  tax: { title: "Tax & Franking", description: "CGT, franking credits, tax-loss harvesting and year-end moves for Australian investors." },
  beginners: { title: "Beginner Investing", description: "Brand-new to investing? Start with the fundamentals — how brokers work, what to buy first, and how to avoid costly mistakes." },
  smsf: { title: "SMSF", description: "Self-managed super: setup, trustee duties, investment strategies and compliance." },
  strategy: { title: "Investing Strategy", description: "DCA, rebalancing, factor tilts and long-term allocation frameworks." },
  news: { title: "Market News", description: "Fee changes, platform updates and regulatory moves that affect Australian investors." },
  reviews: { title: "Platform Reviews", description: "In-depth, independent reviews of Australian brokers, super funds, and robo-advisors." },
  crypto: { title: "Crypto", description: "AUSTRAC-regulated exchanges, taxation, wallets and crypto portfolio strategy." },
  etfs: { title: "ETFs", description: "ASX and international ETFs, MERs, tracking error and portfolio-building guides." },
  "robo-advisors": { title: "Robo-Advisors", description: "Automated investing platforms for Australians who want a hands-off portfolio." },
  "research-tools": { title: "Research Tools", description: "Stock screeners, data terminals and analysis platforms for DIY investors." },
  super: { title: "Superannuation", description: "Industry vs retail funds, contribution strategies and consolidation." },
  property: { title: "Property", description: "Investment property, REITs, fractional ownership and negative gearing." },
  "cfd-forex": { title: "CFD & Forex", description: "Leveraged trading, risk management and ASIC-regulated CFD providers." },
};

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const label = TOPIC_LABELS[slug];
  if (!label) {
    return { title: "Topic not found", robots: "noindex, nofollow" };
  }
  return {
    title: `${label.title} — Invest.com.au`,
    description: label.description,
    alternates: { canonical: `/topic/${slug}` },
  };
}

/**
 * /topic/[slug] — hub page for a single content category.
 *
 * The article corpus is already filterable by category via
 * /articles?category=…, but that URL doesn't index cleanly and
 * doesn't give us per-topic schema / backlink targets. This
 * route surfaces an SEO-friendly URL for each category with a
 * proper <h1>, description, and paginated article list.
 */
export default async function TopicPage({ params }: Props) {
  const { slug } = await params;
  const label = TOPIC_LABELS[slug];
  if (!label) notFound();

  const supabase = await createClient();
  const { data } = await supabase
    .from("articles")
    .select("id, slug, title, excerpt, cover_image_url, category, read_time, published_at")
    .eq("status", "published")
    .eq("category", slug)
    .order("published_at", { ascending: false })
    .limit(60);

  const articles = (data as Article[] | null) || [];

  return (
    <div className="py-6 md:py-12">
      <div className="container-custom">
        <nav className="text-xs md:text-sm text-slate-500 mb-2 md:mb-4">
          <Link href="/" className="hover:text-slate-900">Home</Link>
          <span className="mx-1.5">/</span>
          <Link href="/articles" className="hover:text-slate-900">Articles</Link>
          <span className="mx-1.5">/</span>
          <span className="text-slate-700">{label.title}</span>
        </nav>

        <div className="bg-gradient-to-r from-slate-50 to-white border border-slate-200 rounded-2xl p-5 md:p-8 mb-6">
          <h1 className="text-2xl md:text-4xl font-extrabold text-slate-900 mb-1.5">
            {label.title}
          </h1>
          <p className="text-sm md:text-base text-slate-500 max-w-2xl">
            {label.description}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            {articles.length} article{articles.length === 1 ? "" : "s"}
          </p>
        </div>

        {articles.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
            <p className="text-sm text-slate-600">No articles yet. Check back soon.</p>
            <Link
              href="/articles"
              className="mt-3 inline-block text-xs font-medium text-primary hover:underline"
            >
              Browse all articles →
            </Link>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
