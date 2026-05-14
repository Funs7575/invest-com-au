import { NextRequest, NextResponse } from "next/server";

import { LogGmEventRequest } from "@/lib/api-schemas";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logEvent } from "@/lib/getmatched/events";

export async function POST(request: NextRequest) {
  if (
    !(await isAllowed("gm_events", ipKey(request), { max: 60, refillPerSec: 1 }))
  ) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = LogGmEventRequest.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body." },
      { status: 400 },
    );
  }
  await logEvent({
    sessionId: parsed.data.session_id,
    eventType: parsed.data.event_type,
    step: parsed.data.step ?? null,
    payload: parsed.data.payload,
    sourcePage: parsed.data.source_page,
    userAgent: request.headers.get("user-agent"),
  });
  return NextResponse.json({ success: true });
}
