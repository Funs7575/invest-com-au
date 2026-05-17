/**
 * POST /api/presence/ping — client heartbeat for the "online now" indicator.
 *
 * Auth required. Verifies the caller owns the professional / team row before
 * upserting `presence_pings`. Rate-limited to 30/min so a misbehaving client
 * can't burn quota.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { pingPresence } from "@/lib/presence";
import { logger } from "@/lib/logger";

const log = logger("api:presence:ping");

const Body = z.object({
  kind: z.enum(["professional", "team"]),
  id: z.number().int().positive(),
});

export async function POST(request: NextRequest) {
  if (
    !(await isAllowed("presence_ping", ipKey(request), {
      max: 30,
      refillPerSec: 0.5,
    }))
  ) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

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
  if (!user) {
    return NextResponse.json({ error: "Auth required." }, { status: 401 });
  }

  // Verify ownership.
  const admin = createAdminClient();
  if (parsed.data.kind === "professional") {
    const { data: owned } = await admin
      .from("professionals")
      .select("id")
      .eq("id", parsed.data.id)
      .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
      .maybeSingle();
    if (!owned) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
  } else {
    const { data: member } = await admin
      .from("expert_team_members")
      .select("id")
      .eq("team_id", parsed.data.id)
      .eq("status", "active")
      .in(
        "professional_id",
        // Subquery would be nicer but we go cross-table here.
        (await admin
          .from("professionals")
          .select("id")
          .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
        ).data?.map((p) => p.id as number) ?? [],
      )
      .maybeSingle();
    if (!member) {
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
  }

  try {
    await pingPresence({ kind: parsed.data.kind, id: parsed.data.id });
    return NextResponse.json({ ok: true });
  } catch (err) {
    log.warn("ping write failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Write failed." }, { status: 500 });
  }
}
