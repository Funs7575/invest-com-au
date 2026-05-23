import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { isValidEmail, isDisposableEmail } from "@/lib/validate-email";
import { notificationFooter } from "@/lib/email-templates";
import { escapeHtml } from "@/lib/html-escape";
import { getSiteUrl } from "@/lib/url";
import { logger } from "@/lib/logger";
import { processAdvisorOptIns } from "@/lib/advisor-opt-ins";

const log = logger("property-enquiry");

/**
 * Body schema. Fields are typed but optional/permissive — the inline guards
 * below (honeypot, required name+email, length caps, email validity) stay the
 * gatekeepers so the existing 400 messages and ordering are preserved
 * bit-for-bit. `.passthrough()` keeps any extra client fields, and the
 * honeypot + advisor_opt_ins fields are declared so the existing reads stay
 * type-safe. The schema rejects hard type mismatches (e.g. `user_name: {}`)
 * before they reach the insert, replacing the previous `body.x` reads.
 *
 * `listing_id` is intentionally accepted as string|number (the column lookup
 * coerces) so existing clients sending either form keep working.
 */
const PropertyEnquirySchema = z
  .object({
    listing_id: z.union([z.string(), z.number()]).optional().catch(undefined),
    user_name: z.string().optional().catch(undefined),
    user_email: z.string().optional().catch(undefined),
    user_phone: z.string().optional().catch(undefined),
    user_country: z.string().optional().catch(undefined),
    user_message: z.string().optional().catch(undefined),
    investment_budget: z.string().optional().catch(undefined),
    timeline: z.string().optional().catch(undefined),
    source_page: z.string().optional().catch(undefined),
    utm_source: z.string().optional().catch(undefined),
    // Honeypot fields — declared so the silent-reject guard can read them.
    website: z.string().optional().catch(undefined),
    fax: z.string().optional().catch(undefined),
    company_url: z.string().optional().catch(undefined),
    // Advisor opt-in fan-out (array of advisor-type slugs).
    advisor_opt_ins: z.array(z.string()).optional().catch(undefined),
  })
  .passthrough();

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    if (await isRateLimited(`property-enquiry:${ip}`, 5, 60)) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const parsed = PropertyEnquirySchema.safeParse(await request.json());
    if (!parsed.success) {
      // Hard type mismatch (e.g. `user_name: {}`). Surface the same generic
      // 400 the required-field guard below would produce.
      return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
    }
    const body = parsed.data;
    const { listing_id, user_name, user_email, user_phone, user_country, user_message, investment_budget, timeline, source_page, utm_source } = body;

    // Honeypot
    if (body.website || body.fax || body.company_url) {
      return NextResponse.json({ success: true, lead_id: null });
    }

    // Validation. The typeof checks both preserve the original runtime guard
    // (name + email required) AND narrow user_name/user_email to `string` for
    // the downstream `.trim()` / email-validation calls now that the schema
    // types them as `string | undefined`.
    if (
      !listing_id ||
      typeof user_name !== "string" ||
      !user_name.trim() ||
      typeof user_email !== "string" ||
      !user_email.trim()
    ) {
      return NextResponse.json({ error: "Name and email are required." }, { status: 400 });
    }

    if (user_name.length > 200 || user_email.length > 254 || (user_message || "").length > 5000) {
      return NextResponse.json({ error: "Input too long." }, { status: 400 });
    }

    if (!isValidEmail(user_email)) {
      return NextResponse.json({ error: "Please use a valid email address." }, { status: 400 });
    }

    if (isDisposableEmail(user_email)) {
      return NextResponse.json({ error: "Please use a real email address." }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Verify listing exists and get developer info
    const { data: listing, error: listingError } = await supabase
      .from("property_listings")
      .select("id, title, developer_id, developer_name, property_developers(id, name, contact_email, credit_balance_cents)")
      .eq("id", listing_id)
      .single();

    if (listingError || !listing) {
      return NextResponse.json({ error: "Listing not found." }, { status: 404 });
    }

    const developer = listing.property_developers as unknown as { id: number; name: string; contact_email: string; credit_balance_cents: number } | null;

    // Duplicate protection — same email + listing within 24h
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { data: existingLead } = await supabase
      .from("property_leads")
      .select("id")
      .eq("listing_id", listing_id)
      .eq("user_email", user_email.trim().toLowerCase())
      .gte("created_at", twentyFourHoursAgo)
      .limit(1)
      .maybeSingle();

    if (existingLead) {
      return NextResponse.json({ success: true, lead_id: existingLead.id });
    }

    // Create lead
    const { data: lead, error: leadError } = await supabase
      .from("property_leads")
      .insert({
        listing_id,
        developer_id: listing.developer_id,
        user_name: user_name.trim(),
        user_email: user_email.trim().toLowerCase(),
        user_phone: user_phone?.trim() || null,
        user_country: user_country?.trim() || "Australia",
        user_message: user_message?.trim() || null,
        investment_budget: investment_budget || null,
        timeline: timeline || null,
        source_page: source_page || null,
        utm_source: utm_source?.slice(0, 100) || null,
        status: "new",
      })
      .select()
      .single();

    if (leadError) {
      log.error("Failed to create property lead:", leadError);
      return NextResponse.json({ error: "Failed to submit enquiry." }, { status: 500 });
    }

    // Increment lead count on listing
    await supabase.rpc("increment_field", {
      table_name: "property_listings",
      field_name: "lead_count",
      row_id: listing_id,
      amount: 1,
    }).then(({ error }) => {
      if (error) {
        // Fallback
        supabase.from("property_listings").update({ lead_count: (listing as Record<string, unknown>).lead_count as number + 1 }).eq("id", listing_id);
      }
    });

    // Developer billing — deduct from credit balance or mark as billable
    if (developer) {
      const leadPriceCents = 4900; // $49 per property lead
      const balance = developer.credit_balance_cents || 0;

      if (balance >= leadPriceCents) {
        await supabase
          .from("property_developers")
          .update({ credit_balance_cents: balance - leadPriceCents })
          .eq("id", developer.id)
          .gte("credit_balance_cents", leadPriceCents);
      }
    }

    // Email notification to developer
    if (developer?.contact_email) {
      try {
        const RESEND_API_KEY = process.env.RESEND_API_KEY;
        if (RESEND_API_KEY) {
          await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
            body: JSON.stringify({
              from: "Invest.com.au <leads@invest.com.au>",
              to: developer.contact_email,
              subject: `New Property Enquiry — ${listing.title} — Invest.com.au`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background: #0f172a; color: white; padding: 20px 24px; border-radius: 12px 12px 0 0;">
                    <h2 style="margin: 0; font-size: 18px;">New Property Enquiry</h2>
                    <p style="margin: 4px 0 0; opacity: 0.7; font-size: 13px;">via Invest.com.au — ${listing.title}</p>
                  </div>
                  <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                    <table style="width: 100%; border-collapse: collapse;">
                      <tr><td style="padding: 8px 0; font-size: 13px; color: #64748b; width: 120px;">Name</td><td style="padding: 8px 0; font-size: 14px; font-weight: 600;">${escapeHtml(user_name.trim())}</td></tr>
                      <tr><td style="padding: 8px 0; font-size: 13px; color: #64748b;">Email</td><td style="padding: 8px 0; font-size: 14px;"><a href="mailto:${encodeURIComponent(user_email.trim())}" style="color: #2563eb;">${escapeHtml(user_email.trim())}</a></td></tr>
                      ${user_phone ? `<tr><td style="padding: 8px 0; font-size: 13px; color: #64748b;">Phone</td><td style="padding: 8px 0; font-size: 14px;">${escapeHtml(user_phone.trim())}</td></tr>` : ""}
                      <tr><td style="padding: 8px 0; font-size: 13px; color: #64748b;">Country</td><td style="padding: 8px 0; font-size: 14px;">${escapeHtml(user_country || "Australia")}</td></tr>
                      ${investment_budget ? `<tr><td style="padding: 8px 0; font-size: 13px; color: #64748b;">Budget</td><td style="padding: 8px 0; font-size: 14px; font-weight: 600;">${escapeHtml(investment_budget)}</td></tr>` : ""}
                      ${timeline ? `<tr><td style="padding: 8px 0; font-size: 13px; color: #64748b;">Timeline</td><td style="padding: 8px 0; font-size: 14px;">${escapeHtml(timeline)}</td></tr>` : ""}
                      ${user_message ? `<tr><td style="padding: 8px 0; font-size: 13px; color: #64748b; vertical-align: top;">Message</td><td style="padding: 8px 0; font-size: 14px; line-height: 1.5;">${escapeHtml(user_message.trim()).replace(/\n/g, "<br>")}</td></tr>` : ""}
                    </table>
                    <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
                      <a href="mailto:${encodeURIComponent(user_email.trim())}?subject=Re: Your enquiry about ${escapeHtml(listing.title)}" style="display: inline-block; padding: 10px 24px; background: #0f172a; color: white; text-decoration: none; border-radius: 8px; font-size: 14px; font-weight: 600;">Reply to ${escapeHtml(user_name.trim().split(" ")[0])}</a>
                    </div>
                  </div>
                </div>
              `,
            }),
          });
        }
      } catch (emailError) {
        log.error("Failed to send developer notification:", emailError);
      }
    }

    // Confirmation email to user
    try {
      const RESEND_API_KEY = process.env.RESEND_API_KEY;
      const siteUrl = getSiteUrl();
      if (RESEND_API_KEY) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${RESEND_API_KEY}` },
          body: JSON.stringify({
            from: "Invest.com.au <hello@invest.com.au>",
            to: user_email.trim().toLowerCase(),
            subject: `Your property enquiry — ${listing.title} — Invest.com.au`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #0f172a;">Enquiry Sent!</h2>
                <p>Hi ${user_name.trim().split(" ")[0]},</p>
                <p>Your enquiry about <strong>${listing.title}</strong> has been sent to ${developer?.name || listing.developer_name || "the developer"}. They typically respond within 24–48 hours.</p>
                <p>In the meantime, you might like to:</p>
                <ul>
                  <li><a href="${siteUrl}/property/suburbs" style="color: #2563eb;">Research suburb data</a></li>
                  <li><a href="${siteUrl}/property/buyer-agents" style="color: #2563eb;">Find a buyer's agent</a></li>
                  <li><a href="${siteUrl}/property/finance" style="color: #2563eb;">Compare investment loans</a></li>
                </ul>
                <p style="color: #64748b; font-size: 13px;">This is a no-obligation enquiry.</p>
                ${notificationFooter(user_email.trim())}
              </div>
            `,
          }),
        });
      }
    } catch (err) {
      log.warn("Property enquiry confirmation email failed", { err: err instanceof Error ? err.message : String(err) });
    }

    // Fan out advisor opt-ins
    let opt_ins_queued = 0;
    if (Array.isArray(body.advisor_opt_ins) && body.advisor_opt_ins.length > 0 && lead?.id) {
      try {
        const optInResult = await processAdvisorOptIns({
          admin: supabase,
          source: "property_enquiry",
          property_enquiry_id: lead.id,
          advisor_types: body.advisor_opt_ins,
          contact_email: user_email,
          contact_name: user_name,
          contact_phone: user_phone,
          context_note: `Enquired re property: ${listing.title?.slice(0, 80)}`,
        });
        opt_ins_queued = optInResult.inserted;
      } catch (err) {
        log.warn("Property enquiry opt-in fan-out failed", { err: err instanceof Error ? err.message : String(err) });
      }
    }

    return NextResponse.json({ success: true, lead_id: lead.id, opt_ins_queued });
  } catch (error) {
    log.error("Property enquiry handler error", { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
