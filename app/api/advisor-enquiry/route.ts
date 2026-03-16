import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";
import { notificationFooter } from "@/lib/email-templates";
import { getSiteUrl } from "@/lib/url";
import { isValidEmail, isDisposableEmail } from "@/lib/validate-email";
import { isValidAuPhone } from "@/lib/validate-phone";

// Format qualification data as HTML table rows for the advisor notification email
function buildQualificationEmailRows(qd: { source: string; data: Record<string, unknown> }): string {
  const data = qd.data;
  if (!data || Object.keys(data).length === 0) return "";

  const LABEL_MAP: Record<string, string> = {
    advisor_type: "Service Needed",
    need: "Category",
    amount: "Value Range",
    urgency: "Urgency",
    state: "Location",
    balance: "Savings Balance",
    current_rate: "Current Rate",
    income: "Income",
    deposit: "Deposit",
    borrowing_amount: "Borrowing Amount",
    target_suburb: "Target Area",
    current_broker: "Current Broker",
    trades_per_year: "Trades/Year",
    avg_trade_size: "Avg Trade Size",
    us_allocation_pct: "US Allocation",
    potential_savings: "Potential Savings",
    cheapest_broker: "Best-Fit Platform",
    top_match: "Quiz Top Match",
    results_count: "Results Count",
    max_extra_interest: "Extra Interest Potential",
    top_account: "Top Account",
    annual_fees: "Annual Fees",
  };

  const VALUE_MAP: Record<string, Record<string, string>> = {
    amount: { small: "Under $50,000", medium: "$50k – $200k", large: "$200k – $500k", whale: "Over $500,000", unsure: "Not sure yet" },
    urgency: { urgent: "This week", soon: "Within a month", exploring: "Just exploring" },
    state: { NSW: "New South Wales", VIC: "Victoria", QLD: "Queensland", WA: "Western Australia", SA: "South Australia", other: "TAS/ACT/NT", any: "Remote/Online" },
  };

  const formatValue = (key: string, val: unknown): string => {
    if (val === null || val === undefined) return "—";
    // Check mapped values
    if (VALUE_MAP[key] && typeof val === "string" && VALUE_MAP[key][val]) return VALUE_MAP[key][val];
    // Format currency-like numbers
    if (typeof val === "number") {
      if (key.includes("balance") || key.includes("income") || key.includes("deposit") || key.includes("borrowing") || key.includes("savings") || key.includes("fees") || key.includes("trade_size") || key.includes("interest")) {
        return `$${val.toLocaleString("en-AU")}`;
      }
      if (key.includes("rate") || key.includes("pct") || key.includes("allocation")) return `${val}%`;
      return String(val);
    }
    if (Array.isArray(val)) return val.join(", ");
    return String(val);
  };

  // Filter out internal/unneeded fields
  const skipKeys = new Set(["captured_at", "question_labels", "answers", "holdings"]);
  const rows = Object.entries(data)
    .filter(([k, v]) => !skipKeys.has(k) && v !== null && v !== undefined)
    .map(([k, v]) => {
      const label = LABEL_MAP[k] || k.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
      return `<tr><td style="padding: 6px 0; font-size: 13px; color: #64748b; width: 120px;">${label}</td><td style="padding: 6px 0; font-size: 14px; font-weight: 600;">${formatValue(k, v)}</td></tr>`;
    })
    .join("");

  if (!rows) return "";

  const sourceLabel = qd.source.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  return `
    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
      <p style="margin: 0 0 8px; font-size: 12px; font-weight: 700; color: #1e40af; text-transform: uppercase; letter-spacing: 0.5px;">Qualification Data (via ${sourceLabel})</p>
      <table style="width: 100%; border-collapse: collapse; background: #eff6ff; border-radius: 8px; padding: 8px;">
        ${rows}
      </table>
    </div>
  `;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting (DB-backed, survives serverless cold starts)
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    if (await isRateLimited(`enquiry:${ip}`, 10, 60)) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const body = await request.json();
    const { professional_id, user_name, user_email, user_phone, message, source_page } = body;

    // Honeypot: bots fill hidden fields that real users never see
    if (body.website || body.fax || body.company_url) {
      // Silent reject — return fake success so bots don't retry
      return NextResponse.json({ success: true, lead_id: null });
    }

    // Validation
    if (!professional_id || !user_name?.trim() || !user_email?.trim()) {
      return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
    }

    // Email format validation (shared RFC 5322 regex)
    if (!isValidEmail(user_email)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    // Reject disposable/throwaway email domains — advisors pay per lead
    if (isDisposableEmail(user_email)) {
      return NextResponse.json({ error: "Please use a real email address." }, { status: 400 });
    }

    const supabase = await createClient();

    // Verify the professional exists and is active
    const { data: pro, error: proError } = await supabase
      .from("professionals")
      .select("id, name, email, firm_name, type")
      .eq("id", professional_id)
      .eq("status", "active")
      .single();

    if (proError || !pro) {
      return NextResponse.json({ error: "Advisor not found." }, { status: 404 });
    }

    // ── Duplicate Lead Protection ──
    // Prevent the same email from enquiring to the same advisor within 24 hours
    const normalizedEmail = user_email.trim().toLowerCase();
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existingLead } = await supabase
      .from("professional_leads")
      .select("id, created_at")
      .eq("professional_id", professional_id)
      .eq("user_email", normalizedEmail)
      .gte("created_at", twentyFourHoursAgo)
      .limit(1)
      .maybeSingle();

    if (existingLead) {
      // Still return success to the consumer (don't reveal duplicate detection)
      // but don't create a new lead or bill the advisor
      return NextResponse.json({ success: true, lead_id: existingLead.id });
    }

    // Create the lead record
    const { data: lead, error: leadError } = await supabase
      .from("professional_leads")
      .insert({
        professional_id,
        user_name: user_name.trim().replace(/[\r\n]/g, ''),
        user_email: user_email.trim().toLowerCase().replace(/[\r\n]/g, ''),
        user_phone: user_phone?.trim().replace(/[\r\n]/g, '') || null,
        message: message?.trim() || null,
        source_page: source_page || null,
        status: "new",
        utm_source: body.utm_source?.slice(0, 100) || null,
        utm_campaign: body.utm_campaign?.slice(0, 200) || null,
      })
      .select()
      .single();

    if (leadError) {
      console.error("Failed to create lead:", leadError);
      return NextResponse.json({ error: "Failed to submit enquiry." }, { status: 500 });
    }

    // ── Lead Quality Scoring ──
    // Score based on engagement signals sent from the client
    const signals: Record<string, unknown> = {};
    let score = 0;

    // Has a valid Australian phone number (+20 — serious enquiry)
    // Requires valid AU format to prevent fake/junk phones from inflating quality score
    const hasValidPhone = isValidAuPhone(user_phone || "");
    if (hasValidPhone) { score += 20; signals.has_phone = true; }
    // Wrote a message (+15 — engaged)
    if (message?.trim() && message.trim().length > 30) { score += 15; signals.has_message = true; }
    // Came from a specific page (+10 — was researching)
    if (source_page && source_page !== "/advisors") { score += 10; signals.specific_page = source_page; }
    // Has UTM source (+5 — came from marketing)
    if (body.utm_source) { score += 5; signals.utm = body.utm_source; }
    // Client-side signals (pages visited, quiz taken, calculator used)
    if (body.pages_visited && body.pages_visited > 3) { score += 15; signals.pages_visited = body.pages_visited; }
    if (body.quiz_completed) { score += 20; signals.quiz_completed = true; }
    if (body.calculator_used) { score += 15; signals.calculator_used = true; }

    // Qualification data from quiz/calculator (structured data, not just booleans)
    const qualificationData = body.qualification_data || null;
    const hasQualificationData = qualificationData && qualificationData.source && qualificationData.data && Object.keys(qualificationData.data).length > 0;
    if (hasQualificationData) {
      score += 25;
      signals.qualification = {
        source: qualificationData.source,
        data: qualificationData.data,
        captured_at: qualificationData.captured_at,
      };
    }

    // Clamp 0-100
    score = Math.min(100, Math.max(0, score));

    // Determine lead tier based on qualification data
    const leadTier = hasQualificationData ? "qualified" : "standard";

    // ── Auto-Billing (prepaid credit model) ──
    // First 2 leads are free (trial), then deduct from credit balance
    const { data: advisor } = await supabase
      .from("professionals")
      .select("free_leads_used, lead_price_cents, credit_balance_cents, lifetime_lead_spend_cents, total_leads, low_credit_alert_sent_at")
      .eq("id", professional_id)
      .single();

    const freeTrialCount = 2; // Default, overridden below if category pricing exists
    const freeUsed = advisor?.free_leads_used || 0;

    // Get category default price if advisor has no custom price
    let categoryPrice = 4900; // ultimate fallback
    let categoryQualifiedPrice = 9800; // fallback: 2x standard
    let categoryFreeLeads = 2;
    if (!advisor?.lead_price_cents) {
      const { data: catPricing } = await supabase
        .from("lead_pricing")
        .select("price_cents, qualified_price_cents, free_trial_leads")
        .eq("advisor_type", pro.type)
        .single();
      if (catPricing) {
        categoryPrice = catPricing.price_cents;
        categoryQualifiedPrice = catPricing.qualified_price_cents || catPricing.price_cents * 2;
        categoryFreeLeads = catPricing.free_trial_leads;
      }
    }

    const isFree = freeUsed < (categoryFreeLeads || freeTrialCount);
    // Use qualified price when lead has qualification data
    const basePriceCents = advisor?.lead_price_cents || categoryPrice;
    const priceCents = isFree ? 0 : (leadTier === "qualified" ? (categoryQualifiedPrice || basePriceCents * 2) : basePriceCents);
    const balance = advisor?.credit_balance_cents || 0;
    const hasSufficientCredit = balance >= priceCents;

    // Update lead with quality score, billing, and qualification data
    await supabase.from("professional_leads").update({
      quality_score: score,
      quality_signals: signals,
      qualification_data: hasQualificationData ? qualificationData : null,
      lead_tier: leadTier,
      billed: !isFree && hasSufficientCredit,
      bill_amount_cents: isFree ? 0 : priceCents,
    }).eq("id", lead.id);

    if (isFree) {
      // Increment free leads counter
      await supabase.from("professionals").update({
        free_leads_used: freeUsed + 1,
      }).eq("id", professional_id);
    } else if (hasSufficientCredit) {
      // Deduct from prepaid credit balance
      await supabase.from("professionals").update({
        credit_balance_cents: balance - priceCents,
        lifetime_lead_spend_cents: (advisor?.lifetime_lead_spend_cents || 0) + priceCents,
      }).eq("id", professional_id);

      // Create billing record (status: paid since deducted from credit)
      await supabase.from("advisor_billing").insert({
        professional_id,
        lead_id: lead.id,
        amount_cents: priceCents,
        description: `Lead: ${user_name.trim()} (quality: ${score}/100) — deducted from credit`,
        status: "paid",
      });
    } else {
      // Insufficient credit — create pending billing record, lead still delivered
      await supabase.from("advisor_billing").insert({
        professional_id,
        lead_id: lead.id,
        amount_cents: priceCents,
        description: `Lead: ${user_name.trim()} (quality: ${score}/100) — insufficient credit`,
        status: "pending",
      });
    }

    // Send notification email to the advisor (if they have an email)
    if (pro.email) {
      try {
        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        const siteUrl = getSiteUrl();
        if (RESEND_API_KEY) {
          // Build qualification data rows for the email
          const qualDataRows = hasQualificationData ? buildQualificationEmailRows(qualificationData) : "";
          const tierBadge = leadTier === "qualified"
            ? `<span style="display: inline-block; padding: 3px 10px; background: #dbeafe; color: #1e40af; border-radius: 20px; font-size: 11px; font-weight: 700; margin-left: 8px;">Qualified Lead</span>`
            : "";

          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
              from: "Invest.com.au <leads@invest.com.au>",
              to: pro.email,
              subject: `${leadTier === "qualified" ? "⭐ Qualified Lead" : "New Enquiry"} from ${user_name.trim()} — Invest.com.au`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background: #0f172a; color: white; padding: 20px 24px; border-radius: 12px 12px 0 0;">
                    <h2 style="margin: 0; font-size: 18px;">New Consultation Request${tierBadge}</h2>
                    <p style="margin: 4px 0 0; opacity: 0.7; font-size: 13px;">via Invest.com.au · Quality Score: ${score}/100</p>
                  </div>
                  <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr><td style="padding: 8px 0; font-size: 13px; color: #64748b; width: 120px;">Name</td><td style="padding: 8px 0; font-size: 14px; font-weight: 600;">${user_name.trim()}</td></tr>
                      <tr><td style="padding: 8px 0; font-size: 13px; color: #64748b;">Email</td><td style="padding: 8px 0; font-size: 14px;"><a href="mailto:${user_email.trim()}" style="color: #2563eb;">${user_email.trim()}</a></td></tr>
                      ${user_phone ? `<tr><td style="padding: 8px 0; font-size: 13px; color: #64748b;">Phone</td><td style="padding: 8px 0; font-size: 14px;"><a href="tel:${user_phone.trim()}" style="color: #2563eb;">${user_phone.trim()}</a></td></tr>` : ""}
                      ${message ? `<tr><td style="padding: 8px 0; font-size: 13px; color: #64748b; vertical-align: top;">Message</td><td style="padding: 8px 0; font-size: 14px; line-height: 1.5;">${message.trim().replace(/\n/g, "<br>")}</td></tr>` : ""}
                    </table>
                    ${qualDataRows}
                    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
                      <a href="mailto:${user_email.trim()}?subject=Re: Your enquiry on Invest.com.au" style="display: inline-block; padding: 10px 24px; background: #0f172a; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">Reply to ${user_name.trim().split(" ")[0]}</a>
                      <a href="${siteUrl}/advisor-portal" style="display: inline-block; margin-left: 8px; padding: 10px 24px; background: #f1f5f9; color: #334155; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">View in Dashboard</a>
                    </div>
                    <p style="margin-top: 16px; font-size: 11px; color: #94a3b8;">This lead was generated via your listing on invest.com.au. We recommend responding within 24 hours for the best chance of conversion.</p>
                  </div>
                </div>
              `,
            }),
          });
        }
      } catch (emailError) {
        // Don't fail the request if email fails — lead is still saved
        console.error("Failed to send advisor notification:", emailError);
      }
    }

    // Send confirmation email to the user
    try {
      const RESEND_API_KEY = process.env.RESEND_API_KEY;
      if (RESEND_API_KEY) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${RESEND_API_KEY}`,
          },
          body: JSON.stringify({
            from: "Invest.com.au <hello@invest.com.au>",
            to: user_email.trim().toLowerCase(),
            subject: `Your enquiry to ${pro.name} — Invest.com.au`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #0f172a;">Enquiry Sent!</h2>
                <p>Hi ${user_name.trim().split(" ")[0]},</p>
                <p>Your consultation request has been sent to <strong>${pro.name}</strong>${pro.firm_name ? ` at ${pro.firm_name}` : ""}. They typically respond within 24 hours.</p>
                <p style="color: #64748b; font-size: 13px;">This is a no-obligation enquiry. You're under no commitment to proceed.</p>
                ${notificationFooter(user_email.trim())}
              </div>
            `,
          }),
        });
      }
    } catch {
      // Don't fail if confirmation email fails
    }

    // Track the event (legacy + funnel event)
    try {
      await supabase.from("analytics_events").insert([
        {
          event_type: "advisor_lead",
          page: source_page || `/advisor/${professional_id}`,
          broker_slug: null,
          metadata: { professional_id, type: pro.type },
        },
        {
          event_type: "advisor_enquiry_submitted",
          page: source_page || `/advisor/${professional_id}`,
          event_data: {
            professional_id,
            advisor_type: pro.type,
            quality_score: score,
            lead_tier: leadTier,
            is_free_lead: isFree,
            has_phone: !!user_phone?.trim(),
            has_message: !!message?.trim(),
            has_qualification_data: hasQualificationData,
          },
        },
      ]);
    } catch {
      // Non-critical
    }

    // ── Update advisor aggregate stats ──
    try {
      await supabase.rpc("increment_advisor_lead_count", { advisor_id: professional_id });
    } catch {
      // Fall back to manual update if RPC doesn't exist
      try {
        await supabase.from("professionals").update({
          last_lead_at: new Date().toISOString(),
          total_leads: (advisor?.total_leads || 0) + 1,
        }).eq("id", professional_id);
      } catch { /* non-critical */ }
    }

    // ── Low Credit Warning Email ──
    if (!isFree && advisor) {
      const newBalance = hasSufficientCredit ? balance - priceCents : balance;
      const lowCreditThreshold = (advisor.lead_price_cents || 4900) * 3; // 3 leads worth
      if (newBalance <= lowCreditThreshold && newBalance > 0) {
        // Send low credit warning if not sent in last 7 days
        const lastAlert = (advisor as Record<string, unknown>).low_credit_alert_sent_at;
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        if (!lastAlert || (lastAlert as string) < sevenDaysAgo) {
          try {
            const RESEND_API_KEY = process.env.RESEND_API_KEY;
            const siteUrl = getSiteUrl();
            if (RESEND_API_KEY && pro.email) {
              await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
                body: JSON.stringify({
                  from: "Invest.com.au <billing@invest.com.au>",
                  to: pro.email,
                  subject: `Low Credit Balance — ${Math.floor(newBalance / 100)} credits remaining`,
                  html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                      <h2 style="color: #0f172a;">Your lead credit balance is running low</h2>
                      <p>Hi ${pro.name.split(" ")[0]},</p>
                      <p>You have <strong>$${(newBalance / 100).toFixed(2)}</strong> remaining in your lead credit balance — enough for approximately ${Math.floor(newBalance / (advisor.lead_price_cents || 4900))} more leads.</p>
                      <p>To ensure you don't miss any enquiries, top up your balance:</p>
                      <a href="${siteUrl}/advisor-portal" style="display: inline-block; padding: 12px 24px; background: #0f172a; color: white; text-decoration: none; border-radius: 8px; font-weight: 600;">Top Up Credits</a>
                      <p style="color: #94a3b8; font-size: 12px; margin-top: 16px;">Leads will still be delivered when your balance reaches $0, but they won't be billed until you top up.</p>
                    </div>
                  `,
                }),
              });
              await supabase.from("professionals").update({ low_credit_alert_sent_at: new Date().toISOString() }).eq("id", professional_id);
            }
          } catch { /* non-critical */ }
        }
      }
    }

    return NextResponse.json({ success: true, lead_id: lead.id });
  } catch (error) {
    console.error("Advisor enquiry error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
