import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { createConnectOnboardingLink } from "@/lib/stripe-connect";
import { SITE_URL } from "@/lib/seo";
import { logger } from "@/lib/logger";

const log = logger("api:pros:connect:onboarding");

export async function POST(request: NextRequest) {
  if (
    !(await isAllowed("pros_connect_onboarding", ipKey(request), {
      max: 10,
      refillPerSec: 0.1,
    }))
  ) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Auth required." }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: pro } = await admin
    .from("professionals")
    .select("id, email")
    .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
    .in("status", ["active", "pending"])
    .maybeSingle();
  if (!pro) {
    return NextResponse.json({ error: "Pro not found." }, { status: 404 });
  }

  const result = await createConnectOnboardingLink({
    professionalId: pro.id as number,
    email: (pro.email as string) ?? user.email!,
    refreshUrl: `${SITE_URL}/pros/connect?refresh=1`,
    returnUrl: `${SITE_URL}/pros/connect?completed=1`,
  });

  if (result.unavailable === "no_secret") {
    log.warn("STRIPE_SECRET_KEY missing");
    return NextResponse.json(
      { error: "Stripe Connect not configured." },
      { status: 503 },
    );
  }
  if (!result.url) {
    return NextResponse.json(
      { error: result.detail ?? "Failed to create link." },
      { status: 502 },
    );
  }
  return NextResponse.json({ url: result.url });
}
