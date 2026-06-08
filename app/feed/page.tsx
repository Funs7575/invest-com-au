import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { itemListJsonLd } from "@/lib/schema-markup";
import FeedPageClient from "./FeedPageClient";
import CheckinTrigger from "@/components/streak/CheckinTrigger";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Advisor Insights Feed — Australian Financial Professionals | Invest.com.au",
  description:
    "Updates, insights and questions from Australia's licensed financial advisers. Stay informed on markets, planning strategies and investment ideas.",
  alternates: { canonical: "/feed" },
};

interface PostRow {
  id: number;
  body: string;
  post_type: "update" | "insight" | "question" | "resource";
  link_url: string | null;
  link_title: string | null;
  reaction_count: number;
  comment_count: number;
  created_at: string;
  professional: {
    name: string;
    slug: string;
    photo_url: string | null;
    type: string;
  } | null;
}

export default async function FeedPage() {
  let posts: PostRow[] = [];

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("advisor_posts")
      .select(
        "id, body, post_type, link_url, link_title, reaction_count, comment_count, created_at, professional:professionals(name, slug, photo_url, type)",
      )
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(20);
    posts = (data as unknown as PostRow[]) ?? [];
  } catch {
    // Silent degrade — empty feed renders without 503ing.
  }

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Advisor Insights Feed" },
  ]);

  const feedJsonLd = itemListJsonLd(
    "Advisor Insights Feed",
    posts.map((p, i) => ({
      position: i + 1,
      name: p.professional?.name
        ? `${p.professional.name} — ${p.post_type}`
        : `Post ${p.id}`,
      url: p.professional?.slug
        ? absoluteUrl(`/advisor/${p.professional.slug}`)
        : absoluteUrl("/feed"),
      description: p.body.slice(0, 160),
    })),
  );

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(feedJsonLd) }}
      />

      <div
        style={{
          background: "var(--color-ink-50)",
          minHeight: "100vh",
          paddingTop: 40,
          paddingBottom: 64,
        }}
      >
        <div className="container-custom" style={{ maxWidth: 760 }}>
          {/* Header */}
          <div style={{ marginBottom: 24 }}>
            <nav aria-label="Breadcrumb" style={{ fontSize: 12, color: "var(--color-ink-400)", marginBottom: 16 }}>
              <Link href="/" style={{ color: "var(--color-ink-400)", textDecoration: "none" }}>Home</Link>
              <span style={{ margin: "0 6px" }}>/</span>
              <span style={{ color: "var(--color-ink-600)" }}>Advisor Feed</span>
            </nav>

            <h1 style={{ fontSize: "clamp(22px, 4vw, 30px)", fontWeight: 800, color: "var(--color-ink-900)", lineHeight: 1.2, marginBottom: 8 }}>
              Insights from Australia&rsquo;s top financial advisors
            </h1>
            <p style={{ fontSize: 15, color: "var(--color-ink-500)", lineHeight: 1.5, marginBottom: 0 }}>
              Updates, insights and questions from Australia&rsquo;s licensed financial advisers. Follow professionals you trust.
            </p>
          </div>

          {/* Tabbed feed (All / Following) */}
          <FeedPageClient initialPosts={posts} />
          <CheckinTrigger source="feed_view" />

          {/* Footer CTA */}
          {posts.length > 0 && (
            <div style={{ marginTop: 40, textAlign: "center" }}>
              <p style={{ fontSize: 14, color: "var(--color-ink-500)", marginBottom: 16 }}>Looking for personalised advice?</p>
              <Link href="/advisors" style={{ display: "inline-block", padding: "11px 24px", borderRadius: 8, background: "var(--color-ink-900)", color: "white", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
                Browse all advisors
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
