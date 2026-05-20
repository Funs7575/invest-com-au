import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("startups-round");

const BaseRoundSchema = z.object({
  instrument: z.enum(["safe", "safe_t", "convertible_note", "priced_equity"]),
  target_aud_cents: z.number().int().positive(),
  min_ticket_aud_cents: z.number().int().positive(),
  closes_at: z.string().datetime({ offset: true }).nullable().optional(),
  wholesale_only: z.boolean().default(true),
  lead_investor_name: z.string().max(200).nullable().optional(),
  valuation_cap_aud_cents: z.number().int().positive().nullable().optional(),
  discount_pct: z.number().min(0).max(100).nullable().optional(),
  interest_rate_pct: z.number().min(0).max(100).nullable().optional(),
  maturity_months: z.number().int().min(1).max(120).nullable().optional(),
});

// Per-instrument validation
function validateInstrumentFields(data: z.infer<typeof BaseRoundSchema>): string | null {
  if (data.instrument === "safe" || data.instrument === "safe_t") {
    if (!data.valuation_cap_aud_cents) return "Valuation cap is required for SAFE/SAFE-T rounds.";
    if (data.discount_pct == null) return "Discount % is required for SAFE/SAFE-T rounds.";
  }
  if (data.instrument === "convertible_note") {
    if (data.interest_rate_pct == null) return "Interest rate is required for convertible notes.";
    if (!data.maturity_months) return "Maturity months is required for convertible notes.";
  }
  if (data.instrument === "priced_equity") {
    if (!data.valuation_cap_aud_cents) return "Pre-money valuation is required for priced equity rounds.";
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

    const body: unknown = await request.json();
    const parsed = BaseRoundSchema.safeParse(body);
    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return NextResponse.json({ error: firstError?.message ?? "Invalid round data." }, { status: 400 });
    }

    const fieldError = validateInstrumentFields(parsed.data);
    if (fieldError) return NextResponse.json({ error: fieldError }, { status: 400 });

    // Resolve startup profile via RLS-aware client
    const { data: profile } = await supabase
      .from("startup_profiles")
      .select("id, status")
      .eq("owner_user_id", user.id)
      .in("status", ["active", "draft"])
      .maybeSingle();

    if (!profile) {
      return NextResponse.json({ error: "No startup profile found. Please complete signup first." }, { status: 404 });
    }
    if (profile.status === "draft") {
      return NextResponse.json({ error: "Your startup profile is still under review. Rounds can be opened once approved." }, { status: 403 });
    }

    // Check no existing open round (one active round per startup at a time)
    const { data: existingOpen } = await supabase
      .from("startup_rounds")
      .select("id")
      .eq("startup_id", profile.id)
      .eq("status", "open")
      .maybeSingle();

    if (existingOpen) {
      return NextResponse.json({ error: "You already have an open round. Close or withdraw it before opening a new one." }, { status: 409 });
    }

    const { data: round, error: insertError } = await createAdminClient()
      .from("startup_rounds")
      .insert({
        startup_id: profile.id,
        instrument: parsed.data.instrument,
        status: "open",
        target_aud_cents: parsed.data.target_aud_cents,
        min_ticket_aud_cents: parsed.data.min_ticket_aud_cents,
        closes_at: parsed.data.closes_at ?? null,
        wholesale_only: parsed.data.wholesale_only,
        lead_investor_name: parsed.data.lead_investor_name ?? null,
        valuation_cap_aud_cents: parsed.data.valuation_cap_aud_cents ?? null,
        discount_pct: parsed.data.discount_pct ?? null,
        interest_rate_pct: parsed.data.interest_rate_pct ?? null,
        maturity_months: parsed.data.maturity_months ?? null,
      })
      .select("id")
      .single();

    if (insertError) {
      log.error("Round insert failed", { error: insertError.message, profileId: profile.id });
      return NextResponse.json({ error: "Failed to open round. Please try again." }, { status: 500 });
    }

    log.info("New round opened", { roundId: round.id, profileId: profile.id, instrument: parsed.data.instrument });
    return NextResponse.json({ success: true, roundId: round.id });
  } catch (err) {
    log.error("Round handler error", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "An unexpected error occurred." }, { status: 500 });
  }
}
