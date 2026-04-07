import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/resend";
import { escapeHtml } from "@/lib/html-escape";
import { isRateLimited } from "@/lib/rate-limit";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface EnquireBody {
  listing_id: number;
  user_name: string;
  user_email: string;
  user_phone?: string;
  message?: string;
  investor_country?: string;
  investor_type?: string;
  source_page?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit enquiries
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (await isRateLimited(`listing-enquire:${ip}`, 10, 5)) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    let body: Partial<EnquireBody>;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body." },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!body.listing_id || typeof body.listing_id !== "number") {
      return NextResponse.json(
        { error: "listing_id is required and must be a number." },
        { status: 400 }
      );
    }

    if (!body.user_name || typeof body.user_name !== "string" || body.user_name.trim().length === 0) {
      return NextResponse.json(
        { error: "user_name is required." },
        { status: 400 }
      );
    }

    if (!body.user_email || typeof body.user_email !== "string" || !EMAIL_REGEX.test(body.user_email.trim())) {
      return NextResponse.json(
        { error: "A valid user_email is required." },
        { status: 400 }
      );
    }

    // Validate investor_type if provided
    const validInvestorTypes = [
      "domestic",
      "foreign_individual",
      "foreign_corporate",
      "visa_applicant",
    ];
    if (
      body.investor_type &&
      !validInvestorTypes.includes(body.investor_type)
    ) {
      return NextResponse.json(
        {
          error: `investor_type must be one of: ${validInvestorTypes.join(", ")}.`,
        },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify listing exists and is active
    const { data: listing, error: listingError } = await supabase
      .from("investment_listings")
      .select("id, status, title")
      .eq("id", body.listing_id)
      .single();

    if (listingError || !listing) {
      return NextResponse.json(
        { error: "Listing not found." },
        { status: 404 }
      );
    }

    if (listing.status !== "active") {
      return NextResponse.json(
        { error: "This listing is no longer accepting enquiries." },
        { status: 410 }
      );
    }

    // Insert enquiry
    const { error: insertError } = await supabase
      .from("listing_enquiries")
      .insert({
        listing_id: body.listing_id,
        user_name: body.user_name.trim(),
        user_email: body.user_email.trim().toLowerCase(),
        user_phone: body.user_phone?.trim() ?? null,
        message: body.message?.trim() ?? null,
        investor_country: body.investor_country?.trim() ?? null,
        investor_type: body.investor_type ?? null,
        source_page: body.source_page ?? null,
        status: "new",
      });

    if (insertError) {
      console.error("[listings/enquire] insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to submit enquiry. Please try again." },
        { status: 500 }
      );
    }

    // Send email notification to the listing seller (best-effort)
    try {
      const { data: listingForEmail } = await supabase
        .from("investment_listings")
        .select("contact_email, title, slug")
        .eq("id", body.listing_id)
        .single();

      if (listingForEmail?.contact_email) {
        const listingTitle = listingForEmail.title || `Listing #${body.listing_id}`;
        const investorName = body.user_name.trim();
        const investorEmail = body.user_email.trim().toLowerCase();
        const investorPhone = body.user_phone?.trim() || "Not provided";
        const investorMessage = body.message?.trim() || "No message provided";

        const emailHtml = `
          <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; background: #f8fafc; padding: 24px 16px;">
            <div style="background: #0f172a; padding: 20px 24px; border-radius: 12px 12px 0 0; text-align: center;">
              <span style="color: #fff; font-weight: 800; font-size: 16px;">New Enquiry Received</span>
            </div>
            <div style="background: #fff; border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 12px 12px;">
              <h2 style="margin: 0 0 12px; font-size: 18px; color: #0f172a;">New enquiry for ${escapeHtml(listingTitle)}</h2>
              <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 16px;">
                An investor has expressed interest in your listing.
              </p>
              <div style="background: #f1f5f9; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 0 0 20px;">
                <p style="margin: 0 0 8px; font-size: 13px; color: #334155;"><strong>Name:</strong> ${escapeHtml(investorName)}</p>
                <p style="margin: 0 0 8px; font-size: 13px; color: #334155;"><strong>Email:</strong> ${escapeHtml(investorEmail)}</p>
                <p style="margin: 0 0 8px; font-size: 13px; color: #334155;"><strong>Phone:</strong> ${escapeHtml(investorPhone)}</p>
                <p style="margin: 0; font-size: 13px; color: #334155;"><strong>Message:</strong></p>
                <p style="margin: 4px 0 0; font-size: 13px; color: #475569; white-space: pre-wrap;">${escapeHtml(investorMessage)}</p>
              </div>
              <div style="text-align: center; margin: 20px 0;">
                <a href="mailto:${encodeURIComponent(investorEmail)}" style="display: inline-block; padding: 12px 28px; background: #0f172a; color: #fff; font-weight: 700; font-size: 14px; border-radius: 8px; text-decoration: none;">Reply to ${escapeHtml(investorName)}</a>
              </div>
              <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 24px 0 0 0; line-height: 1.5;">
                Invest.com.au — Independent investing education &amp; comparison<br>
                <a href="https://invest.com.au/unsubscribe" style="color: #94a3b8;">Unsubscribe</a>
              </p>
            </div>
          </div>`;

        sendEmail({
          to: listingForEmail.contact_email,
          subject: `New enquiry for ${listingTitle}`,
          html: emailHtml,
          from: "Invest.com.au <hello@invest.com.au>",
        }).catch((err) =>
          console.error("[listings/enquire] email notification failed:", err)
        );
      }
    } catch (emailErr) {
      // Best-effort — don't fail the request if email sending errors
      console.error("[listings/enquire] email notification error:", emailErr);
    }

    // Increment enquiries count on the listing (best-effort — don't fail the request if this errors)
    const { error: updateError } = await supabase.rpc(
      "increment_listing_enquiries",
      { listing_id: body.listing_id }
    );

    if (updateError) {
      // Fallback: manual increment if RPC doesn't exist yet
      console.warn(
        "[listings/enquire] RPC increment_listing_enquiries not available, using fallback:",
        updateError.message
      );
      await supabase
        .from("investment_listings")
        .update({ enquiries: (listing as { enquiries?: number }).enquiries ?? 0 + 1 })
        .eq("id", body.listing_id);
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (err) {
    console.error("[listings/enquire] unexpected error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
