import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";
import { isValidEmail } from "@/lib/validate-email";
import { logger } from "@/lib/logger";
import { getSiteUrl } from "@/lib/url";
import { notificationFooter } from "@/lib/email-templates";

const log = logger("submit-lead");

// Map find-advisor quiz 'need' keys to professional type slugs
const NEED_TO_TYPE_MAP: Record<string, string> = {
  mortgage: "mortgage_broker",
  buyers: "buyers_agent",
  planning: "financial_planner",
  insurance: "insurance_broker",
  smsf: "smsf_accountant",
  tax: "tax_agent",
  wealth: "wealth_manager",
  estate: "estate_planner",
  property: "property_advisor",
  realestate: "real_estate_agent",
  crypto: "crypto_advisor",
  agedcare: "aged_care_advisor",
  debt: "debt_counsellor",
};

// Human-readable type labels
const TYPE_LABELS: Record<string, string> = {
  mortgage_broker: "Mortgage Broker",
  buyers_agent: "Buyer's Agent",
  financial_planner: "Financial Planner",
  insurance_broker: "Insurance Broker",
  smsf_accountant: "SMSF Accountant",
  tax_agent: "Tax Agent",
  wealth_manager: "Wealth Manager",
  estate_planner: "Estate Planner",
  property_advisor: "Property Advisor",
  real_estate_agent: "Real Estate Agent",
  crypto_advisor: "Crypto Advisor",
  aged_care_advisor: "Aged Care Advisor",
  debt_counsellor: "Debt Counsellor",
};

const STATE_LABELS: Record<string, string> = {
  NSW: "New South Wales",
  VIC: "Victoria",
  QLD: "Queensland",
  WA: "Western Australia",
  SA: "South Australia",
  other: "TAS/ACT/NT",
  any: "Australia-wide",
};

const AMOUNT_LABELS: Record<string, string> = {
  small: "Under $50,000",
  medium: "$50k – $200k",
  large: "$200k – $500k",
  whale: "Over $500,000",
  unsure: "Not sure yet",
};

const URGENCY_LABELS: Record<string, string> = {
  urgent: "This week",
  soon: "Within a month",
  exploring: "Just exploring",
};

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() || "unknown";
    if (await isRateLimited(`submit-lead:${ip}`, 5, 300)) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429 }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { need, amount, urgency, state, firstName, email, phone, consent } = body as {
      need?: string;
      amount?: string;
      urgency?: string;
      state?: string;
      firstName?: string;
      email?: string;
      phone?: string;
      consent?: boolean;
    };

    // Validation
    if (!firstName?.trim()) {
      return NextResponse.json({ error: "First name is required." }, { status: 400 });
    }
    if (!isValidEmail(email as string)) {
      return NextResponse.json({ error: "Valid email address is required." }, { status: 400 });
    }
    if (!consent) {
      return NextResponse.json({ error: "Consent is required." }, { status: 400 });
    }
    if (!need) {
      return NextResponse.json({ error: "Advisor type is required." }, { status: 400 });
    }

    const professionalType = NEED_TO_TYPE_MAP[need];
    if (!professionalType) {
      return NextResponse.json({ error: "Invalid advisor type." }, { status: 400 });
    }

    const supabase = await createClient();

    // Find the best matching professional (verified + active in the right type + state)
    let query = supabase
      .from("professionals")
      .select("id, name, email, firm_name, type, location_state, location_suburb, slug, afsl_number, photo_url, rating, review_count, initial_consultation_free, free_leads_used, lead_price_cents, credit_balance_cents")
      .eq("type", professionalType)
      .eq("status", "active")
      .eq("verified", true);

    // Filter by state if provided (not "any" or "other")
    if (state && state !== "any" && state !== "other") {
      query = query.eq("location_state", state);
    }

    const { data: professionals, error: searchError } = await query
      .order("rating", { ascending: false })
      .order("review_count", { ascending: false })
      .limit(10);

    if (searchError) {
      log.error("Professional search failed", { error: searchError.message });
      return NextResponse.json({ error: "Failed to find matching advisor." }, { status: 500 });
    }

    // Fallback: if no state match, search Australia-wide
    let matched = professionals && professionals.length > 0 ? professionals : null;

    if (!matched || matched.length === 0) {
      const { data: fallbackPros } = await supabase
        .from("professionals")
        .select("id, name, email, firm_name, type, location_state, location_suburb, slug, afsl_number, photo_url, rating, review_count, initial_consultation_free, free_leads_used, lead_price_cents, credit_balance_cents")
        .eq("type", professionalType)
        .eq("status", "active")
        .eq("verified", true)
        .order("rating", { ascending: false })
        .limit(5);

      matched = fallbackPros;
    }

    if (!matched || matched.length === 0) {
      // No matching advisor found — still capture the lead in email_captures
      const normalizedEmail = (email as string).trim().toLowerCase();
      await supabase.from("email_captures").upsert(
        {
          email: normalizedEmail,
          source: "find_advisor_no_match",
          name: (firstName as string).trim(),
          context: { need, amount, urgency, state },
        },
        { onConflict: "email" }
      );

      return NextResponse.json(
        { error: "No matching advisor found. We'll be in touch soon." },
        { status: 404 }
      );
    }

    // Pick the best match (prioritize those with free leads or sufficient credit)
    const pro = matched.find((p: typeof matched[0]) => {
      const freeUsed = p.free_leads_used || 0;
      const balance = p.credit_balance_cents || 0;
      const price = p.lead_price_cents || 4900;
      return freeUsed < 2 || balance >= price;
    }) || matched[0];

    const normalizedEmail = (email as string).trim().toLowerCase();
    const userName = (firstName as string).trim();
    const userPhone = (phone as string | undefined)?.trim() || null;

    // Duplicate lead protection (same email + same pro within 24 hours)
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existingLead } = await supabase
      .from("professional_leads")
      .select("id")
      .eq("professional_id", pro.id)
      .eq("user_email", normalizedEmail)
      .gte("created_at", twentyFourHoursAgo)
      .limit(1)
      .maybeSingle();

    let leadId: number;

    if (existingLead) {
      leadId = existingLead.id;
    } else {
      // Create lead record
      const { data: lead, error: leadError } = await supabase
        .from("professional_leads")
        .insert({
          professional_id: pro.id,
          user_name: userName,
          user_email: normalizedEmail,
          user_phone: userPhone,
          message: `Matched via Find Advisor quiz. Need: ${need}, Amount: ${amount || "not specified"}, Urgency: ${urgency || "not specified"}, State: ${state || "not specified"}.`,
          source_page: "/find-advisor",
          status: "new",
          quality_score: 60, // Base score for quiz-originated leads
          lead_tier: "qualified",
          billed: false,
          bill_amount_cents: 0,
          qualification_data: {
            source: "find_advisor",
            data: { need, amount, urgency, state },
            captured_at: new Date().toISOString(),
          },
        })
        .select("id")
        .single();

      if (leadError) {
        log.error("Lead insert failed", { error: leadError.message });
        return NextResponse.json({ error: "Failed to submit lead." }, { status: 500 });
      }

      leadId = lead.id;

      // Handle billing
      const freeUsed = pro.free_leads_used || 0;
      const isFree = freeUsed < 2;
      const balance = pro.credit_balance_cents || 0;
      const price = pro.lead_price_cents || 4900;

      if (isFree) {
        await supabase
          .from("professionals")
          .update({ free_leads_used: freeUsed + 1 })
          .eq("id", pro.id);
      } else if (balance >= price) {
        await supabase
          .from("professionals")
          .update({ credit_balance_cents: balance - price })
          .eq("id", pro.id);

        await supabase.from("professional_leads").update({
          billed: true,
          bill_amount_cents: price,
        }).eq("id", leadId);
      }

      // Track analytics event
      await supabase.from("analytics_events").insert({
        event_type: "advisor_lead",
        page: "/find-advisor",
        broker_slug: null,
        metadata: {
          professional_id: pro.id,
          type: pro.type,
          need,
          state,
          source: "quiz",
        },
      }).then(() => {}).catch(() => {});

      // Send email notification to advisor
      const RESEND_API_KEY = process.env.RESEND_API_KEY;
      const siteUrl = getSiteUrl();

      if (RESEND_API_KEY && pro.email) {
        const typeLabel = TYPE_LABELS[pro.type] || pro.type;
        const stateLabel = state ? (STATE_LABELS[state] || state) : "Not specified";
        const amountLabel = amount ? (AMOUNT_LABELS[amount] || amount) : "Not specified";
        const urgencyLabel = urgency ? (URGENCY_LABELS[urgency] || urgency) : "Not specified";

        const advisorHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
            <div style="background: linear-gradient(135deg, #1e293b 0%, #334155 100%); padding: 32px 24px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="color: #ffffff; font-size: 22px; margin: 0 0 8px;">New Lead from Invest.com.au</h1>
              <p style="color: #94a3b8; font-size: 14px; margin: 0;">A qualified enquiry matched to your profile</p>
            </div>
            <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
              <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr><td style="padding: 8px 0; font-size: 13px; color: #64748b; width: 140px;">Name</td><td style="padding: 8px 0; font-size: 14px; font-weight: 600; color: #0f172a;">${userName}</td></tr>
                <tr><td style="padding: 8px 0; font-size: 13px; color: #64748b;">Email</td><td style="padding: 8px 0; font-size: 14px; color: #0f172a;"><a href="mailto:${normalizedEmail}" style="color: #6d28d9;">${normalizedEmail}</a></td></tr>
                ${userPhone ? `<tr><td style="padding: 8px 0; font-size: 13px; color: #64748b;">Phone</td><td style="padding: 8px 0; font-size: 14px; color: #0f172a;">${userPhone}</td></tr>` : ""}
                <tr><td style="padding: 8px 0; font-size: 13px; color: #64748b;">Service</td><td style="padding: 8px 0; font-size: 14px; color: #0f172a;">${typeLabel}</td></tr>
                <tr><td style="padding: 8px 0; font-size: 13px; color: #64748b;">Amount</td><td style="padding: 8px 0; font-size: 14px; color: #0f172a;">${amountLabel}</td></tr>
                <tr><td style="padding: 8px 0; font-size: 13px; color: #64748b;">Urgency</td><td style="padding: 8px 0; font-size: 14px; color: #0f172a;">${urgencyLabel}</td></tr>
                <tr><td style="padding: 8px 0; font-size: 13px; color: #64748b;">Location</td><td style="padding: 8px 0; font-size: 14px; color: #0f172a;">${stateLabel}</td></tr>
              </table>
              <div style="text-align: center; margin: 24px 0 16px;">
                <a href="mailto:${normalizedEmail}?subject=Re: Your enquiry via Invest.com.au" style="display: inline-block; padding: 12px 32px; background: #6d28d9; color: #ffffff; font-weight: 700; font-size: 14px; border-radius: 8px; text-decoration: none;">Reply to ${userName} →</a>
              </div>
              <p style="font-size: 12px; color: #94a3b8; text-align: center; margin: 0;">View full details in your <a href="${siteUrl}/advisor-portal" style="color: #6d28d9;">Advisor Portal</a></p>
              ${notificationFooter(pro.email)}
            </div>
          </div>
        `;

        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Invest.com.au <leads@invest.com.au>",
            to: [pro.email],
            subject: `New Lead: ${userName} needs a ${typeLabel}`,
            html: advisorHtml,
          }),
        }).catch((err) => log.error("Advisor email failed", { error: String(err) }));

        // Send confirmation to the user
        const userHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
            <div style="background: linear-gradient(135deg, #6d28d9 0%, #4c1d95 100%); padding: 32px 24px; text-align: center; border-radius: 12px 12px 0 0;">
              <div style="width: 64px; height: 64px; background: rgba(255,255,255,0.2); border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 16px;">
                <span style="font-size: 28px;">✓</span>
              </div>
              <h1 style="color: #ffffff; font-size: 22px; margin: 0 0 8px;">You've been matched!</h1>
              <p style="color: #c4b5fd; font-size: 14px; margin: 0;">Your enquiry has been sent to a verified ${typeLabel}</p>
            </div>
            <div style="padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
              <p style="color: #334155; font-size: 15px; line-height: 1.6;">Hi ${userName},</p>
              <p style="color: #334155; font-size: 15px; line-height: 1.6;">Your enquiry has been sent to <strong>${pro.name}</strong>${pro.firm_name ? ` at ${pro.firm_name}` : ""}. They'll reach out within 24 hours.</p>
              <div style="background: #f8fafc; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <h3 style="color: #0f172a; font-size: 14px; margin: 0 0 12px;">What happens next:</h3>
                <ol style="color: #475569; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                  <li>${pro.name} will email you at ${normalizedEmail} within 24 hours</li>
                  <li>You'll book a free ${pro.initial_consultation_free ? "30-minute" : "initial"} consultation</li>
                  <li>They'll review your situation and provide a personalised plan — no obligation</li>
                </ol>
              </div>
              <p style="color: #64748b; font-size: 13px; line-height: 1.6; background: #fffbeb; border: 1px solid #fde68a; padding: 12px 16px; border-radius: 8px;">
                <strong>General Advice Warning:</strong> This is an introduction service. Any advice you receive from the professional is their own and not endorsed by Invest.com.au. Always obtain a Statement of Advice (SOA) before proceeding.
              </p>
              <p style="color: #94a3b8; font-size: 12px; text-align: center; margin-top: 20px;">
                Invest.com.au · <a href="${siteUrl}/privacy" style="color: #94a3b8;">Privacy Policy</a> · <a href="${siteUrl}/how-we-earn" style="color: #94a3b8;">How We Earn</a>
              </p>
            </div>
          </div>
        `;

        fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Invest.com.au <hello@invest.com.au>",
            to: [normalizedEmail],
            subject: `You've been matched with ${pro.name} — Invest.com.au`,
            html: userHtml,
          }),
        }).catch((err) => log.error("User confirmation email failed", { error: String(err) }));
      }

      // Also capture email
      supabase.from("email_captures").upsert(
        {
          email: normalizedEmail,
          source: "find_advisor",
          name: userName,
          context: { need, amount, urgency, state, professional_id: pro.id },
        },
        { onConflict: "email" }
      ).then(() => {}).catch(() => {});
    }

    // Return matched advisor info
    return NextResponse.json({
      success: true,
      lead_id: leadId,
      advisor: {
        id: pro.id,
        name: pro.name,
        firmName: pro.firm_name || null,
        type: pro.type,
        typeLabel: TYPE_LABELS[pro.type] || pro.type,
        location: pro.location_suburb
          ? `${pro.location_suburb}, ${pro.location_state}`
          : (pro.location_state || "Australia"),
        slug: pro.slug,
        photoUrl: pro.photo_url || null,
        rating: pro.rating || null,
        reviewCount: pro.review_count || 0,
        freeConsultation: pro.initial_consultation_free || false,
      },
    });
  } catch (error) {
    log.error("submit-lead unhandled error", { error: String(error) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
