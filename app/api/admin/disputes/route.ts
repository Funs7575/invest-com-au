import { NextResponse } from "next/server";

import { requireAdmin } from "@/lib/require-admin";
import { listOpenDisputes } from "@/lib/disputes";
import { logger } from "@/lib/logger";

const log = logger("api:admin:disputes:list");

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  try {
    const rows = await listOpenDisputes();
    return NextResponse.json({ disputes: rows });
  } catch (err) {
    log.error("list open disputes failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json(
      { error: "Failed to load disputes." },
      { status: 500 },
    );
  }
}
