import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

type PostType = "update" | "insight" | "question" | "resource";

const TYPE_COLORS: Record<PostType, { bg: string; color: string }> = {
  insight:  { bg: "#f0fdfa", color: "#0f766e" },
  update:   { bg: "#eff6ff", color: "#1d4ed8" },
  question: { bg: "#fffbeb", color: "#b45309" },
  resource: { bg: "#faf5ff", color: "#7e22ce" },
};

const TYPE_LABELS: Record<PostType, string> = {
  insight: "Insight", update: "Update", question: "Question", resource: "Resource",
};

interface Props {
  slug: string;
  advisorId: number;
  advisorName: string;
}

/** Renders the 3 most recent published posts as a teaser strip on the advisor profile page. */
export default async function RecentAdvisorInsights({ slug, advisorId, advisorName }: Props) {
  let posts: { id: number; body: string; post_type: PostType; reaction_count: number; created_at: string }[] = [];

  try {
    const supabase = await createClient();
    const { data } = await supabase
      .from("advisor_posts")
      .select("id, body, post_type, reaction_count, created_at")
      .eq("professional_id", advisorId)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(3);
    posts = (data ?? []) as typeof posts;
  } catch {
    // Secondary query — fail silently
  }

  if (posts.length === 0) return null;

  return (
    <div className="container-custom max-w-4xl mt-6">
      <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 16, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderBottom: "1px solid #f1f5f9" }}>
          <div>
            <span style={{ fontSize: 10, fontWeight: 700, color: "var(--color-ink-400)", textTransform: "uppercase" as const, letterSpacing: "0.06em" }}>Recent insights</span>
            <h2 style={{ fontSize: 14, fontWeight: 700, color: "var(--color-ink-900)", margin: "2px 0 0" }}>
              Updates from {advisorName}
            </h2>
          </div>
          <Link
            href={`/advisor/${slug}/insights`}
            style={{ fontSize: 12, fontWeight: 600, color: "var(--color-blue-700)", textDecoration: "none" }}
          >
            View all →
          </Link>
        </div>

        {/* Post teasers */}
        {posts.map((post, i) => {
          const postType = (post.post_type ?? "update") as PostType;
          const cfg = TYPE_COLORS[postType] ?? TYPE_COLORS.update;
          const label = TYPE_LABELS[postType] ?? postType;
          const preview = post.body.length > 160 ? `${post.body.slice(0, 160)}…` : post.body;
          const date = new Date(post.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short" });

          return (
            <Link
              key={post.id}
              href={`/advisor/${slug}/insights/${post.id}`}
              style={{ textDecoration: "none" }}
            >
              <div
                style={{
                  padding: "14px 24px",
                  borderBottom: i < posts.length - 1 ? "1px solid #f1f5f9" : "none",
                  display: "flex",
                  gap: 14,
                  alignItems: "flex-start",
                  cursor: "pointer",
                }}
                className="group"
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5 }}>
                    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 7px", borderRadius: 99, background: cfg.bg, color: cfg.color, textTransform: "uppercase" as const, letterSpacing: "0.03em" }}>{label}</span>
                    <span style={{ fontSize: 11, color: "var(--color-ink-400)" }}>{date}</span>
                    {post.reaction_count > 0 && (
                      <span style={{ fontSize: 11, color: "var(--color-ink-400)" }}>· {post.reaction_count} reactions</span>
                    )}
                  </div>
                  <p style={{ fontSize: 13, lineHeight: 1.55, color: "var(--color-ink-700)", margin: 0 }}>{preview}</p>
                </div>
                <span style={{ fontSize: 16, color: "var(--color-ink-300)", flexShrink: 0, alignSelf: "center" }} aria-hidden>›</span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
