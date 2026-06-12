/**
 * /api/account/household/share — per-item "share with household" toggle (idea #6).
 *
 * POST { kind, item_id, shared } → set/clear the row's household_id. OWNER-ONLY
 * write (enforced by the owner-column filter in `setItemShared` + the unchanged
 * owner-write RLS). Sharing requires an accepted household; un-sharing is always
 * allowed. Flag-gated (fail-closed → 404).
 */

import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { isFlagEnabled } from "@/lib/feature-flags";
import { isRateLimited } from "@/lib/rate-limit";
import { HOUSEHOLDS_FLAG, setItemShared } from "@/lib/households";

export const runtime = "nodejs";

const Body = z.object({
  kind: z.enum(["goal", "balance", "watchlist"]),
  // goals/watchlist ids are bigints (numbers); balances are uuids (strings).
  item_id: z.union([z.coerce.number().int().positive(), z.string().min(1).max(64)]),
  shared: z.boolean(),
});

export const POST = withValidatedBody(Body, async (req, body) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const flagOn = await isFlagEnabled(HOUSEHOLDS_FLAG, {
    userKey: user.email ?? null,
    segment: "user",
  });
  if (!flagOn) return NextResponse.json({ error: "not_found" }, { status: 404 });

  // Throttle share-toggle spam (per-item checkbox flips). Generous ceiling so
  // a user toggling several items in a session is never blocked.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (await isRateLimited(`household-share:${ip}`, 60, 60)) {
    return NextResponse.json(
      { error: "Too many attempts. Please try again later." },
      { status: 429 },
    );
  }

  const result = await setItemShared({
    userId: user.id,
    kind: body.kind,
    itemId: body.item_id,
    shared: body.shared,
  });

  if (!result.ok) {
    const status =
      result.error === "not_in_household"
        ? 409
        : result.error === "not_found"
          ? 404
          : 500;
    return NextResponse.json({ error: result.error }, { status });
  }
  return NextResponse.json({ ok: true, shared: body.shared });
});
