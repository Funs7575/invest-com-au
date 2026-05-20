/**
 * POST /api/embed/rotate-key — generate a fresh embed API key (Phase 4.4).
 *
 * Returns the plaintext key ONCE; only the SHA-256 hash is persisted on
 * the embed_customers row. The caller must be an authenticated
 * embed_customer (their own row, via RLS-scoped update through the
 * service client after an explicit ownership check).
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import crypto from "node:crypto";

const log = logger("api:embed:rotate-key");

export const runtime = "nodejs";

function generateKey(): { plaintext: string; hash: string } {
  // ik_ prefix (invest key) + 32 random bytes base64url.
  const plaintext = `ik_${crypto.randomBytes(32).toString("base64url")}`;
  const hash = crypto.createHash("sha256").update(plaintext).digest("hex");
  return { plaintext, hash };
}

export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();

  // Confirm the caller owns an embed_customer row.
  const { data: customer, error } = await admin
    .from("embed_customers")
    .select("id")
    .eq("auth_user_id", user.id)
    .is("deleted_at", null)
    .maybeSingle();
  if (error || !customer) {
    return NextResponse.json({ error: "no_embed_account" }, { status: 403 });
  }

  const { plaintext, hash } = generateKey();
  const now = new Date().toISOString();

  const { error: updErr } = await admin
    .from("embed_customers")
    .update({ api_key_hash: hash, api_key_created_at: now })
    .eq("id", customer.id);
  if (updErr) {
    log.warn("rotate-key update failed", { customerId: customer.id, error: updErr.message });
    return NextResponse.json({ error: "rotate_failed" }, { status: 500 });
  }

  // Return the plaintext once. It is never retrievable again.
  return NextResponse.json({ ok: true, api_key: plaintext, created_at: now });
}
