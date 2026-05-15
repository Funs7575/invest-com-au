import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

import { requireAdmin } from "@/lib/require-admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import {
  IMPERSONATE_COOKIE,
  buildClearImpersonateCookieAttrs,
  endImpersonation,
} from "@/lib/admin-impersonation";
import { logger } from "@/lib/logger";

const log = logger("api:admin:impersonate:end");

export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  if (
    !(await isAllowed("admin_impersonate_end", ipKey(request), {
      max: 60,
      refillPerSec: 0.5,
    }))
  ) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const jar = await cookies();
  const raw = jar.get(IMPERSONATE_COOKIE)?.value;
  const rowId = raw ? Number.parseInt(raw, 10) : NaN;
  if (Number.isFinite(rowId) && rowId > 0) {
    try {
      await endImpersonation(rowId);
    } catch (err) {
      log.warn("endImpersonation failed (clearing cookie anyway)", {
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }
  const res = NextResponse.json({ ok: true });
  res.headers.append("Set-Cookie", buildClearImpersonateCookieAttrs());
  return res;
}
