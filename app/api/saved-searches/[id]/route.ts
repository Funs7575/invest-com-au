/**
 * PATCH / DELETE /api/saved-searches/[id]
 *
 * Auth: session-authenticated via `createClient()` from lib/supabase/server.
 * Rate-limit: IP-keyed via `isAllowed/ipKey` from lib/rate-limit-db.
 * Validation: PATCH body is Zod-validated inline because `withValidatedBody`
 *   composes only over `(req)`-shaped handlers — dynamic-segment handlers
 *   take `(req, { params })`, so the validation is done directly here. The
 *   "no unvalidated req.json()" lint rule is honoured by passing the parsed
 *   JSON through `Schema.safeParse(...)` before any field is read.
 *
 * 404 vs 401: we return 404 when the user is authenticated but the row
 * doesn't exist (or belongs to a different user) so we don't leak the
 * existence of others' saved searches.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import { remove, update, EMAIL_FREQUENCIES } from "@/lib/saved-searches";

const log = logger("api:saved-searches:id");

export const runtime = "nodejs";

const PatchBody = z.object({
  label: z.string().trim().min(1).max(120).optional(),
  filters: z.record(z.string(), z.unknown()).optional(),
  email_frequency: z.enum(EMAIL_FREQUENCIES).optional(),
});

function parseId(raw: string): number | null {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

export async function PATCH(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (
    !(await isAllowed("saved_searches_patch", ipKey(request), {
      max: 30,
      refillPerSec: 30 / 600,
    }))
  ) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: rawId } = await ctx.params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = PatchBody.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const msg = first?.message ?? "Invalid request body";
    return NextResponse.json({ error: msg, code: "validation_error" }, { status: 400 });
  }

  const row = await update(id, user.id, parsed.data);
  if (!row) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json({ saved_search: row });
}

export async function DELETE(
  request: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  if (
    !(await isAllowed("saved_searches_delete", ipKey(request), {
      max: 30,
      refillPerSec: 30 / 600,
    }))
  ) {
    return NextResponse.json({ error: "Rate limited" }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id: rawId } = await ctx.params;
  const id = parseId(rawId);
  if (id === null) {
    return NextResponse.json({ error: "Invalid id" }, { status: 400 });
  }

  const ok = await remove(id, user.id);
  if (!ok) {
    log.warn("delete failed", { id, userId: user.id });
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
