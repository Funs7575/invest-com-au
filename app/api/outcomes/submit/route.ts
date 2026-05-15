import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { submitOutcome, type OutcomeStatus } from "@/lib/outcomes";
import { settleSuccessCharge } from "@/lib/briefs/pricing-tier";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("api:outcomes:submit");

const Body = z.object({
  token: z.string().min(16).max(80),
  outcome: z.enum([
    "completed",
    "in_progress",
    "switched_providers",
    "abandoned",
  ]),
  rating: z.number().int().min(1).max(5).nullable().optional(),
  testimonial: z.string().max(2000).nullable().optional(),
  show_testimonial: z.boolean().optional(),
});

export async function POST(request: NextRequest) {
  try {
    if (
      !(await isAllowed("outcomes_submit", ipKey(request), {
        max: 10,
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

    const row = await submitOutcome({
      token: parsed.data.token,
      outcome: parsed.data.outcome as OutcomeStatus,
      rating: parsed.data.rating ?? null,
      testimonial: parsed.data.testimonial ?? null,
      showTestimonial: parsed.data.show_testimonial ?? false,
    });

    if (!row) {
      return NextResponse.json(
        { error: "Outcome link is invalid or expired." },
        { status: 404 },
      );
    }

    log.info("Outcome submitted", { briefId: row.brief_id, outcome: row.outcome });

    // Outcome-based pricing tier: when the consumer confirms 'completed' and
    // the pro accepted on the success_only tier, settle the deferred charge.
    // Fire-and-forget — failures are logged but the consumer's review still
    // counts as submitted (idempotent ledger triple prevents double-charging
    // on retry).
    if (row.outcome === "completed" && row.professional_id) {
      try {
        const admin = createAdminClient();
        const { data: brief } = await admin
          .from("advisor_auctions")
          .select("accept_credits_cost")
          .eq("id", row.brief_id)
          .maybeSingle();
        const standardCredits = (brief?.accept_credits_cost as number | null) ?? 2;
        const settle = await settleSuccessCharge({
          briefId: row.brief_id,
          professionalId: row.professional_id,
          standardCredits,
        });
        if (settle.charged) {
          log.info("success-tier charge settled", {
            briefId: row.brief_id,
            cents: settle.amountCents,
          });
        }
      } catch (settleErr) {
        log.error("success-tier settle threw (outcome still saved)", {
          briefId: row.brief_id,
          err: settleErr instanceof Error ? settleErr.message : String(settleErr),
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    log.error("outcomes/submit error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to submit." }, { status: 500 });
  }
}
