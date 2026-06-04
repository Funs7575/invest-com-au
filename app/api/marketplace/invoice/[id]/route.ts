import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const invoiceId = parseInt(id, 10);
  if (isNaN(invoiceId)) {
    return NextResponse.json({ error: "Invalid invoice ID" }, { status: 400 });
  }

  // Auth via cookies
  const cookieHeader = request.headers.get("cookie") || "";
  const supabaseAuth = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    {
      cookies: {
        getAll() {
          return cookieHeader.split(";").map((c) => {
            const [name, ...rest] = c.trim().split("=");
            return { name, value: rest.join("=") };
          });
        },
        setAll() {},
      },
    }
  );

  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get broker account
  const supabase = createAdminClient();

  const { data: account } = await supabase
    .from("broker_accounts")
    .select("broker_slug")
    .eq("auth_user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!account) {
    return NextResponse.json({ error: "No broker account" }, { status: 403 });
  }

  // Get invoice (only if belongs to this broker).
  // Explicit column list — never select the raw payment-processor identifiers
  // (`stripe_payment_intent_id`, `stripe_checkout_session_id`). A truncated,
  // display-only payment reference is derived server-side below.
  const { data: invoice, error } = await supabase
    .from("marketplace_invoices")
    .select(
      "id, broker_slug, type, amount_cents, currency, status, invoice_number, description, line_items, subtotal_cents, tax_cents, paid_at, broker_email, broker_company_name, broker_abn, created_at, stripe_payment_intent_id",
    )
    .eq("id", invoiceId)
    .eq("broker_slug", account.broker_slug)
    .maybeSingle();

  if (error || !invoice) {
    return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
  }

  // Defensively strip any raw payment-processor identifiers; expose only a
  // truncated, display-only reference. (The .select() above already omits
  // stripe_checkout_session_id — this guards against the column list drifting.)
  const {
    stripe_payment_intent_id,
    stripe_checkout_session_id: _omitSession,
    ...safeInvoice
  } = invoice as typeof invoice & { stripe_checkout_session_id?: string };
  const stripe_payment_reference = stripe_payment_intent_id
    ? stripe_payment_intent_id.length > 24
      ? `${stripe_payment_intent_id.slice(0, 24)}...`
      : stripe_payment_intent_id
    : null;

  return NextResponse.json({
    invoice: { ...safeInvoice, stripe_payment_reference },
  });
}
