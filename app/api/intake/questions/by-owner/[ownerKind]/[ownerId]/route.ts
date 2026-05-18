import { NextRequest, NextResponse } from "next/server";

import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import {
  listForProfessional,
  listForTeam,
  type IntakeOwnerKind,
} from "@/lib/pro-intake";
import { logger } from "@/lib/logger";

const log = logger("api:intake:list");

export async function GET(
  request: NextRequest,
  ctx: { params: Promise<{ ownerKind: string; ownerId: string }> },
) {
  try {
    if (!(await isAllowed("intake_questions_list", ipKey(request), { max: 60, refillPerSec: 1 }))) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }
    const { ownerKind, ownerId } = await ctx.params;
    if (ownerKind !== "professional" && ownerKind !== "team") {
      return NextResponse.json({ error: "Invalid owner kind." }, { status: 400 });
    }
    const ownerIdNum = Number(ownerId);
    if (!Number.isFinite(ownerIdNum) || ownerIdNum <= 0) {
      return NextResponse.json({ error: "Invalid owner id." }, { status: 400 });
    }
    const kind = ownerKind as IntakeOwnerKind;
    const questions =
      kind === "professional"
        ? await listForProfessional(ownerIdNum, { onlyEnabled: true })
        : await listForTeam(ownerIdNum, { onlyEnabled: true });
    return NextResponse.json({ questions });
  } catch (err) {
    log.error("list intake questions failed", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to load questions." }, { status: 500 });
  }
}
