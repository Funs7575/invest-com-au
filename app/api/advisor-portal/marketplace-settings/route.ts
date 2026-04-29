import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { QUOTE_ADVISOR_TYPES, QUOTE_AU_STATES, QUOTE_BUDGET_BANDS } from "@/lib/api-schemas";

const log = logger("advisor-marketplace-settings");

const BidTemplateSchema = z.object({
  id: z.string().min(1).max(40),
  label: z.string().min(1).max(80),
  body: z.string().min(1).max(2000),
});

const AlertPrefsSchema = z.object({
  advisor_types: z.array(z.enum(QUOTE_ADVISOR_TYPES)).max(13),
  states: z.array(z.enum(QUOTE_AU_STATES)).max(8),
  budget_bands: z.array(z.enum(QUOTE_BUDGET_BANDS)).max(6),
});

const PatchSchema = z.object({
  accepts_new_clients: z.boolean().optional(),
  bid_templates: z.array(BidTemplateSchema).max(5).optional(),
  alert_preferences: AlertPrefsSchema.optional(),
});

async function loadAdvisor() {
  const supa = await createClient();
  const { data: { user } } = await supa.auth.getUser();
  if (!user?.email) return null;
  const admin = createAdminClient();
  const { data: pro } = await admin
    .from("professionals")
    .select("id, accepts_new_clients, bid_templates, alert_preferences")
    .eq("email", user.email)
    .eq("status", "active")
    .maybeSingle();
  return pro ? { admin, pro } : null;
}

/** GET — returns the current marketplace settings for the authed advisor. */
export async function GET(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (await isRateLimited(`adv-mkt-get:${ip}`, 60, 60)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }
    const ctx = await loadAdvisor();
    if (!ctx) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    return NextResponse.json({
      accepts_new_clients: ctx.pro.accepts_new_clients ?? true,
      bid_templates: ctx.pro.bid_templates ?? [],
      alert_preferences: ctx.pro.alert_preferences ?? { advisor_types: [], states: [], budget_bands: [] },
    });
  } catch (err) {
    log.error("Settings GET error", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to load settings." }, { status: 500 });
  }
}

/** PATCH — updates any subset of marketplace settings. */
export async function PATCH(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (await isRateLimited(`adv-mkt-patch:${ip}`, 30, 60)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }
    const ctx = await loadAdvisor();
    if (!ctx) return NextResponse.json({ error: "Authentication required." }, { status: 401 });

    let raw: unknown;
    try {
      raw = await req.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    const parsed = PatchSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid body." }, { status: 400 });
    }

    const update: Record<string, unknown> = {};
    if (parsed.data.accepts_new_clients !== undefined) update.accepts_new_clients = parsed.data.accepts_new_clients;
    if (parsed.data.bid_templates !== undefined) update.bid_templates = parsed.data.bid_templates;
    if (parsed.data.alert_preferences !== undefined) update.alert_preferences = parsed.data.alert_preferences;
    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "Nothing to update." }, { status: 400 });
    }

    const { error } = await ctx.admin
      .from("professionals")
      .update(update)
      .eq("id", ctx.pro.id);
    if (error) {
      log.error("Settings update failed", { err: error.message });
      return NextResponse.json({ error: "Failed to update." }, { status: 500 });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("Settings PATCH error", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to update." }, { status: 500 });
  }
}
