import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { itemListJsonLd } from "@/lib/schema-markup";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Advisor Insights Feed — Australian Financial Professionals | Invest.com.au",
  description:
    "Updates, insights and questions from Australia's licensed financial advisers. Stay informed on markets, planning strategies and investment ideas.",
  alternates: { canonical: "/feed" },
};

type PostType = "update" | "insight" | "question" | "resource";

interface PostRow {
  id: number;
  body: string;
  post_type: PostType;
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

const POST_TYPE_CONFIG: Record<
  PostType,
  { label: string; bg: string; color: string }
> = {
  insight: {
    label: "Insight",
    bg: "#f0fdfa",
    color: "#0f766e",
  },
  update: {
    label: "Update",
    bg: "#eff6ff",
    color: "#1d4ed8",
  },
  question: {
    label: "Question",
    bg: "#fffbeb",
    color: "#b45309",
  },
  resource: {
    label: "Resource",
    bg: "#faf5ff",
    color: "#7e22ce",
  },
};

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
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
        ? `${p.professional.name} — ${POST_TYPE_CONFIG[p.post_type]?.label ?? p.post_type}`
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
          <div style={{ marginBottom: 32 }}>
            <nav
              style={{
                fontSize: 12,
                color: "var(--color-ink-400)",
                marginBottom: 16,
              }}
            >
              <Link
                href="/"
                style={{
                  color: "var(--color-ink-400)",
                  textDecoration: "none",
                }}
              >
                Home
              </Link>
              <span style={{ margin: "0 6px" }}>/</span>
              <span style={{ color: "var(--color-ink-600)" }}>
                Advisor Feed
              </span>
            </nav>

            <h1
              style={{
                fontSize: "clamp(22px, 4vw, 30px)",
                fontWeight: 800,
                color: "var(--color-ink-900)",
                lineHeight: 1.2,
                marginBottom: 8,
              }}
            >
              Insights from Australia&rsquo;s top financial advisors
            </h1>
            <p
              style={{
                fontSize: 15,
                color: "var(--color-ink-500)",
                lineHeight: 1.5,
              }}
            >
              Updates, insights and questions from Australia&rsquo;s licensed
              financial advisers. Follow professionals you trust.
            </p>
          </div>

          {/* Feed */}
          {posts.length === 0 ? (
            <div
              className="iv2-card"
              style={{
                padding: "48px 32px",
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 36,
                  marginBottom: 16,
                }}
              >
                📭
              </div>
              <p
                style={{
                  fontSize: 16,
                  fontWeight: 600,
                  color: "var(--color-ink-900)",
                  marginBottom: 8,
                }}
              >
                No posts yet — check back soon
              </p>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--color-ink-500)",
                  marginBottom: 24,
                }}
              >
                Our advisors are getting set up. In the meantime, browse
                Australia&rsquo;s top financial professionals.
              </p>
              <Link
                href="/advisors"
                style={{
                  display: "inline-block",
                  padding: "10px 22px",
                  borderRadius: 8,
                  background: "var(--color-ink-900)",
                  color: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Browse advisors
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {posts.map((post) => {
                const pro = post.professional;
                const typeConfig =
                  POST_TYPE_CONFIG[post.post_type] ??
                  POST_TYPE_CONFIG.update;
                const initials = pro?.name ? getInitials(pro.name) : "?";

                return (
                  <article
                    key={post.id}
                    className="iv2-card iv2-card-hover"
                    style={{ padding: 20 }}
                  >
                    {/* Post header: avatar + name + type badge */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 12,
                        marginBottom: 14,
                      }}
                    >
                      {/* Avatar */}
                      <div
                        style={{
                          width: 44,
                          height: 44,
                          borderRadius: 99,
                          overflow: "hidden",
                          flexShrink: 0,
                          background: "var(--color-ink-700)",
                          color: "white",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: 15,
                          position: "relative",
                        }}
                      >
                        {pro?.photo_url ? (
                          <Image
                            src={pro.photo_url}
                            alt={pro.name}
                            fill
                            sizes="44px"
                            style={{ objectFit: "cover" }}
                          />
                        ) : (
                          initials
                        )}
                      </div>

                      {/* Name + date + type badge */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            flexWrap: "wrap",
                          }}
                        >
                          {pro?.slug ? (
                            <Link
                              href={`/advisor/${pro.slug}`}
                              style={{
                                fontSize: 14,
                                fontWeight: 700,
                                color: "var(--color-ink-900)",
                                textDecoration: "none",
                              }}
                            >
                              {pro.name}
                            </Link>
                          ) : (
                            <span
                              style={{
                                fontSize: 14,
                                fontWeight: 700,
                                color: "var(--color-ink-900)",
                              }}
                            >
                              {pro?.name ?? "Advisor"}
                            </span>
                          )}

                          {/* Post type badge */}
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              padding: "2px 8px",
                              borderRadius: 99,
                              background: typeConfig.bg,
                              color: typeConfig.color,
                              textTransform: "uppercase",
                              letterSpacing: "0.03em",
                            }}
                          >
                            {typeConfig.label}
                          </span>
                        </div>

                        <div
                          style={{
                            fontSize: 12,
                            color: "var(--color-ink-400)",
                            marginTop: 2,
                          }}
                        >
                          {formatDate(post.created_at)}
                        </div>
                      </div>
                    </div>

                    {/* Post body */}
                    <p
                      style={{
                        fontSize: 14,
                        lineHeight: 1.65,
                        color: "var(--color-ink-700)",
                        margin: 0,
                        whiteSpace: "pre-line",
                      }}
                    >
                      {post.body}
                    </p>

                    {/* Link card (if present) */}
                    {post.link_url && (
                      <a
                        href={post.link_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "block",
                          marginTop: 12,
                          padding: "10px 14px",
                          border: "1px solid #e5e7eb",
                          borderRadius: 8,
                          background: "var(--color-ink-50)",
                          fontSize: 13,
                          fontWeight: 500,
                          color: "var(--color-blue-700)",
                          textDecoration: "none",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {post.link_title ?? post.link_url}
                      </a>
                    )}

                    {/* Footer: reactions + view profile */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        marginTop: 14,
                        paddingTop: 12,
                        borderTop: "1px solid #f1f3f5",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--color-ink-400)",
                          display: "flex",
                          gap: 14,
                        }}
                      >
                        {post.reaction_count > 0 && (
                          <span>
                            {post.reaction_count}{" "}
                            {post.reaction_count === 1 ? "reaction" : "reactions"}
                          </span>
                        )}
                        {post.comment_count > 0 && (
                          <span>
                            {post.comment_count}{" "}
                            {post.comment_count === 1 ? "comment" : "comments"}
                          </span>
                        )}
                      </div>

                      {pro?.slug && (
                        <Link
                          href={`/advisor/${pro.slug}`}
                          style={{
                            fontSize: 12,
                            fontWeight: 600,
                            color: "var(--color-blue-700)",
                            textDecoration: "none",
                          }}
                        >
                          View profile →
                        </Link>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Footer CTA */}
          {posts.length > 0 && (
            <div style={{ marginTop: 40, textAlign: "center" }}>
              <p
                style={{
                  fontSize: 14,
                  color: "var(--color-ink-500)",
                  marginBottom: 16,
                }}
              >
                Looking for personalised advice?
              </p>
              <Link
                href="/advisors"
                style={{
                  display: "inline-block",
                  padding: "11px 24px",
                  borderRadius: 8,
                  background: "var(--color-ink-900)",
                  color: "white",
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                }}
              >
                Browse all advisors
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
