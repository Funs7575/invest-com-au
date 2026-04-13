import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import {
  quizFollowUp1Email,
  quizFollowUp2Email,
  quizFollowUp3Email,
} from "@/lib/email-templates";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";

const log = logger("quiz-followup");

export const runtime = "edge";
export const maxDuration = 60;

/**
 * Cron: Quiz follow-up drip email series.
 *
 * Runs daily at 9am AEST (23:00 UTC). Sends a 3-email sequence to quiz leads:
 *   1. Deep Dive (Day 2)    — Detailed look at their top broker match
 *   2. Comparison (Day 5)   — Side-by-side comparison of top 3 brokers
 *   3. Action (Day 8)       — Final nudge with CTA + deal (if available)
 *
 * Only processes leads from the last 12 days.
 * Each drip is sent at most once per lead (tracked via quiz_follow_ups table).
 * Only one email per lead per cron run to avoid flooding.
 */
export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();

  const now = new Date();
  const twelveDaysAgo = new Date(now.getTime() - 12 * 86400000).toISOString();

  const results: { email: string; action: string; detail: string }[] = [];
  let emailsSent = 0;
  let skipped = 0;
  let errors = 0;

  // ── 1. Fetch quiz leads from the last 12 days ──
  const { data: leads, error: leadsErr } = await supabase
    .from("quiz_leads")
    .select(
      "email, name, experience_level, investment_range, trading_interest, top_match_slug, created_at"
    )
    .gte("created_at", twelveDaysAgo)
    .not("email", "is", null);

  if (leadsErr || !leads || leads.length === 0) {
    log.info("No quiz leads to process", {
      error: leadsErr?.message,
      count: leads?.length ?? 0,
    });
    return NextResponse.json({
      emails_sent: 0,
      skipped: 0,
      errors: 0,
      leads_processed: 0,
      results: [],
      message: leadsErr
        ? leadsErr.message
        : "No recent quiz leads found",
      timestamp: now.toISOString(),
    });
  }

  // ── 2. Process each lead ──
  for (const lead of leads) {
    if (!lead.email) {
      skipped++;
      continue;
    }

    const createdAt = new Date(lead.created_at);
    const daysSinceQuiz = Math.floor(
      (now.getTime() - createdAt.getTime()) / 86400000
    );
    const leadName = lead.name || "there";

    // ── 2a. Fetch already-sent drips for this lead ──
    const { data: sentDrips } = await supabase
      .from("quiz_follow_ups")
      .select("drip_type")
      .eq("email", lead.email);

    const sentTypes = new Set((sentDrips || []).map((d) => d.drip_type));

    // ── 2b. Build drip schedule ──
    const dripSchedule: {
      type: string;
      minDays: number;
      subject: string;
      buildHtml: () => Promise<string>;
    }[] = [
      {
        type: "quiz_followup_1",
        minDays: 2,
        subject: `${leadName}, here's a deeper look at your top broker match`,
        buildHtml: async () => {
          if (!lead.top_match_slug) {
            throw new Error("No top_match_slug for lead");
          }

          const { data: broker } = await supabase
            .from("brokers")
            .select(
              "name, slug, rating, asx_fee, us_fee, chess_sponsored, pros, tagline"
            )
            .eq("slug", lead.top_match_slug)
            .eq("status", "active")
            .maybeSingle();

          if (!broker) {
            throw new Error(
              `Broker not found: ${lead.top_match_slug}`
            );
          }

          // Parse pros — could be JSON array or null
          let prosArray: string[] = [];
          if (broker.pros) {
            try {
              prosArray = Array.isArray(broker.pros)
                ? broker.pros
                : JSON.parse(broker.pros as string);
            } catch {
              prosArray = [];
            }
          }

          // Build the subject with actual broker name
          dripSchedule[0].subject = `${leadName}, here's a deeper look at ${broker.name}`;

          return quizFollowUp1Email(
            leadName,
            {
              name: broker.name,
              slug: broker.slug,
              rating: broker.rating ?? undefined,
              asx_fee: broker.asx_fee ?? undefined,
              us_fee: broker.us_fee ?? undefined,
              chess_sponsored: broker.chess_sponsored ?? undefined,
              pros: prosArray,
              tagline: broker.tagline ?? undefined,
            },
            lead.experience_level,
            lead.investment_range
          );
        },
      },
      {
        type: "quiz_followup_2",
        minDays: 5,
        subject: `How does your top broker compare? See the top 3 side-by-side`,
        buildHtml: async () => {
          // Fetch top match broker
          const topSlug = lead.top_match_slug;
          const brokersList: {
            name: string;
            slug: string;
            rating?: number;
            asx_fee?: string;
            us_fee?: string;
          }[] = [];

          if (topSlug) {
            const { data: topBroker } = await supabase
              .from("brokers")
              .select("name, slug, rating, asx_fee, us_fee")
              .eq("slug", topSlug)
              .eq("status", "active")
              .maybeSingle();

            if (topBroker) {
              brokersList.push({
                name: topBroker.name,
                slug: topBroker.slug,
                rating: topBroker.rating ?? undefined,
                asx_fee: topBroker.asx_fee ?? undefined,
                us_fee: topBroker.us_fee ?? undefined,
              });

              // Update subject with actual broker name
              dripSchedule[1].subject = `How does ${topBroker.name} compare? See the top 3 side-by-side`;
            }
          }

          // Fetch runner-ups (next 2 by rating, excluding top match)
          const { data: runnerUps } = await supabase
            .from("brokers")
            .select("name, slug, rating, asx_fee, us_fee")
            .eq("status", "active")
            .neq("slug", topSlug || "")
            .order("rating", { ascending: false })
            .limit(2);

          if (runnerUps) {
            for (const r of runnerUps) {
              brokersList.push({
                name: r.name,
                slug: r.slug,
                rating: r.rating ?? undefined,
                asx_fee: r.asx_fee ?? undefined,
                us_fee: r.us_fee ?? undefined,
              });
            }
          }

          if (brokersList.length === 0) {
            throw new Error("No brokers found for comparison");
          }

          return quizFollowUp2Email(
            leadName,
            brokersList,
            lead.trading_interest
          );
        },
      },
      {
        type: "quiz_followup_3",
        minDays: 8,
        subject: `Ready to start investing, ${leadName}? Here's your next step`,
        buildHtml: async () => {
          if (!lead.top_match_slug) {
            throw new Error("No top_match_slug for lead");
          }

          const { data: broker } = await supabase
            .from("brokers")
            .select(
              "name, slug, affiliate_url, deal_text, deal, deal_expiry"
            )
            .eq("slug", lead.top_match_slug)
            .eq("status", "active")
            .maybeSingle();

          if (!broker) {
            throw new Error(
              `Broker not found: ${lead.top_match_slug}`
            );
          }

          // Determine if deal is currently active
          const hasActiveDeal =
            broker.deal === true &&
            !!broker.deal_text &&
            (!broker.deal_expiry ||
              new Date(broker.deal_expiry) > now);

          // Update subject with name
          dripSchedule[2].subject = `Ready to start investing, ${leadName}? Here's your next step`;

          return quizFollowUp3Email(
            leadName,
            {
              name: broker.name,
              slug: broker.slug,
              affiliate_url: broker.affiliate_url ?? undefined,
              deal_text: broker.deal_text ?? undefined,
            },
            hasActiveDeal
          );
        },
      },
    ];

    // ── 2c. Send the first eligible drip ──
    let sentOneThisRun = false;

    for (const drip of dripSchedule) {
      // Skip if already sent
      if (sentTypes.has(drip.type)) {
        continue;
      }

      // Skip if not enough days have passed
      if (daysSinceQuiz < drip.minDays) {
        continue;
      }

      // Skip leads without a top match for email 1 and 3
      if (
        (drip.type === "quiz_followup_1" ||
          drip.type === "quiz_followup_3") &&
        !lead.top_match_slug
      ) {
        results.push({
          email: lead.email,
          action: "skipped",
          detail: `${drip.type}: No top_match_slug`,
        });
        skipped++;
        continue;
      }

      // Build the email HTML
      let html: string;
      try {
        html = await drip.buildHtml();
      } catch (buildErr) {
        results.push({
          email: lead.email,
          action: "error",
          detail: `Failed to build ${drip.type}: ${buildErr instanceof Error ? buildErr.message : "Unknown error"}`,
        });
        errors++;
        continue;
      }

      // Send email via Resend
      let emailSentOk = false;
      if (process.env.RESEND_API_KEY) {
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Invest.com.au <fees@invest.com.au>",
              to: [lead.email],
              subject: drip.subject,
              html,
            }),
          });

          if (res.ok) {
            emailSentOk = true;
          } else {
            const errBody = await res.text().catch(() => "Unknown error");
            log.error("Resend API error", {
              type: drip.type,
              email: lead.email,
              status: res.status,
              body: errBody,
            });
            results.push({
              email: lead.email,
              action: "email_error",
              detail: `${drip.type}: Resend API ${res.status} — ${errBody}`,
            });
            errors++;
          }
        } catch (fetchErr) {
          log.error("Resend fetch failed", {
            type: drip.type,
            email: lead.email,
            error:
              fetchErr instanceof Error
                ? fetchErr.message
                : "Fetch failed",
          });
          results.push({
            email: lead.email,
            action: "email_error",
            detail: `${drip.type}: ${fetchErr instanceof Error ? fetchErr.message : "Fetch failed"}`,
          });
          errors++;
        }
      }

      // Record in quiz_follow_ups (prevents re-sends even if email failed)
      const { error: insertErr } = await supabase
        .from("quiz_follow_ups")
        .insert({
          email: lead.email,
          drip_type: drip.type,
          email_sent: emailSentOk,
        });

      if (insertErr) {
        // If it's a unique constraint violation, the email was already recorded
        if (insertErr.code === "23505") {
          results.push({
            email: lead.email,
            action: "skipped",
            detail: `${drip.type}: Already recorded (duplicate)`,
          });
          skipped++;
        } else {
          log.error("Failed to insert quiz_follow_ups record", {
            type: drip.type,
            email: lead.email,
            error: insertErr.message,
          });
          results.push({
            email: lead.email,
            action: "db_error",
            detail: `${drip.type}: ${insertErr.message}`,
          });
          errors++;
        }
        continue;
      }

      if (emailSentOk) {
        emailsSent++;
      }

      results.push({
        email: lead.email,
        action: emailSentOk ? "sent" : "recorded",
        detail: `${drip.type} (day ${daysSinceQuiz})${emailSentOk ? "" : " — email skipped (no API key or send failed)"}`,
      });

      sentOneThisRun = true;

      // Only send one drip email per lead per cron run
      break;
    }

    if (!sentOneThisRun && !results.some((r) => r.email === lead.email)) {
      results.push({
        email: lead.email,
        action: "skipped",
        detail: `All drips sent or not yet eligible (day ${daysSinceQuiz})`,
      });
      skipped++;
    }
  }

  log.info("Quiz follow-up cron complete", {
    emails_sent: emailsSent,
    skipped,
    errors,
    leads_processed: leads.length,
  });

  return NextResponse.json({
    emails_sent: emailsSent,
    skipped,
    errors,
    leads_processed: leads.length,
    results,
    timestamp: now.toISOString(),
  });
}
