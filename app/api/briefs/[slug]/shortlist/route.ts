/**
 * POST /api/briefs/[slug]/shortlist — add an accepted pro/team to the
 * consumer's brief comparison shortlist (max 5 per brief).
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import {
  ShortlistError,
  addToShortlist,
} from "@/lib/brief-shortlist";
import { logger } from "@/lib/logger";

const log = logger("api:brief-shortlist");

const Body = z.object({
  provider_kind: z.enum(["professional", "team"]),
  provider_id: z.number().int().positive(),
  note: z.string().max(1000).optional(),
});

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  if (
    !(await isAllowed("brief_shortlist_add", ipKey(request), {
      max: 30,
      refillPerSec: 0.5,
    }))
  ) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const { slug } = await ctx.params;
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return NextResponse.json({ error: "Auth required." }, { status: 401 });
  }

  // Verify the caller owns the brief by contact_email match.
  const admin = createAdminClient();
  const { data: brief } = await admin
    .from("advisor_auctions")
    .select("id, contact_email")
    .eq("slug", slug)
    .maybeSingle();
  if (!brief) {
    return NextResponse.json({ error: "Brief not found." }, { status: 404 });
  }
  if (brief.contact_email !== user.email) {
    return NextResponse.json({ error: "Not allowed." }, { status: 403 });
  }

  try {
    const row = await addToShortlist({
      briefId: brief.id as number,
      providerKind: parsed.data.provider_kind,
      providerId: parsed.data.provider_id,
      addedByEmail: user.email,
      addedByUserId: user.id,
      note: parsed.data.note ?? null,
    });
    return NextResponse.json({ ok: true, shortlist: row });
  } catch (err) {
    if (err instanceof ShortlistError) {
      const status =
        err.code === "limit_reached"
          ? 422
          : err.code === "duplicate"
            ? 409
            : 400;
      return NextResponse.json({ error: err.code }, { status });
    }
    log.error("shortlist add threw", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed." }, { status: 500 });
  }
}
