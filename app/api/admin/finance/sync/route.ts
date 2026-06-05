/**
 * /api/admin/finance/sync — pull paid advisor_billing rows into the finance
 * ledger as income transactions, skipping any already imported.
 *
 *   POST — { added: number }
 *
 * Split out from /api/admin/finance because it reads advisor_billing (a
 * privileged, is_admin()-only table) and writes finance_transactions
 * (service-role-only) — both require the service-role client. Previously the
 * Finance dashboard ran this loop from the browser anon client, which the RLS
 * hardening now denies on both tables.
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("api:admin:finance:sync");

export const runtime = "nodejs";

export async function POST() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();

  const { data: billing, error: billingError } = await supabase
    .from("advisor_billing")
    .select("id, amount_cents, professional_id, description, status, created_at")
    .eq("status", "paid")
    .order("created_at", { ascending: false })
    .limit(100);

  if (billingError) {
    log.error("Finance sync billing read failed", { err: billingError.message });
    return NextResponse.json({ error: "Failed to read billing" }, { status: 500 });
  }
  if (!billing || billing.length === 0) {
    return NextResponse.json({ added: 0 });
  }

  const { data: existingRefs, error: refsError } = await supabase
    .from("finance_transactions")
    .select("reference")
    .eq("category", "advisor_credits")
    .not("reference", "is", null);

  if (refsError) {
    log.error("Finance sync refs read failed", { err: refsError.message });
    return NextResponse.json({ error: "Failed to read existing transactions" }, { status: 500 });
  }

  const existingSet = new Set((existingRefs || []).map((r) => r.reference));
  const rows = billing
    .filter((b) => !existingSet.has(`advisor_billing_${b.id}`))
    .map((b) => ({
      date: new Date(b.created_at).toISOString().slice(0, 10),
      type: "income" as const,
      category: "advisor_credits",
      description: b.description || "Advisor lead payment",
      amount_cents: b.amount_cents,
      counterparty: `Advisor #${b.professional_id}`,
      reference: `advisor_billing_${b.id}`,
    }));

  if (rows.length === 0) {
    return NextResponse.json({ added: 0 });
  }

  const { error: insertError } = await supabase.from("finance_transactions").insert(rows);
  if (insertError) {
    log.error("Finance sync insert failed", { err: insertError.message });
    return NextResponse.json({ error: "Failed to import billing" }, { status: 500 });
  }

  return NextResponse.json({ added: rows.length });
}
