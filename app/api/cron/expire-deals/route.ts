import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
export const maxDuration = 60;

/**
 * Cron: Auto-expire broker deals
 *
 * Runs daily. Checks all brokers where deal=true and deal_expiry < now().
 * Clears the deal flag/text and logs the action to admin_audit_log.
 * Also expires sponsorship tiers where sponsorship_end < now().
 */
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const now = new Date().toISOString();
  const results: { slug: string; type: string; detail: string }[] = [];

  // ── 1. Expire deals where deal_expiry has passed ──
  const { data: expiredDeals, error: dealErr } = await supabase
    .from("brokers")
    .select("id, slug, name, deal_text, deal_expiry")
    .eq("deal", true)
    .not("deal_expiry", "is", null)
    .lt("deal_expiry", now);

  if (dealErr) {
    return NextResponse.json({ error: dealErr.message }, { status: 500 });
  }

  for (const broker of expiredDeals || []) {
    const { error: updateErr } = await supabase
      .from("brokers")
      .update({
        deal: false,
        deal_text: "",
        updated_at: now,
      })
      .eq("id", broker.id);

    if (updateErr) {
      results.push({
        slug: broker.slug,
        type: "deal_expire_error",
        detail: updateErr.message,
      });
      continue;
    }

    // Log to audit trail
    await supabase.from("admin_audit_log").insert({
      action: "auto_expire",
      entity_type: "broker",
      entity_id: String(broker.id),
      entity_name: broker.name,
      details: {
        field: "deal",
        old_deal_text: broker.deal_text,
        deal_expiry: broker.deal_expiry,
        reason: "deal_expiry passed",
      },
      admin_email: "system@cron",
    });

    results.push({
      slug: broker.slug,
      type: "deal_expired",
      detail: `Deal expired (was: ${broker.deal_expiry})`,
    });
  }

  // ── 2. Expire sponsorship tiers where sponsorship_end has passed ──
  const { data: expiredSponsors, error: sponsorErr } = await supabase
    .from("brokers")
    .select("id, slug, name, sponsorship_tier, sponsorship_end")
    .not("sponsorship_tier", "is", null)
    .not("sponsorship_end", "is", null)
    .lt("sponsorship_end", now);

  if (!sponsorErr) {
    for (const broker of expiredSponsors || []) {
      const { error: updateErr } = await supabase
        .from("brokers")
        .update({
          sponsorship_tier: null,
          updated_at: now,
        })
        .eq("id", broker.id);

      if (updateErr) {
        results.push({
          slug: broker.slug,
          type: "sponsor_expire_error",
          detail: updateErr.message,
        });
        continue;
      }

      await supabase.from("admin_audit_log").insert({
        action: "auto_expire",
        entity_type: "broker",
        entity_id: String(broker.id),
        entity_name: broker.name,
        details: {
          field: "sponsorship_tier",
          old_tier: broker.sponsorship_tier,
          sponsorship_end: broker.sponsorship_end,
          reason: "sponsorship_end passed",
        },
        admin_email: "system@cron",
      });

      results.push({
        slug: broker.slug,
        type: "sponsorship_expired",
        detail: `${broker.sponsorship_tier} expired (was: ${broker.sponsorship_end})`,
      });
    }
  }

  // ── 3. Expire Pro deals where end_date has passed ──
  const { data: expiredProDeals, error: proDealsErr } = await supabase
    .from("pro_deals")
    .select("id, broker_slug, title, end_date")
    .eq("status", "active")
    .not("end_date", "is", null)
    .lt("end_date", now);

  if (!proDealsErr) {
    for (const deal of expiredProDeals || []) {
      const { error: updateErr } = await supabase
        .from("pro_deals")
        .update({ status: "expired", updated_at: now })
        .eq("id", deal.id);

      if (updateErr) {
        results.push({
          slug: deal.broker_slug,
          type: "pro_deal_expire_error",
          detail: updateErr.message,
        });
        continue;
      }

      await supabase.from("admin_audit_log").insert({
        action: "auto_expire",
        entity_type: "pro_deal",
        entity_id: String(deal.id),
        entity_name: deal.title,
        details: {
          broker_slug: deal.broker_slug,
          end_date: deal.end_date,
          reason: "end_date passed",
        },
        admin_email: "system@cron",
      });

      results.push({
        slug: deal.broker_slug,
        type: "pro_deal_expired",
        detail: `Pro deal "${deal.title}" expired (was: ${deal.end_date})`,
      });
    }
  }

  // ── 4. Auto-complete marketplace campaigns whose end_date has passed ──
  const today = now.slice(0, 10); // YYYY-MM-DD
  const { data: expiredCampaigns, error: campaignErr } = await supabase
    .from("campaigns")
    .select("id, broker_slug, name, end_date")
    .in("status", ["active", "approved"])
    .not("end_date", "is", null)
    .lt("end_date", today);

  if (!campaignErr) {
    for (const campaign of expiredCampaigns || []) {
      const { error: updateErr } = await supabase
        .from("campaigns")
        .update({ status: "completed", updated_at: now })
        .eq("id", campaign.id);

      if (updateErr) {
        results.push({
          slug: campaign.broker_slug,
          type: "campaign_expire_error",
          detail: updateErr.message,
        });
        continue;
      }

      await supabase.from("admin_audit_log").insert({
        action: "auto_expire",
        entity_type: "campaign",
        entity_id: String(campaign.id),
        entity_name: campaign.name,
        details: {
          broker_slug: campaign.broker_slug,
          end_date: campaign.end_date,
          reason: "campaign end_date passed",
        },
        admin_email: "system@cron",
      });

      results.push({
        slug: campaign.broker_slug,
        type: "campaign_completed",
        detail: `Campaign "${campaign.name}" auto-completed (ended: ${campaign.end_date})`,
      });
    }
  }

  // ── 5. Send alert email if anything expired ──
  if (results.length > 0) {
    await sendExpiryAlert(results);
  }

  return NextResponse.json({
    dealsExpired: results.filter((r) => r.type === "deal_expired").length,
    sponsorsExpired: results.filter((r) => r.type === "sponsorship_expired").length,
    proDealsExpired: results.filter((r) => r.type === "pro_deal_expired").length,
    campaignsCompleted: results.filter((r) => r.type === "campaign_completed").length,
    errors: results.filter((r) => r.type.includes("error")).length,
    results,
    timestamp: now,
  });
}

async function sendExpiryAlert(
  results: { slug: string; type: string; detail: string }[]
): Promise<void> {
  const resendApiKey = process.env.RESEND_API_KEY;
  if (!resendApiKey) return;

  const rows = results
    .map(
      (r) =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-weight:600">${r.slug}</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${r.type}</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0">${r.detail}</td></tr>`
    )
    .join("");

  const html = `
    <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#dc2626;padding:16px 24px;border-radius:8px 8px 0 0">
        <h2 style="color:#fff;margin:0;font-size:18px">⏰ Deals/Sponsorships Auto-Expired</h2>
      </div>
      <div style="background:#fff;padding:20px 24px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
        <p style="color:#475569;font-size:14px">${results.length} item(s) were automatically expired by the daily cron job.</p>
        <table style="width:100%;border-collapse:collapse;font-size:13px">
          <thead><tr style="background:#f8fafc">
            <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #dc2626;color:#dc2626;font-size:11px;text-transform:uppercase">Broker</th>
            <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #dc2626;color:#dc2626;font-size:11px;text-transform:uppercase">Action</th>
            <th style="padding:8px 12px;text-align:left;border-bottom:2px solid #dc2626;color:#dc2626;font-size:11px;text-transform:uppercase">Detail</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="color:#94a3b8;font-size:11px;margin-top:16px">Review in <a href="https://invest.com.au/admin/affiliate-links" style="color:#dc2626">Admin → Affiliate Links</a></p>
      </div>
    </div>`;

  try {
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Invest.com.au <alerts@invest.com.au>",
        to: ["hello@invest.com.au"],
        subject: `⏰ ${results.length} deal(s)/sponsorship(s) auto-expired`,
        html,
      }),
    });
  } catch (err) {
    console.error("Failed to send expiry alert email:", err);
  }
}
