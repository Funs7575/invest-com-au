import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { blogPostingJsonLd } from "@/lib/schema-markup";
import { PROFESSIONAL_TYPE_LABELS } from "@/lib/types";
import FollowAdvisorButton from "@/components/FollowAdvisorButton";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";

export const revalidate = 1800;

type PostType = "update" | "insight" | "question" | "resource";

const TYPE_LABELS: Record<PostType, string> = {
  insight: "Insight",
  update: "Update",
  question: "Question",
  resource: "Resource",
};

const TYPE_COLORS: Record<PostType, { bg: string; color: string }> = {
  insight:  { bg: "#f0fdfa", color: "#0f766e" },
  update:   { bg: "#eff6ff", color: "#1d4ed8" },
  question: { bg: "#fffbeb", color: "#b45309" },
  resource: { bg: "#faf5ff", color: "#7e22ce" },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string; id: string }> }): Promise<Metadata> {
  const { slug, id } = await params;
  const postId = parseInt(id, 10);
  if (!Number.isFinite(postId)) return { robots: { index: false } };

  const supabase = await createClient();

  const { data: post } = await supabase
    .from("advisor_posts")
    .select("body, post_type, created_at, professional:professionals!inner(name, slug)")
    .eq("id", postId)
    .eq("status", "published")
    .eq("professionals.slug", slug)
    .maybeSingle();

  if (!post) return { robots: { index: false } };

  const pro = post.professional as unknown as { name: string; slug: string } | null;
  const title = pro?.name
    ? `${pro.name} — ${TYPE_LABELS[post.post_type as PostType] ?? "Insight"} | Invest.com.au`
    : "Advisor Insight | Invest.com.au";
  const description = post.body.slice(0, 160);

  return {
    title,
    description,
    alternates: { canonical: `/advisor/${slug}/insights/${postId}` },
    openGraph: {
      title,
      description,
      url: `/advisor/${slug}/insights/${postId}`,
      type: "article",
      publishedTime: post.created_at,
    },
  };
}

export default async function AdvisorInsightPage({ params }: { params: Promise<{ slug: string; id: string }> }) {
  const { slug, id } = await params;
  const postId = parseInt(id, 10);
  if (!Number.isFinite(postId)) notFound();

  const supabase = await createClient();

  // Fetch the post, verifying it belongs to the advisor identified by slug
  const { data: post } = await supabase
    .from("advisor_posts")
    .select("id, body, post_type, link_url, link_title, reaction_count, comment_count, created_at, professional:professionals!inner(id, name, slug, photo_url, type, verified, follower_count)")
    .eq("id", postId)
    .eq("status", "published")
    .eq("professionals.slug", slug)
    .maybeSingle();

  if (!post) notFound();

  const pro = post.professional as unknown as {
    id: number;
    name: string;
    slug: string;
    photo_url: string | null;
    type: string;
    verified: boolean;
    follower_count: number | null;
  };

  const sessionResult = await supabase.auth.getUser();
  const sessionUser = sessionResult.data.user;

  let initialFollowing = false;
  if (sessionUser) {
    const { data: followRow } = await supabase
      .from("advisor_follows")
      .select("id")
      .eq("follower_user_id", sessionUser.id)
      .eq("following_professional_id", pro.id)
      .maybeSingle();
    initialFollowing = !!followRow;
  }

  const typeLabel = PROFESSIONAL_TYPE_LABELS[pro.type as keyof typeof PROFESSIONAL_TYPE_LABELS] ?? "Advisor";
  const postType = (post.post_type ?? "update") as PostType;
  const cfg = TYPE_COLORS[postType] ?? TYPE_COLORS.update;
  const label = TYPE_LABELS[postType] ?? postType;
  const formattedDate = new Date(post.created_at).toLocaleDateString("en-AU", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const initials = pro.name.split(/\s+/).map((p: string) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Find an Advisor", url: absoluteUrl("/advisors") },
    { name: pro.name, url: absoluteUrl(`/advisor/${slug}`) },
    { name: "Insights", url: absoluteUrl(`/advisor/${slug}/insights`) },
    { name: label },
  ]);

  const postSchema = blogPostingJsonLd({
    postId: post.id,
    advisorSlug: slug,
    body: post.body,
    postType: postType,
    publishedAt: post.created_at,
    authorName: pro.name,
    authorSlug: pro.slug,
    authorPhotoUrl: pro.photo_url,
  });

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(postSchema) }} />

      <div style={{ background: "var(--color-ink-50)", minHeight: "100vh", paddingTop: 40, paddingBottom: 64 }}>
        <div className="container-custom" style={{ maxWidth: 760 }}>

          {/* Breadcrumb */}
          <nav style={{ fontSize: 12, color: "var(--color-ink-400)", marginBottom: 28 }}>
            <Link href="/advisors" style={{ color: "var(--color-ink-400)", textDecoration: "none" }}>Advisors</Link>
            <span style={{ margin: "0 6px" }}>/</span>
            <Link href={`/advisor/${slug}`} style={{ color: "var(--color-ink-400)", textDecoration: "none" }}>{pro.name}</Link>
            <span style={{ margin: "0 6px" }}>/</span>
            <Link href={`/advisor/${slug}/insights`} style={{ color: "var(--color-ink-400)", textDecoration: "none" }}>Insights</Link>
            <span style={{ margin: "0 6px" }}>/</span>
            <span style={{ color: "var(--color-ink-600)" }}>{label}</span>
          </nav>

          {/* Post card */}
          <article className="iv2-card" style={{ padding: 28, marginBottom: 24 }}>
            {/* Author header */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 20 }}>
              <div style={{ width: 48, height: 48, borderRadius: 99, overflow: "hidden", flexShrink: 0, background: "var(--color-ink-700)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, position: "relative" }}>
                {pro.photo_url ? (
                  <Image src={pro.photo_url} alt={pro.name} fill sizes="48px" style={{ objectFit: "cover" }} />
                ) : (
                  initials
                )}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 2 }}>
                  <Link href={`/advisor/${slug}`} style={{ fontSize: 15, fontWeight: 700, color: "var(--color-ink-900)", textDecoration: "none" }}>{pro.name}</Link>
                  {pro.verified && <span style={{ fontSize: 10, fontWeight: 700, background: "#f0fdfa", color: "#0d9488", border: "1px solid #99f6e4", borderRadius: 6, padding: "2px 6px" }}>Verified</span>}
                  <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: cfg.bg, color: cfg.color, textTransform: "uppercase" as const, letterSpacing: "0.03em" }}>{label}</span>
                </div>
                <p style={{ fontSize: 12, color: "var(--color-ink-400)", margin: 0 }}>{typeLabel} · {formattedDate}</p>
              </div>
              <FollowAdvisorButton
                professionalId={pro.id}
                initialFollowing={initialFollowing}
                followerCount={pro.follower_count ?? 0}
              />
            </div>

            {/* Post body */}
            <div style={{ fontSize: 15, lineHeight: 1.7, color: "var(--color-ink-800)", whiteSpace: "pre-line", marginBottom: post.link_url ? 16 : 0 }}>
              {post.body}
            </div>

            {/* Link card */}
            {post.link_url && (
              <a
                href={post.link_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "block", marginTop: 16, padding: "12px 16px", border: "1px solid #e5e7eb", borderRadius: 8, background: "var(--color-ink-50)", fontSize: 13, fontWeight: 500, color: "var(--color-blue-700)", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
              >
                ↗ {post.link_title ?? post.link_url}
              </a>
            )}

            {/* Engagement footer */}
            {(post.reaction_count > 0 || post.comment_count > 0) && (
              <div style={{ display: "flex", gap: 16, marginTop: 20, paddingTop: 16, borderTop: "1px solid #f1f3f5", fontSize: 13, color: "var(--color-ink-400)" }}>
                {post.reaction_count > 0 && <span>{post.reaction_count} reaction{post.reaction_count !== 1 ? "s" : ""}</span>}
                {post.comment_count > 0 && <span>{post.comment_count} comment{post.comment_count !== 1 ? "s" : ""}</span>}
              </div>
            )}
          </article>

          {/* Compliance footnote */}
          <p style={{ fontSize: 11, color: "var(--color-ink-400)", lineHeight: 1.5, marginBottom: 24 }}>
            {GENERAL_ADVICE_WARNING}
          </p>

          {/* Back links */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href={`/advisor/${slug}/insights`} style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink-600)", textDecoration: "none" }}>
              ← All insights from {pro.name}
            </Link>
            <Link href={`/advisor/${slug}`} style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink-600)", textDecoration: "none" }}>
              View full profile
            </Link>
            <Link href="/advisors" style={{ fontSize: 13, fontWeight: 600, color: "var(--color-ink-600)", textDecoration: "none" }}>
              Browse all advisors
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
