/**
 * GET /api/advisor-auth/credit-ledger?limit=50&offset=0
 *
 * Paginated read of the authenticated advisor's credit ledger. Used by
 * the LedgerHistoryTable in BillingTab when the advisor scrolls past
 * the first page that came from /billing-summary.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { getLedgerPage } from "@/lib/advisor-credit-ledger";

export async function GET(request: NextRequest) {
  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const limitRaw = request.nextUrl.searchParams.get("limit");
  const offsetRaw = request.nextUrl.searchParams.get("offset");
  const limit = limitRaw && /^\d+$/.test(limitRaw) ? Math.min(parseInt(limitRaw, 10), 200) : 50;
  const offset = offsetRaw && /^\d+$/.test(offsetRaw) ? parseInt(offsetRaw, 10) : 0;

  const { rows, total } = await getLedgerPage(advisorId, { limit, offset });
  return NextResponse.json({ rows, total, limit, offset });
}
