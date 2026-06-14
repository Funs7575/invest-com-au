import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createBookingCheckout } from "@/lib/stripe-connect";
import { isRateLimited } from "@/lib/rate-limit";
import { getSiteUrl } from "@/lib/url";
import { logger } from "@/lib/logger";

const log = logger("booking:checkout");

export const runtime = "nodejs";

const BodySchema = z.object({
  consumerName: z.string().min(1).max(200),
  consumerEmail: z.string().email().max(320),
  topic: z.string().max(500).optional(),
});

// The dynamic segment is named `token` to match the sibling
// /api/booking/[token]/{cancel,reschedule} routes (Next.js requires one slug
// name per path position). For checkout the value is the numeric slot id.
type Params = { params: Promise<{ token: string }> };

/**
 * POST /api/booking/[token]/checkout
 *
 * Creates a Stripe Checkout session for a paid advisor session booking.
 * The slot is NOT claimed until the webhook confirms payment — prevents
 * consumers from holding slots without paying.
 *
 * Returns { checkoutUrl } on success. Consumers are redirected to Stripe's
 * hosted checkout page; on success they land on /booking/success.
 *
 * Rate-limited: 5 attempts / 60 s per IP.
 */
export async function POST(req: NextRequest, { params }: Params): Promise<Response> {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (await isRateLimited(`booking-checkout:${ip}`, 5, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const { token: slotIdRaw } = await params;
  const slotId = Number.parseInt(slotIdRaw, 10);
  if (!Number.isFinite(slotId) || slotId <= 0) {
    return NextResponse.json({ error: "Invalid slot." }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request body.", issues: parsed.error.issues }, { status: 400 });
  }
  const { consumerEmail, consumerName } = parsed.data;

  // Optional: attach logged-in user_id for consumer-side payment history
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const admin = createAdminClient();

  // Load the slot and verify it's still open
  const { data: slot } = await admin
    .from("advisor_booking_appointments")
    .select("id, professional_id, starts_at, ends_at, status")
    .eq("id", slotId)
    .maybeSingle();

  if (!slot) {
    return NextResponse.json({ error: "Slot not found." }, { status: 404 });
  }
  if (slot.status !== "open") {
    return NextResponse.json({ error: "Slot is no longer available." }, { status: 409 });
  }
  if (new Date(slot.starts_at as string).getTime() <= Date.now()) {
    return NextResponse.json({ error: "Slot has already passed." }, { status: 409 });
  }

  // Load advisor details + session price
  const { data: advisor } = await admin
    .from("professionals")
    .select("id, name, slug, session_price_cents, stripe_connect_account_id, stripe_connect_charges_enabled")
    .eq("id", slot.professional_id as number)
    .maybeSingle();

  if (!advisor) {
    return NextResponse.json({ error: "Advisor not found." }, { status: 404 });
  }

  const sessionPriceCents = (advisor as Record<string, unknown>).session_price_cents as number | null;
  if (!sessionPriceCents || sessionPriceCents <= 0) {
    return NextResponse.json({ error: "This slot does not require payment." }, { status: 422 });
  }

  const siteUrl = getSiteUrl(req.headers.get("host"));
  const successUrl = `${siteUrl}/booking/success?slotId=${slotId}&email=${encodeURIComponent(consumerEmail)}&name=${encodeURIComponent(consumerName)}&session_id={CHECKOUT_SESSION_ID}`;
  const cancelUrl = `${siteUrl}/advisor/${advisor.slug as string}#book`;

  const result = await createBookingCheckout({
    slotId,
    professionalId: slot.professional_id as number,
    advisorSlug: advisor.slug as string,
    advisorName: advisor.name as string,
    consumerEmail,
    consumerUserId: user?.id ?? null,
    amountCents: sessionPriceCents,
    successUrl,
    cancelUrl,
  });

  if (!result.checkoutUrl) {
    log.warn("createBookingCheckout unavailable", {
      unavailable: result.unavailable,
      slot_id: slotId,
      professional_id: slot.professional_id,
    });
    if (result.unavailable === "pro_not_connected") {
      return NextResponse.json({ error: "Advisor payment is not set up yet." }, { status: 422 });
    }
    return NextResponse.json({ error: "Payment unavailable. Please try again." }, { status: 503 });
  }

  log.info("Booking checkout session created", {
    slot_id: slotId,
    professional_id: slot.professional_id,
    amount_cents: sessionPriceCents,
  });

  return NextResponse.json({ checkoutUrl: result.checkoutUrl });
}
