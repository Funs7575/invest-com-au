import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { logger } from "@/lib/logger";

const log = logger("api:account:net-worth:balances");

export const runtime = "nodejs";

/**
 * /api/account/net-worth/balances — manual balance CRUD for the net-worth page.
 *
 *   GET    — authenticated user's manual balances (RLS scopes to own rows)
 *   POST   — add a balance entry
 *   DELETE — remove a balance entry (id required in body)
 *
 * RLS enforces owner isolation. The handler uses the user-scoped supabase
 * client so policies fire; never service-role.
 */

const CATEGORIES = ["savings", "super", "property", "other"] as const;

const AddBalanceBody = z.object({
  label: z.string().min(1).max(200).transform((s) => s.trim()),
  amount_cents: z.number().int().min(0).max(1e15),
  category: z.enum(CATEGORIES),
});

const DeleteBalanceBody = z.object({
  id: z.string().uuid(),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("manual_balances")
    .select("id, label, amount_cents, category, updated_at")
    .order("updated_at", { ascending: false });

  if (error) {
    log.warn("manual balances fetch failed", { error: error.message });
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }
  return NextResponse.json({ items: data ?? [] });
}

export const POST = withValidatedBody(AddBalanceBody, async (_req, body) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("manual_balances")
    .insert({
      user_id: user.id,
      label: body.label,
      amount_cents: body.amount_cents,
      category: body.category,
    })
    .select("id, label, amount_cents, category, updated_at")
    .single();

  if (error) {
    log.warn("manual balance insert failed", { error: error.message });
    return NextResponse.json({ error: "insert_failed", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ item: data }, { status: 201 });
});

export const DELETE = withValidatedBody(DeleteBalanceBody, async (_req, body) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("manual_balances")
    .delete()
    .eq("id", body.id);

  if (error) {
    log.warn("manual balance delete failed", { error: error.message });
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
});
