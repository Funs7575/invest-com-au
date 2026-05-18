import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/require-admin";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";

const log = logger("admin:pro-research");

// FIN_NOTEBOOK Revenue #10 — admin upload route for pro_research_reports.
// /pro/research reads published rows; this is where editorial drops new
// reports. Plain HTML body for now (rendered via dangerouslySetInnerHTML
// in the detail page); switch to markdown+sanitizer once we add one.

const ReportSchema = z.object({
  slug: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9-]+$/, "lowercase letters, digits, hyphens only"),
  title: z.string().min(1).max(200),
  kicker: z.string().max(60).default(""),
  summary: z.string().min(1).max(500),
  body_html: z.string().min(1).max(200_000),
  tier: z.enum(["pro", "pro_research", "pro_full"]).default("pro"),
  reading_time_minutes: z.number().int().min(1).max(180).default(10),
  tags: z.array(z.string().max(40)).max(10).default([]),
  publish: z.boolean().default(false),
});

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("pro_research_reports")
    .select("id, slug, title, kicker, summary, tier, published_at, reading_time_minutes, tags, updated_at")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) {
    log.error("list failed", { err: error.message });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ reports: data ?? [] });
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = ReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const row = {
    slug: data.slug,
    title: data.title,
    kicker: data.kicker,
    summary: data.summary,
    body_html: data.body_html,
    tier: data.tier,
    reading_time_minutes: data.reading_time_minutes,
    tags: data.tags,
    published_at: data.publish ? now : null,
    updated_at: now,
  };

  const { data: inserted, error } = await supabase
    .from("pro_research_reports")
    .upsert(row, { onConflict: "slug" })
    .select("id, slug, title, published_at")
    .maybeSingle();

  if (error) {
    log.error("upsert failed", { err: error.message, slug: data.slug });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  log.info("pro-research report saved", {
    by: guard.email,
    slug: data.slug,
    published: !!row.published_at,
  });

  return NextResponse.json({ report: inserted });
}
