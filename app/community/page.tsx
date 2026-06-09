import { createClient } from "@/lib/supabase/server";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import Link from "next/link";
import Icon from "@/components/Icon";
import { faqJsonLd } from "@/lib/schema-markup";
import NewsletterSignup from "@/components/NewsletterSignup";

// Each category now has ≥3 seeded threads (migration
// 20260802000000_seed_forum_threads.sql) — safe to index.
export const metadata = {
  title: "Community Forum",
  description:
    "Australian investing forum: share trading, ETFs, crypto, super, property, tax strategy, and broker reviews. Ask questions, share insights.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Community Forum",
    description:
      "Australian investing discussion forum. Share trading, ETFs, crypto, super, property & broker reviews.",
    images: [
      {
        url: "/api/og?title=Community+Forum&subtitle=Australian+Investing+Discussion&type=community",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: { card: "summary_large_image" as const },
  alternates: { canonical: "/community" },
};

const COMMUNITY_FAQS = [
  {
    q: "What topics are discussed in the Invest.com.au Community Forum?",
    a: "The Community Forum covers all major investing and personal finance topics relevant to Australian investors: ASX shares and ETFs, international shares, property investment, SMSF strategy, super and retirement planning, tax and accounting (CGT, franking credits, deductions), broker comparisons and reviews, crypto, budgeting, and general market commentary. Threads are organised into categories so you can go directly to the topic most relevant to your situation.",
  },
  {
    q: "Is the Community Forum moderated?",
    a: "Yes. All threads and posts are subject to Invest.com.au's community guidelines. Moderators review flagged posts and remove content that contains personal financial advice presented as fact, spam, product promotions disguised as discussion, or content that is misleading or harmful. The forum is a peer discussion space — posts reflect the opinions of individual members and are not endorsed by Invest.com.au as financial advice. Always consult a licensed adviser before acting on anything you read here.",
  },
  {
    q: "Can I ask a financial adviser a question in the forum?",
    a: "Yes. The 'Ask an Advisor' category is designed for verified financial professionals to respond to community questions with general information. Verified advisers who contribute have confirmed AFSL or professional registrations. Their responses are general information only — not personal financial advice — but you can follow up by booking a consultation directly from their profile. You can also use our adviser finder (/advisors) to get matched to the right professional for your situation.",
  },
  {
    q: "How do I start a new thread or post a reply?",
    a: "Click 'New Thread' at the top of this page to start a discussion. To reply to an existing thread, click into the thread and use the reply box at the bottom. You need a free Invest.com.au account to post — sign up at /signup. Posting is free. Please review our community guidelines before posting to ensure your contribution meets our standards for respectful, factual discussion.",
  },
];

const communityFaqLd = faqJsonLd(COMMUNITY_FAQS);

interface ForumCategory {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  sort_order: number;
  thread_count: number;
  post_count: number;
}

export default async function CommunityPage() {
  const supabase = await createClient();

  const { data: categories } = await supabase
    .from("forum_categories")
    .select(
      "id, slug, name, description, icon, color, sort_order, thread_count, post_count"
    )
    .eq("status", "active")
    .order("sort_order", { ascending: true });

  const cats: ForumCategory[] = categories ?? [];

  const totalThreads = cats.reduce((s, c) => s + (c.thread_count ?? 0), 0);
  const totalPosts = cats.reduce((s, c) => s + (c.post_count ?? 0), 0);

  const breadcrumbLd = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Community Forum" },
  ]);

  return (
    <div>
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      {communityFaqLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(communityFaqLd) }}
        />
      )}

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 text-white py-16">
        <div className="container-custom max-w-4xl text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-4">
            Community Forum
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto mb-8">
            A place for Australian investors to compare notes on strategies,
            brokers, and opportunities. Start a thread or jump into the
            discussion.
          </p>
          <Link
            href="/community/new"
            className="inline-flex items-center gap-2 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
          >
            <Icon name="plus" size={18} />
            New Thread
          </Link>
        </div>
      </section>

      {/* Breadcrumbs */}
      <div className="container-custom max-w-4xl mt-6">
        <nav aria-label="Breadcrumb" className="text-sm text-slate-500 mb-6">
          <ol className="flex items-center gap-1">
            <li>
              <Link href="/" className="hover:text-slate-700">
                Home
              </Link>
            </li>
            <li>
              <Icon name="chevron-right" size={14} className="text-slate-400" />
            </li>
            <li className="text-slate-900 font-medium">Community</li>
          </ol>
        </nav>
      </div>

      {/* Stats Bar */}
      <div className="container-custom max-w-4xl mb-8">
        <div className="flex flex-wrap gap-6 bg-white border border-slate-200 rounded-xl px-6 py-4">
          <div className="flex items-center gap-2">
            <Icon name="message-circle" size={18} className="text-slate-400" />
            <span className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">
                {totalThreads.toLocaleString()}
              </span>{" "}
              threads
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Icon name="users" size={18} className="text-slate-400" />
            <span className="text-sm text-slate-600">
              <span className="font-semibold text-slate-900">
                {totalPosts.toLocaleString()}
              </span>{" "}
              posts
            </span>
          </div>
        </div>
      </div>

      {/* Featured — confessions */}
      <div className="container-custom max-w-4xl mb-6">
        <Link
          href="/community/confessions"
          className="flex items-center justify-between gap-4 bg-slate-800 hover:bg-slate-700 text-white rounded-xl px-5 py-4 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <span className="text-2xl" aria-hidden="true">🤫</span>
            <div>
              <p className="font-bold text-sm">Investment Confessions</p>
              <p className="text-xs text-slate-400">Anonymous investing wins, losses &amp; hard lessons — no judgement</p>
            </div>
          </div>
          <Icon name="chevron-right" size={18} className="text-slate-500 group-hover:text-slate-300 transition-colors shrink-0" />
        </Link>
      </div>

      {/* Category Grid */}
      <div className="container-custom max-w-4xl pb-16">
        {cats.length === 0 && (
          <div className="py-10">
            <div className="text-center mb-8">
              <Icon name="message-circle" size={48} className="text-slate-300 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-900 mb-2">Community launching soon</h2>
              <p className="text-sm text-slate-500 max-w-md mx-auto">
                We&apos;re setting up discussion categories for Australian investors. Here&apos;s a preview of what&apos;s coming.
              </p>
            </div>

            {/* Anticipated category preview cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-10">
              {[
                {
                  icon: "trending-up" as const,
                  color: "#10b981",
                  name: "Shares & ETFs",
                  description: "Stock picks, index funds, DRPs, and portfolio strategy for ASX and international markets.",
                },
                {
                  icon: "home" as const,
                  color: "#3b82f6",
                  name: "Property Investment",
                  description: "Residential and commercial property, REITs, negative gearing, and market outlooks.",
                },
                {
                  icon: "shield" as const,
                  color: "#8b5cf6",
                  name: "SMSF",
                  description: "Self-managed super strategy, compliance, trustee obligations, and investment rules.",
                },
                {
                  icon: "calculator" as const,
                  color: "#f59e0b",
                  name: "Tax & Accounting",
                  description: "CGT, franking credits, deductions, end-of-year planning, and working with accountants.",
                },
                {
                  icon: "user-check" as const,
                  color: "#06b6d4",
                  name: "Ask an Advisor",
                  description: "Pose questions to qualified financial advisers and get perspectives from the community.",
                },
                {
                  icon: "bar-chart-2" as const,
                  color: "#ef4444",
                  name: "Market News",
                  description: "Macro trends, RBA decisions, earnings season, and what&apos;s moving Australian markets.",
                },
              ].map((cat) => (
                <div
                  key={cat.name}
                  className="bg-white border border-slate-200 rounded-xl p-5 opacity-75"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: cat.color + "18" }}
                    >
                      <span style={{ color: cat.color }}>
                        <Icon name={cat.icon} size={18} className="shrink-0" />
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-slate-900 font-bold text-sm">{cat.name}</p>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2">{cat.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* ADV-012: capture intent instead of a dead "check back soon".
                Reuses the shared newsletter capture (attributed to the
                community-launch source). */}
            <div className="text-center">
              <p className="text-sm text-slate-500 mb-1">
                Drop your email and we&apos;ll let you know the moment it goes live.
              </p>
              <div className="max-w-md mx-auto text-left">
                <NewsletterSignup
                  variant="compact"
                  source="community-launch"
                  className="justify-center"
                />
                <p className="text-[0.65rem] text-slate-400 mt-2 text-center">
                  We&apos;ll only email you about the community launch. Unsubscribe any time.
                </p>
              </div>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cats.map((cat) => (
            <Link
              key={cat.id}
              href={`/community/${cat.slug}`}
              className="bg-white border border-slate-200 rounded-xl p-5 hover:border-slate-300 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start gap-4">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: cat.color + "18" }}
                >
                  <span style={{ color: cat.color }}>
                    <Icon name={cat.icon} size={20} className="shrink-0" />
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-slate-900 font-extrabold group-hover:text-emerald-700 transition-colors">
                    {cat.name}
                  </h2>
                  <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                    {cat.description}
                  </p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                    <span>
                      {(cat.thread_count ?? 0).toLocaleString()} threads
                    </span>
                    <span>
                      {(cat.post_count ?? 0).toLocaleString()} posts
                    </span>
                  </div>
                </div>
                <Icon
                  name="chevron-right"
                  size={18}
                  className="text-slate-300 group-hover:text-slate-500 transition-colors shrink-0 mt-1"
                />
              </div>
            </Link>
          ))}
        </div>
      </div>

      <div className="border-t border-slate-200 bg-white">
        <div className="container-custom max-w-4xl py-8 md:py-10">
          <h2 className="text-lg font-extrabold text-slate-900 mb-5">Frequently asked questions</h2>
          <div className="space-y-3">
            {COMMUNITY_FAQS.map((faq) => (
              <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                  {faq.q}
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
                </summary>
                <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
