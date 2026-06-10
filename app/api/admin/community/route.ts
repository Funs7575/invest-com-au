import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_EMAILS } from "@/lib/admin";
import { logger } from "@/lib/logger";
import { isAutoModerationReason } from "@/lib/community/moderation";

const log = logger("admin-community-queue");

interface QueueItem {
  report_id: number;
  target_type: "thread" | "post";
  target_id: number;
  reason: string | null;
  is_auto_hold: boolean;
  reported_at: string;
  // Target content (null when the row has been hard-deleted underneath us)
  title: string | null;
  body_excerpt: string | null;
  author_name: string | null;
  is_removed: boolean | null;
  thread_id: number | null; // for posts: parent thread for linking
  category_slug: string | null;
}

export async function GET(_req: NextRequest) {
  const supabaseAuth = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabaseAuth.auth.getUser();
  if (authError || !user || !ADMIN_EMAILS.includes(user.email?.toLowerCase() ?? "")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  const { data: reports, error } = await admin
    .from("forum_reports")
    .select("id, target_type, target_id, reason, status, created_at")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    log.error("forum_reports fetch failed", { error: error.message });
    return NextResponse.json({ error: "Failed to fetch queue" }, { status: 500 });
  }

  const threadIds = new Set<number>();
  const postIds = new Set<number>();
  for (const r of reports ?? []) {
    if (r.target_type === "thread") threadIds.add(r.target_id);
    else postIds.add(r.target_id);
  }

  const threadMap = new Map<
    number,
    { title: string; body: string; author_name: string; is_removed: boolean; category_id: string }
  >();
  if (threadIds.size > 0) {
    const { data: threads } = await admin
      .from("forum_threads")
      .select("id, title, body, author_name, is_removed, category_id")
      .in("id", Array.from(threadIds));
    for (const t of threads ?? []) threadMap.set(t.id, t);
  }

  const postMap = new Map<
    number,
    { body: string; author_name: string; is_removed: boolean; thread_id: number }
  >();
  if (postIds.size > 0) {
    const { data: posts } = await admin
      .from("forum_posts")
      .select("id, body, author_name, is_removed, thread_id")
      .in("id", Array.from(postIds));
    for (const p of posts ?? []) postMap.set(p.id, p);
  }

  // Resolve category slugs for queue links (threads directly; posts via parent thread)
  const categoryIds = new Set<string>();
  for (const t of threadMap.values()) categoryIds.add(t.category_id);
  const postThreadIds = new Set<number>();
  for (const p of postMap.values()) postThreadIds.add(p.thread_id);
  const postThreadMap = new Map<number, { category_id: string }>();
  if (postThreadIds.size > 0) {
    const { data: parentThreads } = await admin
      .from("forum_threads")
      .select("id, category_id")
      .in("id", Array.from(postThreadIds));
    for (const t of parentThreads ?? []) {
      postThreadMap.set(t.id, t);
      categoryIds.add(t.category_id);
    }
  }
  const categorySlugMap = new Map<string, string>();
  if (categoryIds.size > 0) {
    const { data: cats } = await admin
      .from("forum_categories")
      .select("id, slug")
      .in("id", Array.from(categoryIds));
    for (const c of cats ?? []) categorySlugMap.set(c.id, c.slug);
  }

  const excerpt = (s: string | null | undefined) =>
    s ? (s.length > 280 ? `${s.slice(0, 277)}...` : s) : null;

  const items: QueueItem[] = (reports ?? []).map((r) => {
    if (r.target_type === "thread") {
      const t = threadMap.get(r.target_id);
      return {
        report_id: r.id,
        target_type: "thread",
        target_id: r.target_id,
        reason: r.reason,
        is_auto_hold: isAutoModerationReason(r.reason),
        reported_at: r.created_at,
        title: t?.title ?? null,
        body_excerpt: excerpt(t?.body),
        author_name: t?.author_name ?? null,
        is_removed: t?.is_removed ?? null,
        thread_id: r.target_id,
        category_slug: t ? (categorySlugMap.get(t.category_id) ?? null) : null,
      };
    }
    const p = postMap.get(r.target_id);
    const parent = p ? postThreadMap.get(p.thread_id) : undefined;
    return {
      report_id: r.id,
      target_type: "post",
      target_id: r.target_id,
      reason: r.reason,
      is_auto_hold: isAutoModerationReason(r.reason),
      reported_at: r.created_at,
      title: null,
      body_excerpt: excerpt(p?.body),
      author_name: p?.author_name ?? null,
      is_removed: p?.is_removed ?? null,
      thread_id: p?.thread_id ?? null,
      category_slug: parent ? (categorySlugMap.get(parent.category_id) ?? null) : null,
    };
  });

  return NextResponse.json({ items });
}
