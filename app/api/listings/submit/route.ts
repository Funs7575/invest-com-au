import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VALID_VERTICALS = [
  "business",
  "mining",
  "farmland",
  "commercial_property",
  "franchise",
  "energy",
  "fund",
  "startup",
];

interface SubmitBody {
  vertical: string;
  title: string;
  description: string;
  location_state: string;
  location_city?: string;
  asking_price_display?: string;
  industry?: string;
  firb_eligible?: boolean;
  siv_complying?: boolean;
  contact_name: string;
  contact_email: string;
  contact_phone?: string;
  listing_plan?: string;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limit listing submissions
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (await isRateLimited(`listing-submit:${ip}`, 5, 10)) {
      return NextResponse.json({ error: "Too many submissions. Please try again later." }, { status: 429 });
    }

    let body: Partial<SubmitBody>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    // Validate required fields
    if (!body.vertical || !VALID_VERTICALS.includes(body.vertical)) {
      return NextResponse.json(
        { error: "A valid investment vertical is required." },
        { status: 400 }
      );
    }

    if (!body.title || body.title.trim().length < 5) {
      return NextResponse.json(
        { error: "Title must be at least 5 characters." },
        { status: 400 }
      );
    }

    if (!body.description || body.description.trim().length < 50) {
      return NextResponse.json(
        { error: "Description must be at least 50 characters." },
        { status: 400 }
      );
    }

    if (!body.location_state || body.location_state.trim().length === 0) {
      return NextResponse.json(
        { error: "State / Territory is required." },
        { status: 400 }
      );
    }

    if (!body.contact_name || body.contact_name.trim().length === 0) {
      return NextResponse.json(
        { error: "Contact name is required." },
        { status: 400 }
      );
    }

    if (!body.contact_email || !EMAIL_REGEX.test(body.contact_email)) {
      return NextResponse.json(
        { error: "A valid contact email is required." },
        { status: 400 }
      );
    }

    // Generate a slug from the title
    const baseSlug = body.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80);

    const slug = `${baseSlug}-${Date.now()}`;

    const supabase = await createClient();

    const { error: insertError } = await supabase
      .from("investment_listings")
      .insert({
        vertical: body.vertical,
        title: body.title.trim(),
        slug,
        description: body.description.trim(),
        location_state: body.location_state.trim(),
        location_city: body.location_city?.trim() ?? null,
        price_display: body.asking_price_display?.trim() ?? null,
        industry: body.industry?.trim() ?? null,
        firb_eligible: body.firb_eligible ?? false,
        siv_complying: body.siv_complying ?? false,
        contact_email: body.contact_email.trim(),
        contact_phone: body.contact_phone?.trim() ?? null,
        listing_type: body.listing_plan === "featured" ? "featured" : body.listing_plan === "premium" ? "premium" : "standard",
        status: "pending",
        views: 0,
        enquiries: 0,
      });

    if (insertError) {
      console.error("[listings/submit] insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to save your listing. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[listings/submit] unexpected error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
}
