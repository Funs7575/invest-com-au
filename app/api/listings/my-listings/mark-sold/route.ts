import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
 
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireListingOwnerSession } from "@/lib/require-listing-owner-session";
import { LISTING_OWNER_COOKIE_NAME, verifyListingOwnerCookie } from "@/lib/listing-owner-cookie";
import { buildSoldUpdates, isMissingSoldColumnsError } from "@/lib/listings/sold-archive";
import { logger } from "@/lib/logger";

const log = logger("api:listings:mark-sold");

export const runtime = "nodejs";

/**
 * POST /api/listings/my-listings/mark-sold
 *
 * Owner-portal sold transition. Auth is the listing-owner session
 * (JWT account or the legacy OTP cookie); ownership is the same
 * contact_email linkage the my-listings GET uses. The disclosed price is
 * optional — undisclosed sales still archive for liquidity signals but are
 * excluded from price comps (see lib/listings/sold-archive.ts).
 */
const BodySchema = z.object({
  listing_id: z.number().int().positive(),
  sold_price_cents: z.number().int().positive().max(1_000_000_000_000_00).nullish(),
});

async function sessionEmail(): Promise<string | null> {
  const session = await requireListingOwnerSession();
  if (!session) return null;
  if (session.kind === "otp") return session.email.toLowerCase();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.email?.toLowerCase() ?? null;
}

export async function POST(request: NextRequest) {
  const parsed = BodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
  const { listing_id: listingId, sold_price_cents: soldPriceCents = null } = parsed.data;

  const email = await sessionEmail();
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: listing, error: fetchError } = await admin
    .from("investment_listings")
    .select("id, contact_email, status")
    .eq("id", listingId)
    .maybeSingle();

  let ownershipOk =
    !fetchError && !!listing && (listing.contact_email ?? "").toLowerCase() === email;
  if (!ownershipOk && !fetchError && listing) {
    // A signed-in user whose account email differs from the listing's
    // contact_email may still have OTP-verified that mailbox — the cookie
    // wins when it vouches for the listing's own contact email.
    const cookieValue = request.cookies.get(LISTING_OWNER_COOKIE_NAME)?.value;
    const contactEmail = (listing.contact_email ?? "").toLowerCase();
    if (cookieValue && contactEmail) {
      ownershipOk = verifyListingOwnerCookie(cookieValue, {
        expectedEmail: contactEmail,
      }).ok;
    }
  }
  if (!ownershipOk || !listing) {
    // Same generic shape for not-found and not-yours — no ownership oracle.
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }
  if (listing.status === "sold") {
    return NextResponse.json({ ok: true, already_sold: true });
  }
  if (listing.status !== "active") {
    // Sold rows publish to the public archive — only live listings may
    // transition. Letting a pending/expired/removed row through would
    // bypass the moderation lifecycle. Same generic shape as not-found
    // (the owner already sees their status in the portal).
    return NextResponse.json({ error: "Listing not found" }, { status: 404 });
  }

  const updates = buildSoldUpdates(soldPriceCents);
  let { error: updateError } = await admin
    .from("investment_listings")
    .update(updates)
    .eq("id", listingId);

  if (updateError && isMissingSoldColumnsError(updateError.message)) {
    // Archive columns not applied yet — record the transition itself.
    ({ error: updateError } = await admin
      .from("investment_listings")
      .update({ status: "sold" })
      .eq("id", listingId));
  }

  if (updateError) {
    log.error("mark-sold update failed", { listingId, error: updateError.message });
    return NextResponse.json({ error: "Failed to update listing" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
