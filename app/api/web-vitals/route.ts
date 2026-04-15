import { NextRequest, NextResponse } from "next/server";
import {
  captureSample,
  classifyDevice,
  isValidMetric,
} from "@/lib/web-vitals";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";

export const runtime = "nodejs";

/**
 * POST /api/web-vitals
 *
 * Anonymous web vitals beacon. The client sends one of these
 * per metric per navigation (LCP fires once, INP fires on the
 * worst interaction, CLS fires on pagehide, etc.).
 *
 * Body: { metric, value, page_path, session_id?, user_agent? }
 *
 * We rate limit aggressively (200/min per IP) because modern
 * browsers may fire duplicate beacons on page-transitions, and
 * a legitimate user might hit it 10-30 times per session.
 */
export async function POST(request: NextRequest) {
  if (
    !(await isAllowed("web_vitals", ipKey(request), {
      max: 200,
      refillPerSec: 200 / 60,
    }))
  ) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const metric = body.metric;
  const value = typeof body.value === "number" ? body.value : null;
  const pagePath =
    typeof body.page_path === "string" ? body.page_path : null;
  const userAgent =
    typeof body.user_agent === "string"
      ? body.user_agent
      : request.headers.get("user-agent");
  const sessionId =
    typeof body.session_id === "string" ? body.session_id : null;

  if (!isValidMetric(metric) || value == null || !pagePath) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const result = await captureSample({
    metric,
    value,
    pagePath,
    deviceKind: classifyDevice(userAgent),
    sessionId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
