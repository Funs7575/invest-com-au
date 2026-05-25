import { NextResponse, type NextRequest } from "next/server";
import { getHandoff } from "@/lib/investor-handoff";
import { logger } from "@/lib/logger";

const log = logger("api:account:holdings:handoff:token");

export const runtime = "nodejs";

/**
 * GET /api/account/holdings/handoff/[token]
 *
 * Public read path for a handoff token. No auth required — the token IS
 * the auth factor (random opaque UUID, 14-day TTL, single-consumption).
 *
 * Returns the holdings snapshot if the token is valid, unexpired, and
 * not yet consumed. Stamps `consumed_at` on success so the token can't
 * be replayed.
 *
 * Used by the /find-advisor client page to display the investor's
 * "Shared portfolio" summary card.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
): Promise<Response> {
  const { token } = await params;

  if (!token || token.length > 200) {
    return NextResponse.json({ error: "invalid_token" }, { status: 400 });
  }

  const handoff = await getHandoff(token);

  if (!handoff) {
    log.info("handoff not found or expired", { token: token.slice(0, 8) });
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(
    {
      intent: handoff.intent,
      holdings: handoff.holdings,
      created_at: handoff.created_at,
    },
    {
      status: 200,
      headers: {
        // No caching — token is single-use and consumed on first read.
        "Cache-Control": "private, no-store",
      },
    },
  );
}
