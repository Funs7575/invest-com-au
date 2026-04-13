import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import {
  brokerWelcomeEmail,
  setupGuideEmail,
  firstCampaignTipsEmail,
  checkInEmail,
} from "@/lib/email-templates";
import { requireCronAuth } from "@/lib/cron-auth";

export const runtime = "edge";
export const maxDuration = 60;

/**
 * Cron: Welcome drip email series for broker onboarding.
 *
 * Runs daily. Sends a 4-email sequence to newly registered brokers:
 *   1. Welcome (Day 0)        — Immediate welcome + quick-start checklist
 *   2. Setup Guide (Day 2)    — Personalized checklist based on progress
 *   3. Campaign Tips (Day 5)  — Best practices for first campaign
 *   4. Check-In (Day 10)      — Progress check / help offer
 *
 * Only processes brokers registered within the last 15 days.
 * Each email is sent at most once per broker (tracked via broker_notifications).
 */
export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();

  const now = new Date();
  const fifteenDaysAgo = new Date(now.getTime() - 15 * 86400000).toISOString();

  const results: { broker_slug: string; action: string; detail: string }[] = [];
  let emailsSent = 0;
  let skipped = 0;
  let errors = 0;

  // ── 1. Fetch recently registered active brokers ──
  const { data: brokers, error: brokerErr } = await supabase
    .from("broker_accounts")
    .select("broker_slug, email, full_name, company_name, created_at")
    .eq("status", "active")
    .gte("created_at", fifteenDaysAgo);

  if (brokerErr || !brokers || brokers.length === 0) {
    return NextResponse.json({
      emails_sent: 0,
      skipped: 0,
      errors: 0,
      results: [],
      message: brokerErr ? brokerErr.message : "No recently registered brokers found",
      timestamp: now.toISOString(),
    });
  }

  // ── 2. Process each broker ──
  for (const broker of brokers) {
    if (!broker.email) {
      results.push({
        broker_slug: broker.broker_slug,
        action: "skipped",
        detail: "No email address on account",
      });
      skipped++;
      continue;
    }

    const createdAt = new Date(broker.created_at);
    const daysSinceRegistration = Math.floor(
      (now.getTime() - createdAt.getTime()) / 86400000
    );
    const brokerName = broker.full_name || broker.company_name || broker.broker_slug;
    const companyName = broker.company_name || broker.broker_slug;

    // ── 2a. Fetch existing drip notifications for this broker ──
    const { data: sentDrips } = await supabase
      .from("broker_notifications")
      .select("type")
      .eq("broker_slug", broker.broker_slug)
      .in("type", [
        "welcome_drip_1",
        "welcome_drip_2",
        "welcome_drip_3",
        "welcome_drip_4",
      ]);

    const sentTypes = new Set((sentDrips || []).map((d) => d.type));

    // ── 2b. Determine which emails to send ──
    const dripSchedule: {
      type: string;
      minDays: number;
      subject: string;
      buildHtml: () => Promise<string>;
    }[] = [
      {
        type: "welcome_drip_1",
        minDays: 0,
        subject: `Welcome to the Invest.com.au Partner Portal, ${brokerName}!`,
        buildHtml: async () => brokerWelcomeEmail(brokerName, companyName),
      },
      {
        type: "welcome_drip_2",
        minDays: 2,
        subject: `${brokerName}, here's your setup checklist`,
        buildHtml: async () => {
          // Check wallet status
          const { data: wallet } = await supabase
            .from("broker_wallets")
            .select("balance_cents")
            .eq("broker_slug", broker.broker_slug)
            .maybeSingle();
          const hasWallet = !!(wallet && wallet.balance_cents > 0);

          // Check campaign status
          const { count: campaignCount } = await supabase
            .from("campaigns")
            .select("id", { count: "exact", head: true })
            .eq("broker_slug", broker.broker_slug);
          const hasCampaign = (campaignCount || 0) > 0;

          // Check creative status
          const { count: creativeCount } = await supabase
            .from("broker_creatives")
            .select("id", { count: "exact", head: true })
            .eq("broker_slug", broker.broker_slug);
          const hasCreative = (creativeCount || 0) > 0;

          return setupGuideEmail(brokerName, companyName, hasWallet, hasCampaign, hasCreative);
        },
      },
      {
        type: "welcome_drip_3",
        minDays: 5,
        subject: "3 tips for a successful first campaign",
        buildHtml: async () => firstCampaignTipsEmail(brokerName, companyName),
      },
      {
        type: "welcome_drip_4",
        minDays: 10,
        subject: `${brokerName}, checking in on your progress`,
        buildHtml: async () => {
          // Check if broker has an active campaign
          const { count: activeCount } = await supabase
            .from("campaigns")
            .select("id", { count: "exact", head: true })
            .eq("broker_slug", broker.broker_slug)
            .in("status", ["active", "approved"]);
          const hasActiveCampaign = (activeCount || 0) > 0;

          return checkInEmail(brokerName, companyName, hasActiveCampaign);
        },
      },
    ];

    for (const drip of dripSchedule) {
      // Skip if already sent
      if (sentTypes.has(drip.type)) {
        continue;
      }

      // Skip if not enough days have passed
      if (daysSinceRegistration < drip.minDays) {
        continue;
      }

      // Build the email HTML (may involve additional DB queries)
      let html: string;
      try {
        html = await drip.buildHtml();
      } catch (buildErr) {
        results.push({
          broker_slug: broker.broker_slug,
          action: "error",
          detail: `Failed to build ${drip.type}: ${buildErr instanceof Error ? buildErr.message : "Unknown error"}`,
        });
        errors++;
        continue;
      }

      // Send email via Resend
      let emailSent = false;
      if (process.env.RESEND_API_KEY) {
        try {
          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Invest.com.au <partners@invest.com.au>",
              to: [broker.email],
              subject: drip.subject,
              html,
            }),
          });

          if (res.ok) {
            emailSent = true;
          } else {
            const errBody = await res.text().catch(() => "Unknown error");
            results.push({
              broker_slug: broker.broker_slug,
              action: "email_error",
              detail: `${drip.type}: Resend API ${res.status} — ${errBody}`,
            });
            errors++;
          }
        } catch (fetchErr) {
          results.push({
            broker_slug: broker.broker_slug,
            action: "email_error",
            detail: `${drip.type}: ${fetchErr instanceof Error ? fetchErr.message : "Fetch failed"}`,
          });
          errors++;
        }
      }

      // Record notification regardless of email success (prevents re-sends)
      const dripNumber = drip.type.replace("welcome_drip_", "");
      const titleMap: Record<string, string> = {
        "1": "Welcome to Invest.com.au",
        "2": "Your Setup Checklist",
        "3": "Tips for Your First Campaign",
        "4": "10-Day Check-In",
      };

      const { error: insertErr } = await supabase
        .from("broker_notifications")
        .insert({
          broker_slug: broker.broker_slug,
          type: drip.type,
          title: titleMap[dripNumber] || `Welcome Drip ${dripNumber}`,
          message: `Onboarding email ${dripNumber} of 4 sent to ${broker.email}.`,
          link: "/broker-portal",
          is_read: false,
          email_sent: emailSent,
        });

      if (insertErr) {
        results.push({
          broker_slug: broker.broker_slug,
          action: "notification_error",
          detail: `${drip.type}: Failed to insert notification — ${insertErr.message}`,
        });
        errors++;
        continue;
      }

      if (emailSent) {
        emailsSent++;
      }

      results.push({
        broker_slug: broker.broker_slug,
        action: emailSent ? "sent" : "recorded",
        detail: `${drip.type} (day ${daysSinceRegistration})${emailSent ? "" : " — email skipped (no API key or send failed)"}`,
      });

      // Only send one drip email per broker per cron run to avoid flooding
      break;
    }
  }

  return NextResponse.json({
    emails_sent: emailsSent,
    skipped,
    errors,
    brokers_processed: brokers.length,
    results,
    timestamp: now.toISOString(),
  });
}
