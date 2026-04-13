import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";
import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { requireCronAuth } from "@/lib/cron-auth";

const log = logger("personalized-digest");

export const maxDuration = 60;

/**
 * Cron: Weekly Personalized Performance Digest — runs Monday 8am AEST.
 *
 * For each user with weekly_digest enabled:
 * 1. Fetch their profile (interests, shortlist, preferred broker)
 * 2. Build a personalized email with shortlisted broker updates, interest-based news,
 *    watchlist summary, and a personalized broker recommendation
 * 3. Send via Resend, track in digest_sends to prevent duplicates
 */
export async function GET(req: NextRequest) {
  const unauth = requireCronAuth(req);
  if (unauth) return unauth;

  const supabase = createAdminClient();
  const now = new Date();
  const digestDate = now.toISOString().slice(0, 10);
  const weekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
  const dateStr = now.toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://invest.com.au";

  // ── 1. Fetch all users with weekly_digest enabled ──
  const { data: digestUsers, error: prefError } = await supabase
    .from("notification_preferences")
    .select("user_id")
    .eq("weekly_digest", true);

  if (prefError) {
    log.error("Failed to fetch digest preferences", { error: prefError.message });
    return NextResponse.json({ error: prefError.message }, { status: 500 });
  }

  if (!digestUsers || digestUsers.length === 0) {
    return NextResponse.json({ sent: 0, message: "No users with weekly digest enabled" });
  }

  const userIds = digestUsers.map((u) => u.user_id);

  // ── 2. Check which users already received this digest ──
  const { data: alreadySent } = await supabase
    .from("digest_sends")
    .select("user_id")
    .eq("digest_date", digestDate);

  const sentSet = new Set((alreadySent || []).map((s) => s.user_id));
  const pendingUserIds = userIds.filter((id) => !sentSet.has(id));

  if (pendingUserIds.length === 0) {
    return NextResponse.json({ sent: 0, message: "All users already received this digest" });
  }

  // ── 3. Fetch user profiles ──
  const { data: profiles } = await supabase
    .from("user_profiles")
    .select("id, email, display_name, interested_in, preferred_broker, investing_experience")
    .in("id", pendingUserIds);

  // ── 4. Fetch user auth emails for those without profile emails ──
  const { data: authUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const authEmailMap = new Map<string, string>();
  if (authUsers?.users) {
    for (const u of authUsers.users) {
      if (u.email) authEmailMap.set(u.id, u.email);
    }
  }

  // ── 5. Fetch global data for the week ──
  const { data: feeChanges } = await supabase
    .from("broker_data_changes")
    .select("broker_slug, field_name, old_value, new_value, changed_at")
    .gte("changed_at", weekAgo)
    .order("changed_at", { ascending: false })
    .limit(50);

  const changeSlugs = [...new Set((feeChanges || []).map((c) => c.broker_slug))];
  const { data: brokers } = changeSlugs.length > 0
    ? await supabase.from("brokers").select("slug, name, rating, is_crypto, platform_type, deal, deal_text").in("slug", changeSlugs)
    : { data: [] };
  const brokerMap = new Map((brokers || []).map((b) => [b.slug, b]));

  // Fetch all active brokers for recommendations
  const { data: allBrokers } = await supabase
    .from("brokers")
    .select("slug, name, rating, tagline, is_crypto, platform_type, asx_fee, deal, deal_text")
    .eq("status", "active")
    .order("rating", { ascending: false })
    .limit(20);

  // Fetch new articles from the week
  const { data: weekArticles } = await supabase
    .from("articles")
    .select("title, slug, category, read_time")
    .gte("published_at", weekAgo)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(10);

  // Fetch active deals
  const { data: activeDeals } = await supabase
    .from("brokers")
    .select("name, slug, deal_text, deal_expiry")
    .eq("status", "active")
    .eq("deal", true)
    .not("deal_text", "is", null)
    .order("rating", { ascending: false })
    .limit(5);

  // ── 6. Build and send personalized emails ──
  let sent = 0;
  let errors = 0;
  const batchSize = 5;

  const allProfiles = profiles || [];

  // Include users without profiles (they still want the digest)
  const profileMap = new Map(allProfiles.map((p) => [p.id, p]));
  const usersToProcess = pendingUserIds.slice(0, 100); // Cap at 100 per run

  for (let i = 0; i < usersToProcess.length; i += batchSize) {
    const batch = usersToProcess.slice(i, i + batchSize);

    const results = await Promise.allSettled(
      batch.map(async (userId) => {
        const profile = profileMap.get(userId);
        const email = profile?.email || authEmailMap.get(userId);

        if (!email) {
          log.warn("No email for user, skipping", { userId });
          return;
        }

        const interests = profile?.interested_in || [];
        const preferredBroker = profile?.preferred_broker || null;
        const displayName = profile?.display_name || null;

        // Build personalized sections
        const sections: string[] = [];

        // ── Shortlisted broker updates ──
        const relevantChanges = (feeChanges || []).filter((c) => {
          if (preferredBroker && c.broker_slug === preferredBroker) return true;
          return false;
        });

        let shortlistSection = "";
        if (relevantChanges.length > 0) {
          sections.push("shortlist_updates");
          const rows = relevantChanges.slice(0, 5).map((c) => {
            const broker = brokerMap.get(c.broker_slug);
            const name = broker?.name || c.broker_slug;
            const field = c.field_name.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase());
            return `<tr><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#334155">${name}</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#64748b">${field}</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#dc2626;text-decoration:line-through">${c.old_value || "\u2013"}</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:14px;color:#059669;font-weight:600">${c.new_value || "\u2013"}</td></tr>`;
          }).join("");

          shortlistSection = `
            <div style="margin-bottom:24px">
              <h2 style="font-size:18px;font-weight:700;color:#0f172a;margin:0 0 12px">Your Watchlist This Week</h2>
              <table style="width:100%;border-collapse:collapse;border:1px solid #e2e8f0;border-radius:8px">
                <thead><tr style="background:#f8fafc"><th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600">Broker</th><th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600">Change</th><th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600">Old</th><th style="padding:8px 12px;text-align:left;font-size:12px;color:#64748b;font-weight:600">New</th></tr></thead>
                <tbody>${rows}</tbody>
              </table>
            </div>`;
        }

        // ── Interest-based news ──
        let interestSection = "";
        const relevantArticles = (weekArticles || []).filter((a) => {
          if (interests.includes("crypto") && (a.category?.toLowerCase().includes("crypto") || a.title?.toLowerCase().includes("crypto"))) return true;
          if (interests.includes("shares") && (a.category?.toLowerCase().includes("asx") || a.category?.toLowerCase().includes("shares") || a.title?.toLowerCase().includes("asx"))) return true;
          if (interests.includes("etfs") && (a.title?.toLowerCase().includes("etf") || a.category?.toLowerCase().includes("etf"))) return true;
          return false;
        });

        if (relevantArticles.length > 0) {
          sections.push("interest_news");
          const articleItems = relevantArticles.slice(0, 3).map((a) => {
            return `<li style="margin-bottom:8px"><a href="${baseUrl}/learn/${a.slug}" style="color:#059669;text-decoration:none;font-weight:600">${a.title}</a>${a.read_time ? ` <span style="color:#94a3b8;font-size:12px">(${a.read_time} min read)</span>` : ""}</li>`;
          }).join("");

          interestSection = `
            <div style="margin-bottom:24px">
              <h2 style="font-size:18px;font-weight:700;color:#0f172a;margin:0 0 12px">Based on Your Interests</h2>
              <ul style="padding-left:20px;margin:0">${articleItems}</ul>
            </div>`;
        }

        // ── Active deals ──
        let dealsSection = "";
        if (activeDeals && activeDeals.length > 0) {
          sections.push("deals");
          const dealItems = activeDeals.slice(0, 3).map((d) => {
            const expiry = d.deal_expiry
              ? ` (expires ${new Date(d.deal_expiry).toLocaleDateString("en-AU", { day: "numeric", month: "short" })})`
              : "";
            return `<li style="margin-bottom:8px"><a href="${baseUrl}/broker/${d.slug}" style="color:#059669;text-decoration:none;font-weight:600">${d.name}</a>: ${d.deal_text}${expiry}</li>`;
          }).join("");

          dealsSection = `
            <div style="margin-bottom:24px">
              <h2 style="font-size:18px;font-weight:700;color:#0f172a;margin:0 0 12px">Active Deals</h2>
              <ul style="padding-left:20px;margin:0">${dealItems}</ul>
            </div>`;
        }

        // ── Personalized broker recommendation ──
        let recommendationSection = "";
        if (allBrokers && allBrokers.length > 0) {
          sections.push("recommendation");
          // Pick a broker based on interests
          let recommended = allBrokers[0];
          if (interests.includes("crypto")) {
            const cryptoBroker = allBrokers.find((b) => b.is_crypto);
            if (cryptoBroker) recommended = cryptoBroker;
          } else if (interests.includes("shares")) {
            const shareBroker = allBrokers.find((b) => b.platform_type === "broker" && !b.is_crypto);
            if (shareBroker) recommended = shareBroker;
          }

          // Don't recommend the same as preferred
          if (preferredBroker && recommended.slug === preferredBroker && allBrokers.length > 1) {
            recommended = allBrokers.find((b) => b.slug !== preferredBroker) || allBrokers[1];
          }

          recommendationSection = `
            <div style="margin-bottom:24px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px">
              <h2 style="font-size:16px;font-weight:700;color:#0f172a;margin:0 0 8px">Recommended for You</h2>
              <p style="font-size:14px;color:#334155;margin:0 0 4px"><strong>${recommended.name}</strong> ${recommended.rating ? `(${recommended.rating}/5)` : ""}</p>
              ${recommended.tagline ? `<p style="font-size:13px;color:#64748b;margin:0 0 8px">${recommended.tagline}</p>` : ""}
              ${recommended.deal && recommended.deal_text ? `<p style="font-size:13px;color:#059669;font-weight:600;margin:0 0 8px">${recommended.deal_text}</p>` : ""}
              <a href="${baseUrl}/broker/${recommended.slug}" style="display:inline-block;padding:8px 16px;background:#059669;color:white;text-decoration:none;border-radius:6px;font-size:13px;font-weight:600">View Details</a>
            </div>`;
        }

        // ── All fee changes summary ──
        let allChangesSection = "";
        if ((feeChanges || []).length > 0) {
          sections.push("fee_changes");
          const changeCount = (feeChanges || []).length;
          const uniqueBrokers = changeSlugs.length;
          allChangesSection = `
            <div style="margin-bottom:24px">
              <h2 style="font-size:18px;font-weight:700;color:#0f172a;margin:0 0 12px">Market Update</h2>
              <p style="font-size:14px;color:#334155;margin:0 0 8px">${changeCount} fee change${changeCount !== 1 ? "s" : ""} across ${uniqueBrokers} broker${uniqueBrokers !== 1 ? "s" : ""} this week.</p>
              <a href="${baseUrl}/fee-tracker" style="color:#059669;text-decoration:none;font-weight:600;font-size:14px">View all changes &rarr;</a>
            </div>`;
        }

        // ── Assemble final email ──
        const greeting = displayName ? `Hi ${displayName},` : "Hi,";
        const unsubscribeUrl = `${baseUrl}/unsubscribe?email=${encodeURIComponent(email)}`;

        const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">
  <div style="max-width:600px;margin:0 auto;padding:24px">
    <div style="text-align:center;margin-bottom:24px">
      <a href="${baseUrl}" style="font-size:20px;font-weight:800;color:#0f172a;text-decoration:none">Invest.com.au</a>
      <p style="font-size:12px;color:#94a3b8;margin:4px 0 0">Your Weekly Digest &mdash; ${dateStr}</p>
    </div>

    <div style="background:white;border:1px solid #e2e8f0;border-radius:12px;padding:24px;margin-bottom:24px">
      <p style="font-size:15px;color:#334155;margin:0 0 16px">${greeting}</p>
      <p style="font-size:14px;color:#64748b;margin:0 0 24px">Here&rsquo;s your personalised weekly update on the Australian investing landscape.</p>

      ${shortlistSection}
      ${interestSection}
      ${allChangesSection}
      ${dealsSection}
      ${recommendationSection}

      <div style="text-align:center;margin-top:24px;padding-top:16px;border-top:1px solid #e2e8f0">
        <a href="${baseUrl}/compare" style="display:inline-block;padding:12px 24px;background:#059669;color:white;text-decoration:none;border-radius:8px;font-size:14px;font-weight:600">Compare Brokers</a>
      </div>
    </div>

    <div style="text-align:center;padding:16px 0">
      <p style="font-size:12px;color:#94a3b8;margin:0 0 8px">You&rsquo;re receiving this because you enabled weekly digests.</p>
      <a href="${unsubscribeUrl}" style="font-size:12px;color:#94a3b8;text-decoration:underline">Unsubscribe</a>
      <span style="color:#cbd5e1;margin:0 8px">|</span>
      <a href="${baseUrl}/account" style="font-size:12px;color:#94a3b8;text-decoration:underline">Manage preferences</a>
    </div>
  </div>
</body>
</html>`;

        // Send email
        const result = await sendEmail({
          to: email,
          subject: `Your Weekly Investing Digest \u2014 ${dateStr}`,
          html,
          from: "Invest.com.au <weekly@invest.com.au>",
        });

        if (!result.ok) {
          throw new Error(result.error || "Email send failed");
        }

        // Track the send
        await supabase.from("digest_sends").insert({
          user_id: userId,
          digest_date: digestDate,
          sections_included: sections,
        });

        return userId;
      })
    );

    for (const r of results) {
      if (r.status === "fulfilled") sent++;
      else {
        errors++;
        log.warn("Digest send failed", { error: r.reason?.message });
      }
    }

    // Brief pause between batches
    if (i + batchSize < usersToProcess.length) {
      await new Promise((resolve) => setTimeout(resolve, 300));
    }
  }

  log.info("Personalized digest complete", { sent, errors, total: usersToProcess.length });

  return NextResponse.json({
    sent,
    errors,
    total_eligible: pendingUserIds.length,
    skipped_already_sent: sentSet.size,
    digest_date: digestDate,
  });
}
