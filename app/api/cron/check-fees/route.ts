import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { getAdminEmail } from "@/lib/admin";

export const runtime = "edge";
export const maxDuration = 60;

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return hash.toString(36);
}

// Extract fee-like patterns from page text
function extractFees(text: string): Record<string, string> {
  const fees: Record<string, string> = {};
  // Common patterns: "$X.XX per trade", "X.XX%", "$0 brokerage"
  const brokerageMatch = text.match(/(?:brokerage|commission|trade fee)[^\d]*(\$[\d,.]+|[\d.]+%)/i);
  if (brokerageMatch) fees.brokerage = brokerageMatch[1];
  const fxMatch = text.match(/(?:fx|foreign exchange|currency)[^\d]*([\d.]+%)/i);
  if (fxMatch) fees.fx_rate = fxMatch[1];
  const inactivityMatch = text.match(/(?:inactivity|inactive)[^\d]*(\$[\d,.]+)/i);
  if (inactivityMatch) fees.inactivity = inactivityMatch[1];
  return fees;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();

  const { data: brokers, error } = await supabase
    .from("brokers")
    .select("id, slug, name, fee_source_url, fee_page_hash, asx_fee, us_fee, fx_rate, inactivity_fee")
    .eq("status", "active");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results: { slug: string; status: string; changed: boolean; fees_extracted?: Record<string, string> }[] = [];
  const changedBrokers: { name: string; slug: string; detail: string }[] = [];

  for (const broker of brokers || []) {
    if (!broker.fee_source_url) {
      await supabase
        .from("brokers")
        .update({ fee_last_checked: new Date().toISOString() })
        .eq("id", broker.id);
      results.push({ slug: broker.slug, status: "no_url", changed: false });
      continue;
    }

    try {
      const resp = await fetch(broker.fee_source_url, {
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "InvestComAu-FeeChecker/1.0" },
      });

      if (!resp.ok) {
        await supabase
          .from("brokers")
          .update({ fee_last_checked: new Date().toISOString() })
          .eq("id", broker.id);
        results.push({ slug: broker.slug, status: `http_${resp.status}`, changed: false });
        continue;
      }

      const text = await resp.text();
      const pageHash = simpleHash(text.slice(0, 10000));
      const changed = broker.fee_page_hash != null && broker.fee_page_hash !== pageHash;
      const extractedFees = extractFees(text);

      await supabase
        .from("brokers")
        .update({
          fee_last_checked: new Date().toISOString(),
          fee_page_hash: pageHash,
        })
        .eq("id", broker.id);

      if (changed) {
        // Log the change
        await supabase.from("broker_data_changes").insert({
          broker_id: broker.id,
          broker_slug: broker.slug,
          field_name: "fee_page",
          old_value: broker.fee_page_hash,
          new_value: pageHash,
          change_type: "update",
          changed_by: "system",
          source: "fee_check",
        });

        // Queue extracted fee changes for admin review
        const feeFieldMap: Record<string, string> = {
          brokerage: "asx_fee",
          us_brokerage: "us_fee",
          fx_rate: "fx_rate",
          inactivity: "inactivity_fee",
        };
        const currentValues: Record<string, string | null> = {
          asx_fee: broker.asx_fee,
          us_fee: broker.us_fee,
          fx_rate: broker.fx_rate != null ? `${broker.fx_rate}%` : null,
          inactivity_fee: broker.inactivity_fee,
        };
        for (const [extractedKey, extractedValue] of Object.entries(extractedFees)) {
          const dbField = feeFieldMap[extractedKey] || extractedKey;
          const currentVal = currentValues[dbField];
          // Only queue if the value actually differs
          if (extractedValue && extractedValue !== currentVal) {
            // ── Sanity checks — reject obviously bad scraper extractions ──
            const numMatch = extractedValue.match(/^([\d.]+)%?$/);
            const numVal = numMatch ? parseFloat(numMatch[1]) : null;

            // FX rates should never be over 5% (scraper picking up random page percentages)
            if (dbField === "fx_rate" && numVal !== null && numVal > 5) continue;
            // Brokerage that was a $ amount shouldn't become a bare percentage
            if ((dbField === "asx_fee" || dbField === "us_fee") && currentVal?.startsWith("$") && !extractedValue.startsWith("$") && numVal !== null && numVal > 1) continue;
            // Values like "80%" or "100%" are page layout noise, not fee data
            if (numVal !== null && numVal >= 50) continue;
            // Skip duplicates — don't queue same broker+field+value if already pending
            const { data: existing } = await supabase
              .from("fee_update_queue")
              .select("id")
              .eq("broker_id", broker.id)
              .eq("field_name", dbField)
              .eq("new_value", extractedValue)
              .eq("status", "pending")
              .maybeSingle();
            if (existing) continue;

            // ── Evaluate auto-rules ──
            const { data: autoRules } = await supabase
              .from("fee_auto_rules")
              .select("id, field_name, condition, action")
              .eq("enabled", true)
              .or(`field_name.eq.*,field_name.eq.${dbField}`);

            let autoAction: string | null = null;
            let matchedRuleId: number | null = null;

            for (const rule of autoRules || []) {
              const oldNum = currentVal ? parseFloat(currentVal.replace(/[^0-9.]/g, "")) : null;
              const newNum = extractedValue ? parseFloat(extractedValue.replace(/[^0-9.]/g, "")) : null;
              let matches = false;

              if (rule.condition === "decrease_only" && oldNum != null && newNum != null && newNum < oldNum) matches = true;
              if (rule.condition === "any_change") matches = true;
              if (rule.condition === "increase_over_20pct" && oldNum != null && newNum != null && oldNum > 0 && (newNum - oldNum) / oldNum > 0.2) matches = true;
              if (rule.condition === "value_over_5pct" && newNum != null && newNum > 5) matches = true;
              if (rule.condition === "lost_dollar_prefix" && currentVal?.startsWith("$") && !extractedValue.startsWith("$")) matches = true;

              if (matches) {
                autoAction = rule.action;
                matchedRuleId = rule.id;
                break;
              }
            }

            if (autoAction === "auto_reject") {
              // Still log it but as auto-rejected
              await supabase.from("fee_update_queue").insert({
                broker_id: broker.id, broker_slug: broker.slug, broker_name: broker.name,
                field_name: dbField, old_value: currentVal, new_value: extractedValue,
                extracted_from: broker.fee_source_url,
                status: "rejected", auto_applied: true, rule_id: matchedRuleId,
                reviewed_by: "auto-rule", reviewed_at: new Date().toISOString(),
              });
              continue;
            }

            if (autoAction === "auto_approve") {
              // Apply the change directly to the broker
              const updateField: Record<string, unknown> = { [dbField]: extractedValue, fee_last_checked: new Date().toISOString() };
              const numericMatch = extractedValue.match(/([\d.]+)/);
              if (numericMatch) {
                const numericFields: Record<string, string> = { asx_fee: "asx_fee_value", us_fee: "us_fee_value", fx_rate: "fx_rate" };
                const numField = numericFields[dbField];
                if (numField && numField !== dbField) updateField[numField] = parseFloat(numericMatch[1]);
              }
              await supabase.from("brokers").update(updateField).eq("id", broker.id);

              // Log as auto-approved
              await supabase.from("fee_update_queue").insert({
                broker_id: broker.id, broker_slug: broker.slug, broker_name: broker.name,
                field_name: dbField, old_value: currentVal, new_value: extractedValue,
                extracted_from: broker.fee_source_url,
                status: "approved", auto_applied: true, rule_id: matchedRuleId,
                reviewed_by: "auto-rule", reviewed_at: new Date().toISOString(),
              });
              continue;
            }

            // No rule matched or flagged urgent — queue for manual review
            await supabase.from("fee_update_queue").insert({
              broker_id: broker.id,
              broker_slug: broker.slug,
              broker_name: broker.name,
              field_name: dbField,
              old_value: currentVal,
              new_value: extractedValue,
              extracted_from: broker.fee_source_url,
              status: "pending",
              priority: autoAction === "flag_urgent" ? "urgent" : "normal",
              rule_id: matchedRuleId,
            });
            // Ignore insert errors for fee queue
          }
        }

        changedBrokers.push({
          name: broker.name,
          slug: broker.slug,
          detail: Object.keys(extractedFees).length > 0 
            ? `Extracted: ${Object.entries(extractedFees).map(([k, v]) => `${k}=${v}`).join(", ")}`
            : "Page content changed — manual review needed",
        });
      }

      results.push({ slug: broker.slug, status: "ok", changed, fees_extracted: extractedFees });
    } catch {
      await supabase
        .from("brokers")
        .update({ fee_last_checked: new Date().toISOString() })
        .eq("id", broker.id);
      results.push({ slug: broker.slug, status: "fetch_error", changed: false });
    }
  }

  // Send admin alert if any fees changed
  if (changedBrokers.length > 0 && process.env.RESEND_API_KEY) {
    const changeList = changedBrokers.map(b => 
      `<tr><td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;font-weight:600">${b.name}</td><td style="padding:6px 12px;border-bottom:1px solid #e2e8f0;font-size:13px;color:#64748b">${b.detail}</td></tr>`
    ).join("");

    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Invest.com.au <system@invest.com.au>",
        to: getAdminEmail(),
        subject: `Fee Alert: ${changedBrokers.length} broker${changedBrokers.length > 1 ? "s" : ""} changed fees`,
        html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto"><div style="background:#0f172a;color:white;padding:16px 20px;border-radius:12px 12px 0 0"><h2 style="margin:0;font-size:16px">Fee Page Changes Detected</h2><p style="margin:4px 0 0;opacity:.7;font-size:12px">${changedBrokers.length} broker${changedBrokers.length > 1 ? "s" : ""} · ${new Date().toLocaleDateString("en-AU")}</p></div><div style="padding:16px 20px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px"><table style="width:100%;border-collapse:collapse">${changeList}</table><p style="margin-top:16px;font-size:12px;color:#94a3b8">Review these changes in <a href="https://invest.com.au/admin" style="color:#2563eb">the admin panel</a>. Fee values may need manual updating.</p></div></div>`,
      }),
    }).catch((err) => console.error("[check-fees] admin alert email failed:", err));

    // Also notify fee alert subscribers
    const { data: subscribers } = await supabase
      .from("fee_alert_subscriptions")
      .select("email")
      .eq("verified", true)
      .eq("frequency", "instant");

    if (subscribers && subscribers.length > 0) {
      const subscriberList = subscribers.map(s => s.email).slice(0, 50); // Cap at 50
      for (const email of subscriberList) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            from: "Invest.com.au <alerts@invest.com.au>",
            to: email,
            subject: `Fee Change: ${changedBrokers.map(b => b.name).join(", ")}`,
            html: `<div style="font-family:Arial,sans-serif;max-width:500px;margin:0 auto"><h2 style="color:#0f172a;font-size:18px">Broker Fee Change Alert</h2><p style="color:#64748b;font-size:14px">The following broker${changedBrokers.length > 1 ? "s have" : " has"} updated their fee page:</p><ul style="color:#334155;font-size:14px">${changedBrokers.map(b => `<li style="margin-bottom:8px"><strong>${b.name}</strong> — <a href="https://invest.com.au/broker/${b.slug}" style="color:#2563eb">View updated fees</a></li>`).join("")}</ul><p style="color:#94a3b8;font-size:12px;margin-top:20px">You received this because you subscribed to fee alerts on Invest.com.au</p></div>`,
          }),
        }).catch((err) => console.error("[check-fees] subscriber alert email failed:", err));
      }
    }
  }

  return NextResponse.json({
    checked: results.length,
    changed: changedBrokers.length,
    changed_brokers: changedBrokers,
    results,
    timestamp: new Date().toISOString(),
  });
}
