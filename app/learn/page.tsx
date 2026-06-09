import Link from "next/link";
import type { Metadata } from "next";
import { breadcrumbJsonLd, SITE_URL, CURRENT_YEAR, absoluteUrl } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { createClient } from "@/lib/supabase/server";
import Icon from "@/components/Icon";
import NewsletterCta from "./NewsletterCta";
import { LEARNING_PATHS, sumEstimatedMinutes } from "@/lib/learning-paths";
import { Suspense } from "react";
import NextActions from "@/components/NextActions";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: `Learning Paths & Guides: Learn to Invest in Australia ${CURRENT_YEAR} | Invest.com.au`,
  description:
    "Structured learning paths for Australians — new investor starter kit, broker selection, retirement & super, tax-smart investing and foreign investor guide.",
  alternates: { canonical: `${SITE_URL}/learn` },
  openGraph: {
    title: `Learning Paths: Learn to Invest in Australia ${CURRENT_YEAR}`,
    description: "Structured paths with progress tracking. New investor, broker choice, super & retirement, tax, and foreign investor.",
    url: `${SITE_URL}/learn`,
    type: "website",
    images: [{ url: `/api/og?title=${encodeURIComponent("Learning Paths — Invest.com.au")}&sub=${encodeURIComponent("New Investor · Super · Tax · ETFs · " + CURRENT_YEAR)}`, width: 1200, height: 630 }],
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

// ─── Path card accent colours (Tailwind complete strings for purge safety) ────
const PATH_ACCENTS: Record<string, { border: string; text: string; bg: string; badge: string }> = {
  teal:   { border: "border-teal-200",   text: "text-teal-700",   bg: "bg-teal-50",   badge: "bg-teal-100 text-teal-700" },
  blue:   { border: "border-blue-200",   text: "text-blue-700",   bg: "bg-blue-50",   badge: "bg-blue-100 text-blue-700" },
  amber:  { border: "border-amber-200",  text: "text-amber-700",  bg: "bg-amber-50",  badge: "bg-amber-100 text-amber-700" },
  purple: { border: "border-purple-200", text: "text-purple-700", bg: "bg-purple-50", badge: "bg-purple-100 text-purple-700" },
  rose:   { border: "border-rose-200",   text: "text-rose-700",   bg: "bg-rose-50",   badge: "bg-rose-100 text-rose-700" },
};

const LEARN_FAQS = [
  {
    q: "Are the investing learning paths on Invest.com.au free?",
    a: "Yes. All learning paths on Invest.com.au are completely free — no account required to browse or complete steps. Progress tracking (tick-off as you complete each step) is saved to your browser's localStorage, so you can return to where you left off without signing in. Creating an account allows progress to sync across devices.",
  },
  {
    q: "Which learning path should I start with?",
    a: "If you have never invested before, start with the New Investor Starter Kit — it covers compound interest, diversification, ETFs, and how to choose and open a brokerage account. If you already invest but want a better platform, try Choosing the Right Broker. If you are a working Australian thinking about retirement, Retirement & Super covers superannuation, salary sacrifice, and SMSF. Tax-Smart Investing suits investors who want to legally minimise their tax through franking credits, CGT discount, and negative gearing. Foreign Investor covers FIRB rules, withholding tax, and ASX access for non-residents.",
  },
  {
    q: "How long does each learning path take?",
    a: "Each path is broken into steps with estimated reading or calculator times. The New Investor Starter Kit takes approximately 2–3 hours to complete; Choosing the Right Broker runs 1–2 hours; Retirement & Super and Tax-Smart Investing each run 2–3 hours; the Foreign Investor path runs approximately 1.5–2 hours. You can complete steps at your own pace — there's no deadline and progress is saved.",
  },
  {
    q: "Is the content on these learning paths financial advice?",
    a: "No. All content on Invest.com.au learning paths is general investing education and does not constitute personal financial advice. It does not take into account your individual financial situation, objectives, or risk tolerance. Before making any investment decision, consider whether the information is appropriate for your circumstances. Where relevant, seek advice from an AFSL-licensed financial adviser — you can find one at invest.com.au/find-advisor.",
  },
];

const learnHubFaqLd = faqJsonLd(LEARN_FAQS);

export default async function LearnHubPage() {
  const articles = await fetchBeginnerArticles();
  const showArticles = articles.length > 0 ? articles : FALLBACK_ARTICLES.map((a) => ({ ...a, category: "beginners" as string | null }));

  const breadcrumb = breadcrumbJsonLd([
    { name: "Home", url: `${SITE_URL}/` },
    { name: "Learn", url: absoluteUrl("/learn") },
  ]);

  // ItemList JSON-LD for the learning paths hub
  const hubItemListLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Investing Learning Paths",
    description: "Structured learning paths for Australian investors.",
    numberOfItems: LEARNING_PATHS.length,
    itemListElement: LEARNING_PATHS.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "Course",
        name: p.title,
        description: p.description,
        url: absoluteUrl(`/learn/${p.slug}`),
      },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(hubItemListLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(learnHubFaqLd) }} />
      <div className="bg-white min-h-screen">
        <section className="bg-slate-900 text-white py-10 md:py-14">
          <div className="container-custom">
            <nav className="flex items-center gap-1.5 text-xs text-slate-400 mb-5" aria-label="Breadcrumb">
              <Link href="/" className="hover:text-white">Home</Link>
              <span className="text-slate-600">/</span>
              <span className="text-white font-medium">Learn</span>
            </nav>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold leading-tight mb-3 max-w-3xl">
              Learning Paths for Australian Investors
            </h1>
            <p className="text-base md:text-lg text-slate-300 leading-relaxed max-w-3xl">
              Structured paths through our guides, calculators, and Q&amp;A — from first investment to tax-smart retirement. Tick off steps as you go; progress saves automatically.
            </p>
          </div>
        </section>

        {/* ── Learning Paths grid ── */}
        <section className="py-12 bg-white" aria-labelledby="paths-heading">
          <div className="container-custom max-w-6xl">
            <h2 id="paths-heading" className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">
              Choose a learning path
            </h2>
            <p className="text-sm text-slate-600 mb-8">
              Pick the path closest to where you are now. Progress is saved per path so you can pause and come back.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {LEARNING_PATHS.map((path) => {
                const accent = PATH_ACCENTS[path.colorClass] ?? PATH_ACCENTS["teal"]!;
                const totalMins = sumEstimatedMinutes(path);
                const hoursDisplay = totalMins < 60 ? `${totalMins} min` : `${(totalMins / 60).toFixed(1)} hrs`;
                return (
                  <Link
                    key={path.slug}
                    href={`/learn/${path.slug}`}
                    className={`group flex flex-col rounded-2xl border bg-white p-5 transition-all duration-150 hover:shadow-md hover:${accent.border} ${accent.border}`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <h3 className={`font-extrabold text-slate-900 leading-snug group-hover:${accent.text} transition-colors text-base`}>
                        {path.title}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 leading-relaxed mb-4 flex-1">
                      {path.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-auto pt-3 border-t border-slate-100">
                      <span className={`text-[0.65rem] px-2 py-0.5 rounded-full font-semibold ${accent.badge}`}>
                        {path.audience}
                      </span>
                      <span className="text-[0.65rem] text-slate-400">
                        {path.steps.length} steps · ~{hoursDisplay}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── Quick-start pathways (kept from original) ── */}
        <section className="py-12 bg-slate-50 border-y border-slate-200" aria-labelledby="pathways-heading">
          <div className="container-custom max-w-5xl">
            <h2 id="pathways-heading" className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Quick-start pathways</h2>
            <p className="text-sm text-slate-600 mb-6">Jump to a topic area directly — no sign-in required.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {PATHWAYS.map((p) => (
                <Link key={p.title} href={p.href} className="group rounded-xl border border-slate-200 bg-white hover:bg-slate-50 p-5 transition-colors flex items-start gap-4">
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

        <section className="py-12 bg-white" aria-labelledby="articles-heading">
          <div className="container-custom max-w-6xl">
            <h2 id="articles-heading" className="text-2xl md:text-3xl font-extrabold text-slate-900 mb-2">Recent beginner articles</h2>
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

        <section className="py-12 bg-white border-t border-slate-200">
          <div className="container-custom max-w-4xl">
            <h2 className="text-xl font-bold text-slate-900 mb-4">About these learning paths</h2>
            <div className="divide-y divide-slate-100">
              {LEARN_FAQS.map(({ q, a }) => (
                <details key={q} className="group py-3">
                  <summary className="flex items-center justify-between cursor-pointer list-none text-slate-800 font-medium text-sm leading-snug gap-4">
                    {q}
                    <svg
                      className="w-4 h-4 shrink-0 text-slate-400 group-open:rotate-180 transition-transform"
                      aria-hidden="true"
                      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </summary>
                  <p className="mt-2 text-sm text-slate-600 leading-relaxed">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 bg-slate-50 border-t border-slate-200">
          <div className="container-custom max-w-3xl">
            <NewsletterCta />
          </div>
        </section>

        {/* Personalised next-action strip — learn surface suppresses duplicate learn hub CTA */}
        <Suspense fallback={null}>
          <NextActions surface="learn" />
        </Suspense>
      </div>
    </>
  );
}

