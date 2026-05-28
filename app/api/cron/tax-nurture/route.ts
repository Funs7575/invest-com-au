import { NextRequest, NextResponse } from "next/server";

import { requireCronAuth } from "@/lib/cron-auth";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { runTaxNurture } from "@/lib/tax-nurture";
import { logger } from "@/lib/logger";
import { wrapCronHandler } from "@/lib/cron-run-log";

const log = logger("cron:tax-nurture");

async function handler(req: NextRequest): Promise<NextResponse> {
  const auth = requireCronAuth(req);
  if (auth) return auth;

  if (
    !(await isAllowed("cron_tax_nurture", ipKey(req), {
      max: 5,
      refillPerSec: 0.01,
    }))
  ) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  try {
    const result = await runTaxNurture();
    log.info("tax nurture run complete", { result });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    log.error("tax nurture run failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Run failed." }, { status: 500 });
  }
}

export const GET = wrapCronHandler("tax-nurture", handler);
