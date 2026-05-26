/**
 * GET /api/account/profile-share/[token]
 *
 * Public read endpoint for profile share tokens. Returns the investor's
 * snapshot (goals, quiz, watchlist, health score) for anyone who holds the
 * token — the token is the auth factor.
 *
 * The snapshot page (/shared-profile/[token]) uses this via the lib helper
 * directly; this route is an explicit REST endpoint for integrations.
 *
 * Rate-limit: 60 / min / IP — shareable link, not a hot loop.
 */
import { NextRequest, NextResponse } from "next/server";
import { getProfileShare } from "@/lib/profile-share";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  if (
    !(await isAllowed("profile_share_read", ipKey(request), {
      max: 60,
      refillPerSec: 1,
    }))
  ) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const { token } = await params;
  const result = await getProfileShare(token);
  if (!result) {
    return NextResponse.json(
      { error: "Share link not found, expired, or already revoked." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    snapshot: result.snapshot,
    was_consumed_previously: result.wasConsumedPreviously,
    expires_at: result.expiresAt,
  });
}
