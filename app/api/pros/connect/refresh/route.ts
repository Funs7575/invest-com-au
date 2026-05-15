import { NextRequest, NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { refreshConnectAccountStatus } from "@/lib/stripe-connect";

export async function POST(request: NextRequest) {
  if (
    !(await isAllowed("pros_connect_refresh", ipKey(request), {
      max: 20,
      refillPerSec: 0.2,
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
    .select("id, stripe_connect_account_id")
    .or(`auth_user_id.eq.${user.id},email.eq.${user.email}`)
    .maybeSingle();
  if (!pro?.stripe_connect_account_id) {
    return NextResponse.json({ error: "No Connect account." }, { status: 404 });
  }
  await refreshConnectAccountStatus(pro.stripe_connect_account_id as string);
  return NextResponse.json({ ok: true });
}
