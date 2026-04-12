import { createClient } from "@/lib/supabase/server";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import Link from "next/link";
import Icon from "@/components/Icon";

export const metadata = {
  title: "Community Forum",
  description:
    "Join thousands of Australian investors discussing share trading, ETFs, crypto, super, property, tax strategy, and broker reviews. Ask questions and share insights.",
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

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 to-slate-800 text-white py-16">
        <div className="container-custom max-w-4xl text-center">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-4">
            Community Forum
          </h1>
          <p className="text-slate-300 text-lg max-w-2xl mx-auto mb-8">
            Join thousands of Australian investors discussing strategies,
            brokers, and opportunities.
          </p>
          <Link
            href="/community/new"
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
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

      {/* Category Grid */}
      <div className="container-custom max-w-4xl pb-16">
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
    </div>
  );
}
