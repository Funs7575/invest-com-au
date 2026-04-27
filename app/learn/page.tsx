import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl } from "@/lib/seo";
import { createClient } from "@/lib/supabase/server";
import Icon from "@/components/Icon";
import NewsletterCta from "./NewsletterCta";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Learn to Invest: Australian Beginner's Guide ${CURRENT_YEAR} | Invest.com.au`,
  description:
    "266 guides for Australian investors. Start here. Beginner pathways for shares, super, property, tax — plus the most-read evergreen articles.",
  alternates: { canonical: `${SITE_URL}/learn` },
  openGraph: {
    title: `Learn to Invest: Australian Beginner's Guide ${CURRENT_YEAR}`,
    description: "266 guides. Start here.",
    url: `${SITE_URL}/learn`,
    type: "website",
  },
};

const PATHWAYS = [
  {
    title: "I'm completely new",
    desc: "Start with the fundamentals — what an ETF is, how to choose a broker, and the first portfolio.",
    href: "/article/how-to-choose-a-broker",
    icon: "sprout",
  },
  {
    title: "I want to understand super & SMSF",
    desc: "How super works, when an SMSF makes sense, and the strategies retail super can't deliver.",
    href: "/smsf",
    icon: "shield",
  },
  {
    title: "I want to invest in property",
    desc: "From suburb research to financing — and the negative-gearing math behind investor decisions.",
    href: "/property",
    icon: "home",
  },
  {
    title: "I want to understand tax on investments",
    desc: "Franking credits, CGT, negative gearing and the wrappers that change after-tax outcomes.",
    href: "/tax",
    icon: "scale",
  },
];

async function fetchBeginnerArticles() {
  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("articles")
      .select("slug, title, excerpt, category")
      .eq("status", "published")
      .eq("category", "beginners")
      .order("published_at", { ascending: false })
      .limit(12);
    return (data as Array<{ slug: string; title: string; excerpt: string | null; category: string | null }> | null) || [];
  } catch {
    return [];
  }
}

const FALLBACK_ARTICLES = [
  { slug: "how-to-choose-a-broker", title: "How to Choose a Broker in Australia", excerpt: "Compare ASX brokers by fees, features and platform quality." },
  { slug: "australian-government-grants-complete-guide", title: "Australian Government Grants: Complete Guide", excerpt: "Federal, state and territory grants explained." },
  { slug: "smsf-setup-cost-australia-2026", title: "SMSF Setup Cost Australia 2026", excerpt: "Real 2026 SMSF setup costs — full breakdown." },
];

export default async function LearnHubPage() {
  const articles = await fetchBeginnerArticles();
  const showArticles = articles.length > 0 ? articles : FALLBACK_ARTICLES.map((a) => ({ ...a, category: "beginners" as string | null }));

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Learn", url: absoluteUrl("/learn") },
  ]);
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <div className="bg-white min-h-screen">
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom">
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Learn</span>
            </nav>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              Learn to Invest: Australian Beginner&rsquo;s Guide
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              266 guides covering shares, ETFs, super, SMSF, property, tax and grants. Start with one of the four pathways below.
            </p>
          </div>
        </section>

        <section className="py-12 bg-white">
          <div className="container-custom max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Four learning pathways</h2>
            <p className="text-sm text-slate-600 mb-6">Pick the one closest to where you are — you can always switch.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PATHWAYS.map((p) => (
                <Link key={p.title} href={p.href} className="group rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 p-5 transition-colors flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center shrink-0"><Icon name={p.icon} size={20} className="text-amber-700" /></div>
                  <div>
                    <h3 className="font-extrabold text-slate-900 group-hover:text-amber-700 mb-1">{p.title}</h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{p.desc}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 bg-slate-50 border-y border-slate-200">
          <div className="container-custom max-w-6xl">
            <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Recent beginner articles</h2>
            <p className="text-sm text-slate-600 mb-6">The 12 most recent guides in our beginners category.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {showArticles.map((a) => (
                <Link key={a.slug} href={`/article/${a.slug}`} className="block bg-white hover:bg-slate-50 border border-slate-200 rounded-xl p-5 transition-colors">
                  <h3 className="text-sm font-extrabold text-slate-900 leading-tight mb-2 line-clamp-3">{a.title}</h3>
                  {a.excerpt && (
                    <p className="text-xs text-slate-600 leading-relaxed line-clamp-3">{a.excerpt}</p>
                  )}
                  <p className="text-xs font-bold text-amber-600 mt-3 inline-flex items-center gap-1">
                    Read article <Icon name="arrow-right" size={12} />
                  </p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 bg-white">
          <div className="container-custom max-w-3xl">
            <NewsletterCta />
          </div>
        </section>
      </div>
    </>
  );
}

