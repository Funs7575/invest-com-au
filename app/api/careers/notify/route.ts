/**
 * POST /api/careers/notify
 *
 * Demand-probe endpoint for the public /careers page.
 * Records "notify me when live" sign-ups in newsletter_subscribers
 * with source=advisor_careers. Also writes a revenue_opportunities
 * row on first-ever submission to surface demand signal in the ops queue.
 *
 * Deduplication: upsert on email — re-submitting reactivates without error.
 * Rate limited: 5 submissions per IP per hour.
 * Validation: Zod, email validity + disposable-email guard.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { isValidEmail, isDisposableEmail } from "@/lib/validate-email";
import { logger } from "@/lib/logger";

const log = logger("careers:notify");

export const runtime = "nodejs";

const NotifySchema = z.object({
  email: z.string().min(1, "Email is required.").max(200, "Email too long."),
  name: z.string().max(120, "Name too long.").optional(),
});

export const POST = withValidatedBody(
  NotifySchema,
  async (req: NextRequest, body) => {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    if (await isRateLimited(`careers-notify:${ip}`, 5, 60)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 },
      );
    }

    const email = body.email.trim().toLowerCase();
    const name = body.name?.trim().slice(0, 120) ?? null;

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 },
      );
    }
    if (isDisposableEmail(email)) {
      return NextResponse.json(
        { error: "Please use a real email address." },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();

    // Upsert into newsletter_subscribers — deduped on email unique constraint.
    const { error: subError } = await supabase
      .from("newsletter_subscribers")
      .upsert(
        {
          email,
          name,
          source: "advisor_careers",
          preference: "weekly",
          status: "active",
          subscribed_at: new Date().toISOString(),
          unsubscribed_at: null,
        },
        { onConflict: "email" },
      );

    if (subError) {
      log.error("careers notify: upsert failed", { error: subError.message });
      return NextResponse.json(
        { error: "Failed to register. Please try again." },
        { status: 500 },
      );
    }

    // Surface first-ever submission as a revenue signal so it shows up in
    // the ops queue. Ignore conflicts — we only want one row per probe.
    const { count } = await supabase
      .from("newsletter_subscribers")
      .select("id", { count: "exact", head: true })
      .eq("source", "advisor_careers")
      .eq("status", "active");

    const isFirst = (count ?? 0) <= 1;
    if (isFirst) {
      await supabase.from("revenue_opportunities").upsert(
        {
          opportunity_type: "careers_demand_probe",
          title: "Advisor careers board — first demand signal captured",
          description:
            "First sign-up on /careers 'notify me' captured. Review demand " +
            "count weekly; flip to full jobs board when signal is strong.",
          confidence: "low",
          status: "new",
          surfaced_by_agent: "CO-stream",
          detail: { source: "advisor_careers" },
        },
        {
          onConflict: "opportunity_type,title",
          ignoreDuplicates: true,
        },
      );
    }

    log.info("careers notify: subscriber recorded", { email });
    return NextResponse.json({ ok: true });
  },
);
