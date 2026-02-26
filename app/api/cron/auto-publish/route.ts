import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
export const maxDuration = 30;

/**
 * GET /api/cron/auto-publish
 * Runs daily. Publishes articles whose content_calendar target_publish_date
 * has arrived and whose status is 'scheduled'.
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const today = new Date().toISOString().split("T")[0];

  // Find calendar items that are scheduled and due
  const { data: dueItems, error } = await supabase
    .from("content_calendar")
    .select("id, article_id, title")
    .eq("status", "scheduled")
    .lte("target_publish_date", today)
    .not("article_id", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const published: { calendarId: number; articleId: number; title: string }[] = [];

  for (const item of dueItems || []) {
    // Publish the article
    const { error: articleErr } = await supabase
      .from("articles")
      .update({
        status: "published",
        published_at: new Date().toISOString(),
        publish_date: new Date().toISOString(),
      })
      .eq("id", item.article_id);

    if (articleErr) continue;

    // Update the calendar item
    await supabase
      .from("content_calendar")
      .update({
        status: "published",
        actual_publish_date: today,
      })
      .eq("id", item.id);

    published.push({
      calendarId: item.id,
      articleId: item.article_id,
      title: item.title,
    });
  }

  return NextResponse.json({
    checked: (dueItems || []).length,
    published: published.length,
    articles: published,
  });
}
