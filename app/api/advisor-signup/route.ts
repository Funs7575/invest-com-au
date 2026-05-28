import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { z } from "zod";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";

const log = logger("advisor-signup");

const AdvisorSignupBody = z.object({
  name: z.string().min(1, "Full name required").max(200),
  email: z.string().email("Valid email required").max(254),
  phone: z.string().min(1, "Phone required").max(50),
  firm_name: z.string().max(200).optional(),
  type: z.string().min(1, "Advisor type required").max(50),
  afsl_number: z.string().max(20).optional(),
  abn: z.string().max(20).optional(),
  registration_number: z.string().max(50).optional(),
  specialties: z.array(z.string().max(100)).max(20).optional(),
  location_state: z.string().min(1, "State required").max(10),
  location_suburb: z.string().min(1, "Suburb required").max(100),
  bio: z.string().max(5000).optional(),
  fee_structure: z.string().max(50).optional(),
  fee_description: z.string().max(1000).optional(),
  pitch_message: z.string().max(2000).optional(),
  years_experience: z.number().int().min(0).max(60).optional(),
  client_types: z.string().max(500).optional(),
  languages: z.string().max(200).optional(),
});

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const POST = withValidatedBody(AdvisorSignupBody, async (request: NextRequest, body) => {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    if (await isRateLimited(`advisor_signup:${ip}`, 3, 60)) {
      return NextResponse.json({ error: "Too many signup attempts. Please try again later." }, { status: 429 });
    }

    const supabase = createAdminClient();

    // Check if email already exists in professionals
    const { data: existing } = await supabase
      .from("professionals")
      .select("id")
      .eq("email", body.email.trim().toLowerCase())
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "An advisor with this email already exists. Please log in instead." },
        { status: 409 }
      );
    }

    // Create auth user via Supabase admin
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: body.email.trim().toLowerCase(),
      email_confirm: true,
      user_metadata: {
        full_name: body.name.trim(),
        role: "advisor",
      },
    });

    if (authError) {
      log.error("Auth user creation failed", { error: authError.message });
      // If user already exists in auth, proceed with professional insert
      if (!authError.message.includes("already been registered")) {
        return NextResponse.json(
          { error: "Failed to create account. Please try again." },
          { status: 500 }
        );
      }
    }

    // Generate slug from name + suburb
    const slugBase = slugify(`${body.name.trim()}-${body.location_suburb.trim()}`);
    // Check for slug conflicts
    const { data: slugConflict } = await supabase
      .from("professionals")
      .select("id")
      .eq("slug", slugBase)
      .maybeSingle();

    const slug = slugConflict ? `${slugBase}-${Date.now().toString(36)}` : slugBase;

    // Build location_display
    const locationDisplay = `${body.location_suburb.trim()}, ${body.location_state.trim()}`;

    // Insert into professionals table
    const { data: professional, error: insertError } = await supabase
      .from("professionals")
      .insert({
        name: body.name.trim(),
        email: body.email.trim().toLowerCase(),
        phone: body.phone.trim(),
        firm_name: body.firm_name?.trim() || null,
        type: body.type,
        slug,
        afsl_number: body.afsl_number?.trim() || null,
        abn: body.abn?.trim() || null,
        registration_number: body.registration_number?.trim() || null,
        specialties: Array.isArray(body.specialties) ? body.specialties : [],
        location_state: body.location_state.trim(),
        location_suburb: body.location_suburb.trim(),
        location_display: locationDisplay,
        bio: body.bio?.trim() || null,
        fee_structure: body.fee_structure || null,
        fee_description: body.fee_description?.trim() || null,
        years_experience: body.years_experience ? parseInt(String(body.years_experience)) || null : null,
        languages: body.languages
          ? String(body.languages).split(",").map((l: string) => l.trim()).filter(Boolean)
          : [],
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
      log.error("Professional insert failed", { error: insertError.message });
      return NextResponse.json(
        { error: "Failed to create advisor profile. Please try again." },
        { status: 500 }
      );
    }

    // Log confirmation
    log.info("New advisor registered", {
      name: body.name.trim(),
      email: body.email.trim().toLowerCase(),
      professionalId: professional.id,
      slug: professional.slug,
    });

    // Record agreement acceptance for audit trail
    try {
      await supabase.from("agreement_acceptances").insert({
        user_type: "advisor",
        agreement_type: "advisor_services",
        agreement_version: "1.0",
        professional_id: professional.id,
        email: body.email.trim().toLowerCase(),
        accepted_by_name: body.name.trim(),
        ip_address: ip,
        user_agent: request.headers.get("user-agent") || null,
      });
      await supabase.from("professionals").update({
        terms_accepted_at: new Date().toISOString(),
        terms_version: "1.0",
      }).eq("id", professional.id);
    } catch (err) {
      log.warn("Agreement recording failed", { error: err instanceof Error ? err.message : String(err) });
    }

    // Create advisor_application record for admin review pipeline
    try {
      await supabase.from("advisor_applications").insert({
        name: body.name.trim(),
        email: body.email.trim().toLowerCase(),
        phone: body.phone.trim(),
        firm_name: body.firm_name?.trim() || null,
        type: body.type,
        afsl_number: body.afsl_number?.trim() || null,
        registration_number: body.registration_number?.trim() || null,
        abn: body.abn?.trim() || null,
        location_state: body.location_state.trim(),
        location_suburb: body.location_suburb.trim(),
        specialties: Array.isArray(body.specialties) ? body.specialties.join(", ") : (body.specialties || null),
        bio: body.bio?.trim() || null,
        fee_description: body.fee_description?.trim() || null,
        pitch_message: body.pitch_message?.trim()?.slice(0, 2000) || null,
        years_experience: body.years_experience ? parseInt(String(body.years_experience)) || null : null,
        client_types: body.client_types?.trim()?.slice(0, 500) || null,
        languages: body.languages?.trim()?.slice(0, 200) || null,
        account_type: "individual",
        status: "pending",
        professional_id: professional.id,
      });
    } catch (err) {
      log.warn("Advisor application record creation failed", { error: err instanceof Error ? err.message : String(err) });
    }

    return NextResponse.json({
      success: true,
      message: "Advisor account created successfully.",
      slug: professional.slug,
    });
  } catch (err) {
    log.error("Advisor signup handler error", { err: err instanceof Error ? err.message : String(err) });
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
});
