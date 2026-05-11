/**
 * /api/listings/my-listings/claim — JWT-required listing claim (W2 Phase 4).
 *
 * Authenticated user POSTs `{ listing_id, listing_table }` to claim a
 * listing they own (validated by matching email on the listing record).
 *
 * Side-effects:
 *   1. Insert/update `listing_claims` with `auth_user_id = user.id`
 *   2. Upsert a `listing_owner_accounts` row for the user
 *
 * Pre-existing OTP-cookie path at /api/listings/my-listings/verify is
 * unchanged; that's the legacy tier for users who haven't signed up yet.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { logger } from "@/lib/logger";

const log = logger("api:listings:my-listings:claim");

export const runtime = "nodejs";

const Body = z.object({
  listing_id: z.coerce.number().int().positive(),
  listing_table: z.enum(["investment_listings", "property_listings"]),
});

export const POST = withValidatedBody(Body, async (req, body) => {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || !user.email) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Look up the target listing's contact_email via service-role (the
  // user-scoped client may not have anon SELECT on these columns).
  const admin = createAdminClient();
  const { data: listing, error: listingErr } = await admin
    .from(body.listing_table)
    .select("id, contact_email, slug, title")
    .eq("id", body.listing_id)
    .maybeSingle();

  if (listingErr || !listing) {
    return NextResponse.json({ error: "listing_not_found" }, { status: 404 });
  }

  const listingEmail = ((listing as { contact_email?: string }).contact_email ?? "").trim().toLowerCase();
  const userEmail = user.email.trim().toLowerCase();
  if (!listingEmail || listingEmail !== userEmail) {
    return NextResponse.json({ error: "email_mismatch" }, { status: 403 });
  }

  // Upsert the claim row. listing_claims has `claim_type` + `target_slug`
  // shape; we key on (auth_user_id, target_slug, claim_type) to enable
  // idempotent re-claims.
  const claimType = body.listing_table === "property_listings" ? "property_listing" : "listing";
  const targetSlug = (listing as { slug?: string }).slug ?? String(body.listing_id);

  const { error: claimErr } = await admin
    .from("listing_claims")
    .upsert(
      {
        auth_user_id: user.id,
        email: user.email,
        claim_type: claimType,
        target_slug: targetSlug,
        status: "verified",
      },
      { onConflict: "auth_user_id,claim_type,target_slug" },
    );
  if (claimErr) {
    log.warn("listing_claims upsert failed", {
      userId: user.id,
      error: claimErr.message,
    });
    return NextResponse.json({ error: "claim_insert_failed", detail: claimErr.message }, { status: 500 });
  }

  // Upsert listing_owner_accounts so future logins land on the listing
  // workspace. Idempotent — UNIQUE(auth_user_id) prevents duplicates.
  const { error: accountErr } = await admin
    .from("listing_owner_accounts")
    .upsert(
      {
        auth_user_id: user.id,
        display_name: user.email,
        email_verified_at: new Date().toISOString(),
        status: "active",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "auth_user_id" },
    );
  if (accountErr) {
    log.warn("listing_owner_accounts upsert failed", {
      userId: user.id,
      error: accountErr.message,
    });
  }

  return NextResponse.json({
    ok: true,
    listing: { id: body.listing_id, table: body.listing_table, title: (listing as { title?: string }).title ?? null },
  });
});
