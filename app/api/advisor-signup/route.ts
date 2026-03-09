import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      email,
      phone,
      firm_name,
      type,
      afsl_number,
      abn,
      registration_number,
      specialties,
      location_state,
      location_suburb,
      bio,
      fee_structure,
      fee_description,
    } = body;

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json({ error: "Full name is required." }, { status: 400 });
    }
    if (!email?.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }
    if (!phone?.trim()) {
      return NextResponse.json({ error: "Phone number is required." }, { status: 400 });
    }
    if (!type?.trim()) {
      return NextResponse.json({ error: "Advisor type is required." }, { status: 400 });
    }
    if (!location_state?.trim()) {
      return NextResponse.json({ error: "State is required." }, { status: 400 });
    }
    if (!location_suburb?.trim()) {
      return NextResponse.json({ error: "Suburb is required." }, { status: 400 });
    }

    const supabase = createAdminClient();

    // Check if email already exists in professionals
    const { data: existing } = await supabase
      .from("professionals")
      .select("id")
      .eq("email", email.trim().toLowerCase())
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "An advisor with this email already exists. Please log in instead." },
        { status: 409 }
      );
    }

    // Create auth user via Supabase admin
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email.trim().toLowerCase(),
      email_confirm: true,
      user_metadata: {
        full_name: name.trim(),
        role: "advisor",
      },
    });

    if (authError) {
      console.error("Auth user creation failed:", authError.message);
      // If user already exists in auth, proceed with professional insert
      if (!authError.message.includes("already been registered")) {
        return NextResponse.json(
          { error: "Failed to create account. Please try again." },
          { status: 500 }
        );
      }
    }

    // Generate slug from name + suburb
    const slugBase = slugify(`${name.trim()}-${location_suburb.trim()}`);
    // Check for slug conflicts
    const { data: slugConflict } = await supabase
      .from("professionals")
      .select("id")
      .eq("slug", slugBase)
      .maybeSingle();

    const slug = slugConflict ? `${slugBase}-${Date.now().toString(36)}` : slugBase;

    // Build location_display
    const locationDisplay = `${location_suburb.trim()}, ${location_state.trim()}`;

    // Insert into professionals table
    const { data: professional, error: insertError } = await supabase
      .from("professionals")
      .insert({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        firm_name: firm_name?.trim() || null,
        type,
        slug,
        afsl_number: afsl_number?.trim() || null,
        abn: abn?.trim() || null,
        registration_number: registration_number?.trim() || null,
        specialties: Array.isArray(specialties) ? specialties : [],
        location_state: location_state.trim(),
        location_suburb: location_suburb.trim(),
        location_display: locationDisplay,
        bio: bio?.trim() || null,
        fee_structure: fee_structure || null,
        fee_description: fee_description?.trim() || null,
        status: "pending",
        verified: false,
        profile_complete: false,
        rating: 0,
        review_count: 0,
        auth_user_id: authData?.user?.id || null,
      })
      .select("id, slug")
      .single();

    if (insertError) {
      console.error("Professional insert failed:", insertError.message);
      return NextResponse.json(
        { error: "Failed to create advisor profile. Please try again." },
        { status: 500 }
      );
    }

    // Log confirmation (no actual email for now)
    console.log(
      `[Advisor Signup] New advisor registered: ${name.trim()} (${email.trim().toLowerCase()}) — professional ID: ${professional.id}, slug: ${professional.slug}`
    );

    return NextResponse.json({
      success: true,
      message: "Advisor account created successfully.",
      slug: professional.slug,
    });
  } catch (err) {
    console.error("Advisor signup error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}
