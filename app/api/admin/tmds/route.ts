import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { listAllTmds, upsertTmd, type TmdProductType } from "@/lib/tmds";

export const runtime = "nodejs";

/**
 * /api/admin/tmds
 *
 *   GET  — list every TMD on file
 *   POST — upsert a TMD
 *          body: { product_type, product_ref, product_name, tmd_url,
 *                  tmd_version, reviewed_at?, valid_from?, valid_until? }
 */
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const items = await listAllTmds();
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => ({}));
  const productType = body.product_type as TmdProductType;
  const productRef = typeof body.product_ref === "string" ? body.product_ref : null;
  const productName = typeof body.product_name === "string" ? body.product_name : null;
  const tmdUrl = typeof body.tmd_url === "string" ? body.tmd_url : null;
  const tmdVersion = typeof body.tmd_version === "string" ? body.tmd_version : null;

  if (!productType || !productRef || !productName || !tmdUrl || !tmdVersion) {
    return NextResponse.json(
      { error: "Missing required field" },
      { status: 400 },
    );
  }

  const result = await upsertTmd({
    productType,
    productRef,
    productName,
    tmdUrl,
    tmdVersion,
    reviewedAt: typeof body.reviewed_at === "string" ? body.reviewed_at : null,
    validFrom: typeof body.valid_from === "string" ? body.valid_from : null,
    validUntil: typeof body.valid_until === "string" ? body.valid_until : null,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, id: result.id });
}
