/**
 * POST /api/admin/impersonate — start an impersonation session.
 * POST /api/admin/impersonate/end — end the current session (handled by sibling route).
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createHash } from "node:crypto";

import { requireAdmin } from "@/lib/require-admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  buildImpersonateCookieAttrs,
  startImpersonation,
} from "@/lib/admin-impersonation";
import { logger } from "@/lib/logger";

const log = logger("api:admin:impersonate");

const Body = z.object({
  target_user_id: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  if (
    !(await isAllowed("admin_impersonate", ipKey(request), {
      max: 30,
      refillPerSec: 0.1,
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

  // Look up the target user's email — service-role read.
  const admin = createAdminClient();
  const { data: target } = await admin.auth.admin.getUserById(parsed.data.target_user_id);
  if (!target?.user?.email) {
    return NextResponse.json({ error: "Target user not found." }, { status: 404 });
  }

  const ip = ipKey(request);
  const ipHash = createHash("sha256").update(ip).digest("hex").slice(0, 32);
  const userAgent = request.headers.get("user-agent")?.slice(0, 500) ?? null;

  try {
    const row = await startImpersonation({
      adminUserId: guard.userId,
      targetUserId: parsed.data.target_user_id,
      targetEmail: target.user.email,
      ipHash,
      userAgent,
    });
    const res = NextResponse.json({
      ok: true,
      impersonation_id: row.id,
      target_email: row.target_email,
    });
    res.headers.append("Set-Cookie", buildImpersonateCookieAttrs(row.id));
    return res;
  } catch (err) {
    log.error("start impersonation failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Start failed." }, { status: 500 });
  }
}
