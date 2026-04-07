import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/resend";

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
