/**
 * /api/admin/finance — admin-only finance-ledger CRUD.
 *
 *   GET    — { transactions, monthly }  (latest 500 txns + monthly P&L summary)
 *   POST   — create a transaction
 *   PATCH  — update a transaction by id
 *   DELETE — remove a transaction by id
 *
 * Why this exists: finance_transactions carries a single RLS policy —
 * service_role ALL — so the admin Finance dashboard (app/admin/finance), which
 * used the browser anon client, could neither read (0 rows) nor write (denied)
 * the ledger. This route moves every operation to the service-role client
 * behind the standard ADMIN_EMAILS guard. The Stripe-revenue sync lives at
 * /api/admin/finance/sync.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/require-admin";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("api:admin:finance");

export const runtime = "nodejs";

const TxnFields = z.object({
  date: z.string().min(1),
  type: z.enum(["income", "expense"]),
  category: z.string().min(1).max(64),
  description: z.string().min(1).max(500),
  amount_cents: z.number().int(),
  counterparty: z.string().max(200).nullish(),
  reference: z.string().max(200).nullish(),
  recurring: z.boolean().optional(),
  recurring_interval: z.string().max(32).nullish(),
  notes: z.string().max(2000).nullish(),
});

const CreateBody = TxnFields;
const UpdateBody = TxnFields.partial().extend({ id: z.number().int().positive() });
const DeleteBody = z.object({ id: z.number().int().positive() });

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const supabase = createAdminClient();
  const [txnRes, monthRes] = await Promise.all([
    supabase.from("finance_transactions").select("*").order("date", { ascending: false }).limit(500),
    supabase.from("finance_monthly_summary").select("*").limit(24),
  ]);

  if (txnRes.error || monthRes.error) {
    log.error("Finance read failed", { err: (txnRes.error || monthRes.error)?.message });
    return NextResponse.json({ error: "Failed to load finance data" }, { status: 500 });
  }

  return NextResponse.json({
    transactions: txnRes.data || [],
    monthly: monthRes.data || [],
  });
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const parsed = CreateBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid transaction", details: parsed.error.flatten() }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.from("finance_transactions").insert(parsed.data).select().single();
  if (error) {
    log.error("Finance insert failed", { err: error.message });
    return NextResponse.json({ error: "Failed to create transaction" }, { status: 500 });
  }
  return NextResponse.json({ transaction: data });
}

export async function PATCH(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const parsed = UpdateBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid transaction", details: parsed.error.flatten() }, { status: 400 });
  }

  const { id, ...fields } = parsed.data;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("finance_transactions")
    .update(fields)
    .eq("id", id)
    .select()
    .single();
  if (error) {
    log.error("Finance update failed", { err: error.message });
    return NextResponse.json({ error: "Failed to update transaction" }, { status: 500 });
  }
  return NextResponse.json({ transaction: data });
}

export async function DELETE(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const parsed = DeleteBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("finance_transactions").delete().eq("id", parsed.data.id);
  if (error) {
    log.error("Finance delete failed", { err: error.message });
    return NextResponse.json({ error: "Failed to delete transaction" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
