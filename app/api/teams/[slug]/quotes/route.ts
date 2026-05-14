import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { createFixedQuote, type ScopeItem } from "@/lib/expert-teams/fixed-quotes";
import { sendEmail } from "@/lib/resend";
import { SITE_URL } from "@/lib/seo";
import { logger } from "@/lib/logger";

const log = logger("api:teams:quotes");

const Body = z.object({
  brief_id: z.number().int().positive(),
  amount_cents: z.number().int().min(0).max(100_000_000),
  scope_items: z
    .array(
      z.object({
        label: z.string().min(1).max(200),
        estimated_hours: z.number().nonnegative().max(2000).optional(),
      }),
    )
    .max(20),
  payment_terms: z.string().max(500).nullable().optional(),
  delivery_days_estimate: z.number().int().min(1).max(365).nullable().optional(),
  /** ISO timestamp; defaults to +14 days if absent. */
  expires_at: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  ctx: { params: Promise<{ slug: string }> },
) {
  try {
    if (
      !(await isAllowed("team_quote_create", ipKey(request), {
        max: 30,
        refillPerSec: 0.5,
      }))
    ) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }
    const advisorId = await requireAdvisorSession(request);
    if (!advisorId) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const { slug } = await ctx.params;
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

    const admin = createAdminClient();
    const { data: team } = await admin
      .from("expert_teams")
      .select("id, name")
      .eq("slug", slug)
      .maybeSingle();
    if (!team) {
      return NextResponse.json({ error: "Squad not found." }, { status: 404 });
    }

    // Verify the calling advisor is an active member of this squad.
    const { data: membership } = await admin
      .from("expert_team_members")
      .select("id")
      .eq("team_id", team.id)
      .eq("professional_id", advisorId)
      .eq("status", "active")
      .maybeSingle();
    if (!membership) {
      return NextResponse.json(
        { error: "You are not an active member of this squad." },
        { status: 403 },
      );
    }

    // Verify the brief is accepted by this team (and not already
    // completed / closed).
    const { data: brief } = await admin
      .from("advisor_auctions")
      .select("id, slug, job_title, contact_email, contact_name, status, accepted_by_team_id")
      .eq("id", parsed.data.brief_id)
      .maybeSingle();
    if (!brief || brief.accepted_by_team_id !== team.id) {
      return NextResponse.json(
        { error: "Brief not found or not accepted by this squad." },
        { status: 404 },
      );
    }
    if (brief.status !== "open") {
      return NextResponse.json(
        { error: "Brief is no longer open." },
        { status: 409 },
      );
    }

    const quote = await createFixedQuote({
      briefId: brief.id as number,
      teamId: team.id as number,
      issuedByProfessionalId: advisorId,
      amountCents: parsed.data.amount_cents,
      scopeItems: parsed.data.scope_items as ScopeItem[],
      paymentTerms: parsed.data.payment_terms ?? null,
      deliveryDaysEstimate: parsed.data.delivery_days_estimate ?? null,
      expiresAtMs: parsed.data.expires_at
        ? new Date(parsed.data.expires_at).getTime()
        : undefined,
    });
    if (!quote) {
      // Most common cause: EXCLUDE constraint blocked a duplicate
      // active quote.
      return NextResponse.json(
        { error: "Could not create quote (another active quote may already exist for this brief)." },
        { status: 409 },
      );
    }

    // Email the consumer the review link.
    if (brief.contact_email) {
      const url = `${SITE_URL}/quote/${quote.review_token}`;
      void sendEmail({
        from: "Invest.com.au <hello@invest.com.au>",
        to: brief.contact_email as string,
        subject: `${team.name} sent you a quote — ${brief.job_title}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#334155;padding:24px">
          <h2 style="color:#0f172a;margin:0 0 8px 0">${team.name} sent you a quote</h2>
          <p style="font-size:14px">For your Match Request: <strong>${brief.job_title}</strong></p>
          <p style="font-size:14px">Review the scope + price + payment terms. You can accept, decline, or ask for a revision.</p>
          <p style="margin:16px 0"><a href="${url}" style="display:inline-block;padding:10px 24px;background:#f59e0b;color:#0f172a;text-decoration:none;border-radius:6px;font-weight:600">Review quote</a></p>
          <p style="font-size:11px;color:#94a3b8">Quote valid until ${new Date(quote.expires_at).toLocaleDateString("en-AU", { dateStyle: "long" })}. General information only — not personal advice.</p>
        </div>`,
      });
    }

    log.info("Fixed quote created", {
      quoteId: quote.id,
      teamId: team.id,
      briefId: brief.id,
      amountCents: quote.amount_cents,
    });
    return NextResponse.json({ quote_id: quote.id, review_token: quote.review_token });
  } catch (err) {
    log.error("create quote error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to create quote." }, { status: 500 });
  }
}
