/**
 * POST /api/saved-searches — create a saved search for the signed-in user.
 *
 * Auth: session-authenticated via `createClient()` from lib/supabase/server.
 * Rate-limit: IP-keyed via `isAllowed(scope, ipKey(req))` to keep abuse off
 *   the digest funnel (the cron downstream sends real emails).
 * Validation: Zod via `withValidatedBody`.
 *
 * Returns 401 if not signed in, 400 on validation error, 500 on DB failure.
 */

import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { createClient } from "@/lib/supabase/server";
import { logger } from "@/lib/logger";
import {
  create,
  listForUser,
  SAVED_SEARCH_KINDS,
  EMAIL_FREQUENCIES,
} from "@/lib/saved-searches";

const log = logger("api:saved-searches");

export const runtime = "nodejs";

const Body = z.object({
  kind: z.enum(SAVED_SEARCH_KINDS),
  label: z.string().trim().min(1, "Label required").max(120),
  filters: z.record(z.string(), z.unknown()).default({}),
  email_frequency: z.enum(EMAIL_FREQUENCIES).default("daily"),
});

export async function GET(request: NextRequest) {
  if (
    !(await isAllowed("saved_searches_list", ipKey(request), {
      max: 60,
      refillPerSec: 60 / 60,
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

  const rows = await listForUser(user.id);
  return NextResponse.json({ saved_searches: rows });
}

export const POST = withValidatedBody(Body, async (request: NextRequest, body) => {
  if (
    !(await isAllowed("saved_searches_create", ipKey(request), {
      max: 20,
      refillPerSec: 20 / 3600,
    }))
  ) {
    return NextResponse.json(
      { error: "Too many saves. Please try again later." },
      { status: 429 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const row = await create({
    userId: user.id,
    kind: body.kind,
    label: body.label,
    filters: body.filters,
    email_frequency: body.email_frequency,
  });

  if (!row) {
    log.warn("saved-search create failed", { userId: user.id });
    return NextResponse.json(
      { error: "Could not save your search. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ saved_search: row });
});
