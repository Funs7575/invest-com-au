import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { createPaymentForBrief } from "@/lib/stripe-connect";
import { logger } from "@/lib/logger";

const log = logger("api:briefs:payment");

const Body = z.object({
  amount_cents: z.number().int().min(100).max(50_000_000),
  description: z.string().min(3).max(500),
});

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  if (
    !(await isAllowed("briefs_marketplace_payment", ipKey(request), {
      max: 30,
      refillPerSec: 0.1,
    }))
  ) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body." },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Auth required." }, { status: 401 });
  }

  const { slug } = await ctx.params;
  const admin = createAdminClient();
  const { data: brief } = await admin
    .from("advisor_auctions")
    .select(
      "id, contact_email, accepted_by_professional_id, accepted_at, status",
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!brief) {
    return NextResponse.json({ error: "Brief not found." }, { status: 404 });
  }
  if (brief.contact_email !== user.email) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }
  if (!brief.accepted_by_professional_id || !brief.accepted_at) {
    return NextResponse.json(
      { error: "Brief not yet accepted by a pro." },
      { status: 409 },
    );
  }

  const result = await createPaymentForBrief({
    briefId: brief.id as number,
    professionalId: brief.accepted_by_professional_id as number,
    consumerEmail: user.email,
    consumerUserId: user.id,
    amountCents: parsed.data.amount_cents,
    description: parsed.data.description,
  });

  if (result.unavailable === "no_secret") {
    return NextResponse.json(
      { error: "Stripe not configured." },
      { status: 503 },
    );
  }
  if (result.unavailable === "pro_not_connected") {
    return NextResponse.json(
      { error: "Provider has not completed Connect onboarding." },
      { status: 409 },
    );
  }
  if (!result.clientSecret) {
    log.warn("payment creation failed", {
      brief_id: brief.id,
      detail: result.detail,
    });
    return NextResponse.json(
      { error: result.detail ?? "Payment creation failed." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    client_secret: result.clientSecret,
    payment_id: result.paymentId,
    payment_intent_id: result.paymentIntentId,
  });
}
