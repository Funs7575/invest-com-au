import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { escapeHtml } from "@/lib/html-escape";
import { getSiteUrl } from "@/lib/url";
import { timingSafeEqual } from "crypto";
import { logger } from "@/lib/logger";

const log = logger("partner-leads");

const MAX_LEADS_PER_REQUEST = 100;

interface PartnerLead {
  name: string;
  email: string;
  phone?: string;
  advisor_type: string;
  message?: string;
  qualification_data?: Record<string, unknown>;
}

/**
 * POST /api/partner/leads
 *
 * Bulk lead delivery endpoint for B2B partner integrations.
 * Partners send leads from their sites; we match to advisors, create records,
 * bill from prepaid credit, and send notification emails.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { api_key, leads } = body;

    // ── Auth: validate partner API key (timing-safe) ──
    const expected = process.env.PARTNER_API_KEY;
    if (!api_key || !expected || typeof api_key !== "string") {
      return NextResponse.json({ error: "Invalid API key." }, { status: 401 });
    }
    try {
      const a = Buffer.from(api_key);
      const b = Buffer.from(expected);
      if (a.length !== b.length || !timingSafeEqual(a, b)) {
        return NextResponse.json({ error: "Invalid API key." }, { status: 401 });
      }
    } catch {
      return NextResponse.json({ error: "Invalid API key." }, { status: 401 });
    }

    // ── Validate leads array ──
    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json(
        { error: "leads must be a non-empty array." },
        { status: 400 },
      );
    }

    if (leads.length > MAX_LEADS_PER_REQUEST) {
      return NextResponse.json(
        { error: `Maximum ${MAX_LEADS_PER_REQUEST} leads per request.` },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const siteUrl = getSiteUrl();
    const RESEND_API_KEY = process.env.RESEND_API_KEY;

    let leadsCreated = 0;
    let leadsFailed = 0;
    const errors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < leads.length; i++) {
      const lead: PartnerLead = leads[i];

      try {
        // ── Validate individual lead ──
        if (!lead.name?.trim() || !lead.email?.trim() || !lead.advisor_type?.trim()) {
          errors.push({ index: i, error: "name, email, and advisor_type are required." });
          leadsFailed++;
          continue;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(lead.email)) {
          errors.push({ index: i, error: "Invalid email address." });
          leadsFailed++;
          continue;
        }

        // ── Find matching advisors by type ──
        const { data: matchingAdvisors, error: matchError } = await supabase
          .from("professionals")
          .select("id, name, email, firm_name, type, lead_price_cents, credit_balance_cents, free_leads_used, lifetime_lead_spend_cents, total_leads")
          .eq("type", lead.advisor_type)
          .eq("status", "active")
          .limit(5);

        if (matchError || !matchingAdvisors || matchingAdvisors.length === 0) {
          errors.push({ index: i, error: `No active advisors found for type: ${lead.advisor_type}` });
          leadsFailed++;
          continue;
        }

        // ── Create lead records for each matching advisor ──
        for (const advisor of matchingAdvisors) {
          // Duplicate protection: skip if same email sent to same advisor in last 24h
          const normalizedEmail = lead.email.trim().toLowerCase();
          const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
          const { data: existingLead } = await supabase
            .from("professional_leads")
            .select("id")
            .eq("professional_id", advisor.id)
            .eq("user_email", normalizedEmail)
            .gte("created_at", twentyFourHoursAgo)
            .limit(1)
            .maybeSingle();

          if (existingLead) continue;

          // Create the lead record
          const { data: newLead, error: insertError } = await supabase
            .from("professional_leads")
            .insert({
              professional_id: advisor.id,
              user_name: lead.name.trim().replace(/[\r\n]/g, ""),
              user_email: normalizedEmail.replace(/[\r\n]/g, ""),
              user_phone: lead.phone?.trim().replace(/[\r\n]/g, "") || null,
              message: lead.message?.trim() || null,
              source_page: "partner_api",
              status: "new",
              utm_source: "partner",
              quality_signals: lead.qualification_data || null,
            })
            .select("id")
            .single();

          if (insertError || !newLead) {
            console.error(`Failed to create partner lead for advisor ${advisor.id}:`, insertError);
            continue;
          }

          // ── Billing: deduct from partner's prepaid credit or track for invoicing ──
          // Get category pricing
          let priceCents = advisor.lead_price_cents || 4900;
          if (!advisor.lead_price_cents) {
            const { data: catPricing } = await supabase
              .from("lead_pricing")
              .select("price_cents")
              .eq("advisor_type", advisor.type)
              .single();
            if (catPricing) priceCents = catPricing.price_cents;
          }

          const freeUsed = advisor.free_leads_used || 0;
          const isFree = freeUsed < 2;
          const balance = advisor.credit_balance_cents || 0;
          const hasSufficientCredit = balance >= priceCents;

          // Update lead billing info
          await supabase.from("professional_leads").update({
            billed: !isFree && hasSufficientCredit,
            bill_amount_cents: isFree ? 0 : priceCents,
          }).eq("id", newLead.id);

          if (isFree) {
            await supabase.from("professionals").update({
              free_leads_used: freeUsed + 1,
            }).eq("id", advisor.id);
          } else if (hasSufficientCredit) {
            await supabase.from("professionals").update({
              credit_balance_cents: balance - priceCents,
              lifetime_lead_spend_cents: (advisor.lifetime_lead_spend_cents || 0) + priceCents,
            }).eq("id", advisor.id);

            await supabase.from("advisor_billing").insert({
              professional_id: advisor.id,
              lead_id: newLead.id,
              amount_cents: priceCents,
              description: `Partner lead: ${lead.name.trim()} — deducted from credit`,
              status: "paid",
            });
          } else {
            await supabase.from("advisor_billing").insert({
              professional_id: advisor.id,
              lead_id: newLead.id,
              amount_cents: priceCents,
              description: `Partner lead: ${lead.name.trim()} — insufficient credit`,
              status: "pending",
            });
          }

          // ── Update advisor stats ──
          try {
            await supabase.rpc("increment_advisor_lead_count", { advisor_id: advisor.id });
          } catch (rpcErr) {
            log.warn("increment_advisor_lead_count RPC failed, falling back", { err: rpcErr instanceof Error ? rpcErr.message : String(rpcErr), advisorId: advisor.id });
            await supabase.from("professionals").update({
              last_lead_at: new Date().toISOString(),
              total_leads: (advisor.total_leads || 0) + 1,
            }).eq("id", advisor.id);
          }

          // ── Send notification email to advisor ──
          if (advisor.email && RESEND_API_KEY) {
            try {
              await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${RESEND_API_KEY}`,
                },
                body: JSON.stringify({
                  from: "Invest.com.au <leads@invest.com.au>",
                  to: advisor.email,
                  subject: `New Lead from ${lead.name.trim()} — Invest.com.au Partner`,
                  html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                      <div style="background: #0f172a; color: white; padding: 20px 24px; border-radius: 12px 12px 0 0;">
                        <h2 style="margin: 0; font-size: 18px;">New Lead via Partner</h2>
                        <p style="margin: 4px 0 0; opacity: 0.7; font-size: 13px;">Invest.com.au</p>
                      </div>
                      <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                        <table style="width: 100%; border-collapse: collapse;">
                          <tr><td style="padding: 8px 0; font-size: 13px; color: #64748b; width: 100px;">Name</td><td style="padding: 8px 0; font-size: 14px; font-weight: 600;">${escapeHtml(lead.name.trim())}</td></tr>
                          <tr><td style="padding: 8px 0; font-size: 13px; color: #64748b;">Email</td><td style="padding: 8px 0; font-size: 14px;"><a href="mailto:${encodeURIComponent(lead.email.trim())}" style="color: #2563eb;">${escapeHtml(lead.email.trim())}</a></td></tr>
                          ${lead.phone ? `<tr><td style="padding: 8px 0; font-size: 13px; color: #64748b;">Phone</td><td style="padding: 8px 0; font-size: 14px;"><a href="tel:${encodeURIComponent(lead.phone.trim())}" style="color: #2563eb;">${escapeHtml(lead.phone.trim())}</a></td></tr>` : ""}
                          ${lead.message ? `<tr><td style="padding: 8px 0; font-size: 13px; color: #64748b; vertical-align: top;">Message</td><td style="padding: 8px 0; font-size: 14px; line-height: 1.5;">${escapeHtml(lead.message.trim())}</td></tr>` : ""}
                        </table>
                        <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
                          <a href="mailto:${encodeURIComponent(lead.email.trim())}?subject=Re: Your enquiry on Invest.com.au" style="display: inline-block; padding: 10px 24px; background: #0f172a; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">Reply to ${escapeHtml(lead.name.trim().split(" ")[0])}</a>
                          <a href="${siteUrl}/advisor-portal" style="display: inline-block; margin-left: 8px; padding: 10px 24px; background: #f1f5f9; color: #334155; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">View in Dashboard</a>
                        </div>
                        <p style="margin-top: 16px; font-size: 11px; color: #94a3b8;">This lead was delivered via an Invest.com.au partner integration. We recommend responding within 24 hours.</p>
                      </div>
                    </div>
                  `,
                }),
              });
            } catch (emailError) {
              console.error("Failed to send partner lead notification:", emailError);
            }
          }
        }

        leadsCreated++;
      } catch (leadProcessError) {
        log.error("Error processing partner lead", { index: i, err: leadProcessError instanceof Error ? leadProcessError.message : String(leadProcessError) });
        errors.push({ index: i, error: "Unexpected processing error." });
        leadsFailed++;
      }
    }

    return NextResponse.json({
      success: true,
      leads_created: leadsCreated,
      leads_failed: leadsFailed,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    log.error("Partner leads API error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: "Internal server error." },
      { status: 500 },
    );
  }
}
