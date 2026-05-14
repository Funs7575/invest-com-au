import { NextRequest, NextResponse } from "next/server";

import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { acceptQuote } from "@/lib/expert-teams/fixed-quotes";
import { logger } from "@/lib/logger";

const log = logger("api:quotes:accept");

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  try {
    if (
      !(await isAllowed("quote_accept", ipKey(request), {
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

    const row = await acceptQuote(token);
    if (!row) {
      return NextResponse.json(
        { error: "Quote is no longer acceptable (expired, withdrawn, or already actioned)." },
        { status: 409 },
      );
    }

    log.info("Quote accepted", { quoteId: row.id, briefId: row.brief_id });
    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("accept error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to accept." }, { status: 500 });
  }
}
