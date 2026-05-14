import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { declineQuote } from "@/lib/expert-teams/fixed-quotes";
import { logger } from "@/lib/logger";

const log = logger("api:quotes:decline");

const Body = z.object({
  reason: z.string().max(500).nullable().optional(),
});

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  try {
    if (
      !(await isAllowed("quote_decline", ipKey(request), {
        max: 5,
        refillPerSec: 0.1,
      }))
    ) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }
    const { token } = await ctx.params;
    if (typeof token !== "string" || token.length < 16 || token.length > 80) {
      return NextResponse.json({ error: "Invalid token." }, { status: 400 });
    }

    let raw: unknown = {};
    try {
      raw = await request.json();
    } catch {
      // body is optional
    }
    const parsed = Body.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid body." },
        { status: 400 },
      );
    }

    const row = await declineQuote(token, parsed.data.reason ?? null);
    if (!row) {
      return NextResponse.json(
        { error: "Quote is no longer declinable (expired, withdrawn, or already actioned)." },
        { status: 409 },
      );
    }

    log.info("Quote declined", { quoteId: row.id, briefId: row.brief_id });
    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("decline error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to decline." }, { status: 500 });
  }
}
