import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { getAdminEmails } from "@/lib/admin";

const log = logger("broker-deals");

/** Get the broker slug from the authenticated user */
async function getBrokerSlug(request: NextRequest): Promise<{ slug: string; accountId: string } | null> {
  const cookieHeader = request.headers.get("cookie") || "";
  const { createServerClient } = await import("@supabase/ssr");
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
    { cookies: { getAll() { return cookieHeader.split(";").map(c => { const [name, ...v] = c.trim().split("="); return { name, value: v.join("=") }; }); } } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = createAdminClient();
  const { data: account } = await admin
    .from("broker_accounts")
    .select("id, broker_slug, status")
    .eq("auth_user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!account) return null;
  return { slug: account.broker_slug, accountId: account.id };
}

/**
 * GET /api/broker-portal/deals
 * Returns the current deal for the authenticated broker.
 */
export async function GET(request: NextRequest) {
  const broker = await getBrokerSlug(request);
  if (!broker) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const supabase = createAdminClient();
  const { data } = await supabase
    .from("brokers")
    .select("deal, deal_text, deal_expiry, deal_terms, deal_category, deal_verified_date")
    .eq("slug", broker.slug)
    .single();

  return NextResponse.json({
    deal: data?.deal || false,
    deal_text: data?.deal_text || "",
    deal_expiry: data?.deal_expiry || null,
    deal_terms: data?.deal_terms || "",
    deal_category: data?.deal_category || null,
    deal_verified_date: data?.deal_verified_date || null,
  });
}

/**
 * PUT /api/broker-portal/deals
 * Update the deal for the authenticated broker.
 * Deal goes live immediately (self-service).
 */
export async function PUT(request: NextRequest) {
  const broker = await getBrokerSlug(request);
  if (!broker) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { deal_text, deal_expiry, deal_terms, deal_category, deal_enabled } = body;

  // Validation
  if (deal_enabled && !deal_text?.trim()) {
    return NextResponse.json({ error: "Deal text is required when enabling a deal" }, { status: 400 });
  }

  if (deal_enabled && deal_text && deal_text.trim().length > 200) {
    return NextResponse.json({ error: "Deal text must be under 200 characters" }, { status: 400 });
  }

  if (deal_enabled && deal_terms && deal_terms.trim().length > 500) {
    return NextResponse.json({ error: "Deal terms must be under 500 characters" }, { status: 400 });
  }

  if (deal_enabled && deal_expiry) {
    const expiry = new Date(deal_expiry);
    if (expiry < new Date()) {
      return NextResponse.json({ error: "Deal expiry must be in the future" }, { status: 400 });
    }
  }

  const supabase = createAdminClient();

  const updateData: Record<string, unknown> = {
    deal: !!deal_enabled,
    deal_text: deal_enabled ? deal_text?.trim() || null : null,
    deal_expiry: deal_enabled && deal_expiry ? deal_expiry : null,
    deal_terms: deal_enabled ? deal_terms?.trim() || null : null,
    deal_category: deal_enabled ? deal_category || null : null,
    deal_verified_date: deal_enabled ? new Date().toISOString() : null,
    deal_source: "self-service",
  };

  const { error } = await supabase
    .from("brokers")
    .update(updateData)
    .eq("slug", broker.slug);

  if (error) {
    log.error("Failed to update deal", { error: error.message, slug: broker.slug });
    return NextResponse.json({ error: "Failed to update deal" }, { status: 500 });
  }

  log.info("Broker deal updated", { slug: broker.slug, enabled: !!deal_enabled, text: deal_text?.trim()?.slice(0, 50) });

  // Notify admin of new/changed deal
  if (deal_enabled && process.env.RESEND_API_KEY) {
    const adminEmails = getAdminEmails();
    fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Invest.com.au <system@invest.com.au>",
        to: adminEmails[0],
        subject: `Deal Updated: ${broker.slug}`,
        html: `<p><strong>${broker.slug}</strong> updated their deal (self-service):</p><p style="padding:12px;background:#f1f5f9;border-radius:8px;font-size:14px">${deal_text?.trim()}</p><p style="color:#64748b;font-size:12px">Expires: ${deal_expiry || "No expiry"} · Category: ${deal_category || "None"}</p>`,
      }),
    }).catch(err => log.error("Deal notification failed", { error: String(err) }));
  }

  return NextResponse.json({ success: true });
}
