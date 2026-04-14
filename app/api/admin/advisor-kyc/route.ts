import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import {
  listPendingKyc,
  listKycDocuments,
  verifyKyc,
  rejectKyc,
} from "@/lib/advisor-kyc";

export const runtime = "nodejs";

/**
 * /api/admin/advisor-kyc
 *
 *   GET  ?professional_id=… — history for one advisor
 *   GET                      — all pending uploads (queue)
 *   PATCH body:
 *     { id, action: 'verify', notes? }
 *     { id, action: 'reject', reason }
 */
export async function GET(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const professionalId = request.nextUrl.searchParams.get("professional_id");
  if (professionalId) {
    const items = await listKycDocuments(Number(professionalId));
    return NextResponse.json({ items });
  }

  const items = await listPendingKyc();
  return NextResponse.json({ items });
}

export async function PATCH(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => ({}));
  const id = typeof body.id === "number" ? body.id : null;
  const action = body.action as "verify" | "reject" | undefined;
  if (!id || !action) {
    return NextResponse.json({ error: "Missing id or action" }, { status: 400 });
  }

  if (action === "verify") {
    const notes = typeof body.notes === "string" ? body.notes : null;
    const ok = await verifyKyc({ id, verifiedBy: guard.email, notes });
    return NextResponse.json({ ok });
  }

  if (action === "reject") {
    const reason = typeof body.reason === "string" ? body.reason : null;
    if (!reason || reason.length < 3) {
      return NextResponse.json(
        { error: "Rejection reason required" },
        { status: 400 },
      );
    }
    const ok = await rejectKyc({ id, verifiedBy: guard.email, reason });
    return NextResponse.json({ ok });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
