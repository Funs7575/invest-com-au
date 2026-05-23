/**
 * GET /api/careers/jobs
 *
 * Public endpoint — returns paginated active job posts for the /careers browse
 * page. No authentication required. Uses the anon Supabase client (the
 * job_posts_public_read_active RLS policy limits rows to status='active').
 *
 * Query params:
 *   page   — 1-based page number (default 1)
 *   limit  — results per page 1–50 (default 20)
 *   type   — filter by employment type (full_time | part_time | contract | casual)
 *   q      — keyword search over title + description (case-insensitive, ilike)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger("careers:jobs");

const VALID_TYPES = ["full_time", "part_time", "contract", "casual"] as const;
type JobType = (typeof VALID_TYPES)[number];

export async function GET(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    if (await isRateLimited(`careers-jobs-get:${ip}`, 120, 60)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const { searchParams } = req.nextUrl;
    const rawPage = parseInt(searchParams.get("page") ?? "1", 10);
    const rawLimit = parseInt(searchParams.get("limit") ?? "20", 10);
    const typeParam = searchParams.get("type") ?? null;
    const q = searchParams.get("q")?.trim() ?? null;

    const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
    const limit = isNaN(rawLimit) || rawLimit < 1 ? 20 : Math.min(rawLimit, 50);
    const offset = (page - 1) * limit;

    const supabase = await createClient();

    let query = supabase
      .from("job_posts")
      .select(
        `id, title, location, type, description, status, created_at, updated_at,
         advisor_firms ( id, firm_name, logo_url )`,
        { count: "exact" },
      )
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (typeParam && (VALID_TYPES as readonly string[]).includes(typeParam)) {
      query = query.eq("type", typeParam as JobType);
    }

    if (q) {
      query = query.or(
        `title.ilike.%${q}%,description.ilike.%${q}%`,
      );
    }

    const { data, error, count } = await query;

    if (error) {
      log.error("Jobs list error", { error: error.message });
      return NextResponse.json(
        { error: "Failed to load jobs." },
        { status: 500 },
      );
    }

    return NextResponse.json({
      jobs: data ?? [],
      total: count ?? 0,
      page,
      limit,
    });
  } catch (err) {
    log.error("Jobs GET unexpected", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Unexpected error." }, { status: 500 });
  }
}
