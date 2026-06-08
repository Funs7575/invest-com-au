import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createStaticClient } from "@/lib/supabase/static";
import { absoluteUrl, breadcrumbJsonLd } from "@/lib/seo";
import { faqJsonLd } from "@/lib/schema-markup";
import { PROFESSIONAL_TYPE_LABELS } from "@/lib/types";
import { GENERAL_ADVICE_WARNING } from "@/lib/compliance";
import FollowAdvisorButton from "@/components/FollowAdvisorButton";
import ComplianceFooter from "@/components/ComplianceFooter";

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

export async function generateStaticParams() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    return [];
  }
  const supabase = createStaticClient();
  const { data } = await supabase.from("professionals").select("slug").eq("status", "active");
  return (data ?? []).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: pro } = await supabase
    .from("professionals")
    .select("name, type")
    .eq("slug", slug)
    .eq("status", "active")
    .single();
  if (!pro) return { robots: { index: false } };

  const typeLabel = PROFESSIONAL_TYPE_LABELS[pro.type as keyof typeof PROFESSIONAL_TYPE_LABELS] ?? "Advisor";
  const title = `${pro.name} — Insights & Updates | Invest.com.au`;
  const description = `Read insights, updates and questions from ${pro.name}, a verified Australian ${typeLabel.toLowerCase()}.`;

  return {
    title,
    description,
    alternates: { canonical: `/advisor/${slug}/insights` },
    openGraph: { title, description, url: `/advisor/${slug}/insights`, images: [{ url: `/api/og?title=${encodeURIComponent(pro.name + " — Insights")}&sub=${encodeURIComponent("Verified " + typeLabel + " · Invest.com.au")}`, width: 1200, height: 630 }] },
    twitter: { card: "summary_large_image" },
  };
}

export default async function AdvisorInsightsPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();

  const [proResult, sessionResult] = await Promise.all([
    supabase
      .from("professionals")
      .select("id, name, slug, type, photo_url, verified, follower_count")
      .eq("slug", slug)
      .eq("status", "active")
      .single(),
    supabase.auth.getUser(),
  ]);

  const pro = proResult.data;
  if (!pro) notFound();

  const sessionUser = sessionResult.data.user;

  // Follow state pre-fetch
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

  const { data: postsData } = await supabase
    .from("advisor_posts")
    .select("id, body, post_type, reaction_count, comment_count, created_at")
    .eq("professional_id", pro.id)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(40);

  const posts = (postsData ?? []) as {
    id: number;
    body: string;
    post_type: PostType;
    reaction_count: number;
    comment_count: number;
    created_at: string;
  }[];

  const typeLabel = PROFESSIONAL_TYPE_LABELS[pro.type as keyof typeof PROFESSIONAL_TYPE_LABELS] ?? "Advisor";

  const breadcrumbs = breadcrumbJsonLd([
    { name: "Home", url: absoluteUrl("/") },
    { name: "Find an Advisor", url: absoluteUrl("/advisors") },
    { name: pro.name, url: absoluteUrl(`/advisor/${slug}`) },
    { name: "Insights" },
  ]);

  const initials = pro.name.split(/\s+/).map((p: string) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();

  const insightsFaqs = [
    {
      q: `What are ${pro.name}'s insights on Invest.com.au?`,
      a: `${pro.name} is a verified Australian ${typeLabel.toLowerCase()} who publishes insights, market updates, and educational content on Invest.com.au. These posts cover topics relevant to ${pro.name}'s specialty area. New insights appear as they are published by the advisor — you can follow ${pro.name} to be notified of new posts.`,
    },
    {
      q: `Is ${pro.name} a verified financial ${typeLabel.toLowerCase()}?`,
      a: pro.verified
        ? `Yes. ${pro.name} is a verified ${typeLabel.toLowerCase()} on Invest.com.au — we confirm AFSL or professional membership credentials before granting the verified badge. Verification does not constitute an endorsement of any specific advice. Always check that an advisor is suitable for your personal circumstances before engaging their services.`
        : `${pro.name} is an active ${typeLabel.toLowerCase()} listed on Invest.com.au. To see verified credentials and AFSL details, visit ${pro.name}'s full profile page.`,
    },
    {
      q: `Can I get personalised financial advice from ${pro.name}?`,
      a: `Insights published by ${pro.name} on this platform are general in nature and do not constitute personal financial advice. They are intended for educational purposes only and do not take into account your individual financial situation, needs, or objectives. To get personalised advice from ${pro.name} or a similar specialist, use our matching tool at invest.com.au/find-advisor.`,
    },
    {
      q: `How do I follow ${pro.name} to receive new insights?`,
      a: `Use the Follow button on this page or on ${pro.name}'s profile to subscribe to new posts. You'll need a free Invest.com.au account to follow advisors and receive notifications when new insights are published.`,
    },
  ];
  const insightsFaqLd = faqJsonLd(insightsFaqs);

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbs) }} />
      {insightsFaqLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(insightsFaqLd) }} />}

      <div style={{ background: "var(--color-ink-50)", minHeight: "100vh", paddingTop: 40, paddingBottom: 64 }}>
        <div className="container-custom" style={{ maxWidth: 760 }}>

          {/* Breadcrumb */}
          <nav aria-label="Breadcrumb" style={{ fontSize: 12, color: "var(--color-ink-400)", marginBottom: 24 }}>
            <Link href="/advisors" style={{ color: "var(--color-ink-400)", textDecoration: "none" }}>Advisors</Link>
            <span style={{ margin: "0 6px" }}>/</span>
            <Link href={`/advisor/${slug}`} style={{ color: "var(--color-ink-400)", textDecoration: "none" }}>{pro.name}</Link>
            <span style={{ margin: "0 6px" }}>/</span>
            <span style={{ color: "var(--color-ink-600)" }}>Insights</span>
          </nav>

          {/* Advisor header */}
          <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32, padding: "20px 0", borderBottom: "1px solid #e5e7eb" }}>
            <div style={{ width: 56, height: 56, borderRadius: 99, overflow: "hidden", flexShrink: 0, background: "var(--color-ink-700)", color: "white", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 18, position: "relative" }}>
              {pro.photo_url ? (
                <Image src={pro.photo_url} alt={pro.name} fill sizes="56px" style={{ objectFit: "cover" }} />
              ) : (
                initials
              )}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <Link href={`/advisor/${slug}`} style={{ fontSize: 18, fontWeight: 800, color: "var(--color-ink-900)", textDecoration: "none" }}>{pro.name}</Link>
                {pro.verified && <span style={{ fontSize: 10, fontWeight: 700, background: "#f0fdfa", color: "#0d9488", border: "1px solid #99f6e4", borderRadius: 6, padding: "2px 6px" }}>Verified</span>}
              </div>
              <p style={{ fontSize: 13, color: "var(--color-ink-400)", margin: "2px 0 0" }}>{typeLabel}</p>
            </div>
            <FollowAdvisorButton
              professionalId={pro.id}
              initialFollowing={initialFollowing}
              followerCount={pro.follower_count ?? 0}
            />
          </div>

          {/* Post count */}
          {posts.length > 0 && (
            <p style={{ fontSize: 13, color: "var(--color-ink-400)", marginBottom: 20 }}>
              {posts.length} insight{posts.length !== 1 ? "s" : ""}
            </p>
          )}

          {/* Post list */}
          {posts.length === 0 ? (
            <div className="iv2-card" style={{ padding: "48px 32px", textAlign: "center" }}>
              <p style={{ fontSize: 15, color: "var(--color-ink-500)" }}>No insights posted yet.</p>
              <Link href={`/advisor/${slug}`} style={{ display: "inline-block", marginTop: 16, padding: "10px 22px", borderRadius: 8, background: "var(--color-ink-900)", color: "white", fontSize: 14, fontWeight: 600, textDecoration: "none" }}>
                View full profile
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {posts.map((post) => {
                const cfg = TYPE_COLORS[post.post_type] ?? TYPE_COLORS.update;
                const label = TYPE_LABELS[post.post_type] ?? post.post_type;
                const date = new Date(post.created_at).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
                const preview = post.body.length > 200 ? `${post.body.slice(0, 200)}…` : post.body;

                return (
                  <Link
                    key={post.id}
                    href={`/advisor/${slug}/insights/${post.id}`}
                    style={{ textDecoration: "none" }}
                  >
                    <article className="iv2-card iv2-card-hover" style={{ padding: "16px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 99, background: cfg.bg, color: cfg.color, textTransform: "uppercase" as const, letterSpacing: "0.03em" }}>{label}</span>
                        <span style={{ fontSize: 12, color: "var(--color-ink-400)" }}>{date}</span>
                      </div>
                      <p style={{ fontSize: 14, lineHeight: 1.6, color: "var(--color-ink-700)", margin: 0 }}>{preview}</p>
                      {(post.reaction_count > 0 || post.comment_count > 0) && (
                        <div style={{ display: "flex", gap: 12, marginTop: 10, fontSize: 12, color: "var(--color-ink-400)" }}>
                          {post.reaction_count > 0 && <span>{post.reaction_count} reaction{post.reaction_count !== 1 ? "s" : ""}</span>}
                          {post.comment_count > 0 && <span>{post.comment_count} comment{post.comment_count !== 1 ? "s" : ""}</span>}
                        </div>
                      )}
                    </article>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        <section style={{ marginTop: 48, borderTop: "1px solid #e5e7eb", paddingTop: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--color-ink-900)", marginBottom: 16 }}>Frequently asked questions</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {insightsFaqs.map((faq) => (
              <details key={faq.q} className="group rounded-xl border border-slate-200 bg-slate-50">
                <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 list-none">
                  {faq.q}
                  <span className="shrink-0 text-slate-400 group-open:rotate-180 transition-transform" aria-hidden="true">▾</span>
                </summary>
                <p className="px-5 pb-5 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
              </details>
            ))}
          </div>
        </section>

        <p style={{ fontSize: 11, color: "var(--color-ink-400)", marginTop: 40, lineHeight: 1.6 }}>
          {GENERAL_ADVICE_WARNING}
        </p>
      </div>
      <ComplianceFooter />
    </>
  );
}
