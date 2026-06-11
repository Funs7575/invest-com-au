/**
 * GET /api/social-proof?metric=quiz|compare|calculator
 *
 * Public, read-only aggregate backing SocialProofCounter. Returns the
 * REAL count of the metric's analytics events over the past 30 days,
 * or `{ show: false }` when the count is below the visibility floor
 * (the small number itself is never disclosed) or on any error.
 *
 * The aggregate is computed server-side and cached for 24 h
 * (lib/social-proof.ts); the response is additionally CDN-cached so
 * repeat page views don't reach the handler at all. No PII, no writes,
 * no user input beyond a metric enum validated against an allow-list.
 */

import { NextRequest, NextResponse } from "next/server";
import {
  getSocialProofStat,
  isSocialProofMetric,
  SOCIAL_PROOF_WINDOW_DAYS,
} from "@/lib/social-proof";
import { logger } from "@/lib/logger";

const log = logger("api-social-proof");

export const runtime = "nodejs";

const CACHE_HEADERS = {
  "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
};

export async function GET(req: NextRequest) {
  const metric = req.nextUrl.searchParams.get("metric") ?? "";
  if (!isSocialProofMetric(metric)) {
    return NextResponse.json({ error: "invalid_metric" }, { status: 400 });
  }

  try {
    const stat = await getSocialProofStat(metric);
    if (!stat.show) {
      return NextResponse.json(
        { metric, show: false },
        { headers: CACHE_HEADERS },
      );
    }
    return NextResponse.json(
      {
        metric,
        show: true,
        count: stat.count,
        label: stat.label,
        windowDays: SOCIAL_PROOF_WINDOW_DAYS,
      },
      { headers: CACHE_HEADERS },
    );
  } catch (err) {
    // Fail closed: the counter hides rather than erroring a page.
    log.warn("social-proof stat lookup threw", {
      metric,
      error: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ metric, show: false }, { headers: CACHE_HEADERS });
  }
}
