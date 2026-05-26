/**
 * /api/account/verified-products — "I use this" verification CRUD.
 *
 * GET    — current user's verifications (ordered by verified_at DESC)
 * POST   — verify a product (idempotent-safe; 409 if already verified)
 * DELETE — remove verification
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { logger } from "@/lib/logger";

const log = logger("api:account:verified-products");

export const runtime = "nodejs";

const ProductTypeSchema = z.enum(["broker", "etf", "advisor", "property"]);

const VerifyBody = z.object({
  product_type: ProductTypeSchema,
  product_ref: z.string().min(1).max(200),
});

const RemoveBody = z.object({
  product_type: ProductTypeSchema,
  product_ref: z.string().min(1).max(200),
});

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("product_user_verified")
    .select("id, product_type, product_ref, verified_at")
    .eq("user_id", user.id)
    .order("verified_at", { ascending: false });

  if (error) {
    log.warn("GET failed", { userId: user.id, error: error.message });
    return NextResponse.json({ error: "fetch_failed" }, { status: 500 });
  }
  return NextResponse.json({ verifications: data ?? [] });
}

export const POST = withValidatedBody(VerifyBody, async (_req, body) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("product_user_verified")
    .insert({ user_id: user.id, product_type: body.product_type, product_ref: body.product_ref })
    .select("id, product_type, product_ref, verified_at")
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "already_verified" }, { status: 409 });
    }
    log.warn("POST failed", { userId: user.id, body, error: error.message });
    return NextResponse.json({ error: "insert_failed" }, { status: 500 });
  }
  return NextResponse.json({ verification: data }, { status: 201 });
});

export const DELETE = withValidatedBody(RemoveBody, async (_req, body) => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { error } = await supabase
    .from("product_user_verified")
    .delete()
    .eq("user_id", user.id)
    .eq("product_type", body.product_type)
    .eq("product_ref", body.product_ref);

  if (error) {
    log.warn("DELETE failed", { userId: user.id, body, error: error.message });
    return NextResponse.json({ error: "delete_failed" }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
});
