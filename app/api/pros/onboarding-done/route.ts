/**
 * POST /api/pros/onboarding-done — stamp `professionals.onboarding_done_at`
 * for the calling pro.
 *
 * The pro onboarding tour (C3) calls this when the user completes or
 * skips the tour. The localStorage flag (`iv_pro_onboarding_done`) is
 * the fast suppression path; this server stamp is the durable record
 * so the same pro on a different browser / cleared localStorage won't
 * see the tour again.
 *
 * Idempotent: if the column is already set we still write `now()` —
 * the latest stamp wins, but the column is a "first-completed" marker
 * and downstream readers should treat "non-null" as "done". We don't
 * read-then-write because the row is small and the extra round-trip
 * is more cost than the redundant UPDATE.
 *
 * Auth: required. The handler scopes the UPDATE to the calling user's
 * `auth_user_id` so a malicious client can't stamp another pro's row.
 * Rate-limit: IP-keyed; this endpoint is expected to be hit at most
 * once per pro lifetime.
 */
import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";

const log = logger("api:pros:onboarding-done");

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (
    !(await isAllowed("pros_onboarding_done", ipKey(request), {
      max: 10,
      refillPerSec: 0.2,
    }))
  ) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // No body — schema-free endpoint. Documenting the empty contract so
  // the lint rule `invest/no-unvalidated-req-json` audit stays explicit.

  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("professionals")
      .update({ onboarding_done_at: new Date().toISOString() })
      .eq("auth_user_id", user.id);

    if (error) {
      log.warn("onboarding-done update failed", { error: error.message });
      return NextResponse.json(
        { error: "Could not stamp completion." },
        { status: 500 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    log.error("onboarding-done threw", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
