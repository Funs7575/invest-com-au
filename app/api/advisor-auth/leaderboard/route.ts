import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger("advisor-auth:leaderboard");

function currentYearMonth(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export async function GET(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    if (await isRateLimited(`advisor_leaderboard_get:${ip}`, 60, 60)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const professionalId = await requireAdvisorSession(request);
    if (!professionalId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const ym = currentYearMonth();
    const admin = createAdminClient();

    const [myRow, countRow] = await Promise.all([
      admin
        .from("advisor_leaderboard_monthly")
        .select("rank, score")
        .eq("professional_id", professionalId)
        .eq("year_month", ym)
        .maybeSingle(),
      admin
        .from("advisor_leaderboard_monthly")
        .select("*", { count: "exact", head: true })
        .eq("year_month", ym),
    ]);

    if (!myRow.data) {
      return NextResponse.json({ rank: null });
    }

    const total = countRow.count ?? 0;
    const percentile = total > 0 ? Math.round(((total - myRow.data.rank) / total) * 100) : null;

    return NextResponse.json({
      rank: myRow.data.rank,
      score: myRow.data.score,
      total,
      percentile,
    });
  } catch (err) {
    log.error("leaderboard rank fetch error", {
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to fetch rank" }, { status: 500 });
  }
}
