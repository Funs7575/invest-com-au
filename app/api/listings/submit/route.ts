import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { processAdvisorOptIns } from "@/lib/advisor-opt-ins";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";

const log = logger("listings:submit");

const VALID_VERTICALS = [
  "business",
  "mining",
  "farmland",
  "commercial_property",
  "franchise",
  "energy",
  "fund",
  "startup",
  "pre_ipo",
  "digital-infrastructure",
] as const;

const SubmitSchema = z.object({
  vertical: z.enum(VALID_VERTICALS, {
    error: () => "A valid investment vertical is required.",
  }),
  title: z
    .string({ error: () => "Title must be at least 5 characters." })
    .trim()
    .min(5, "Title must be at least 5 characters."),
  description: z
    .string({ error: () => "Description must be at least 50 characters." })
    .trim()
    .min(50, "Description must be at least 50 characters."),
  location_state: z
    .string({ error: () => "State / Territory is required." })
    .trim()
    .min(1, "State / Territory is required."),
  location_city: z.string().trim().optional(),
  asking_price_display: z.string().trim().optional(),
  industry: z.string().trim().optional(),
  firb_eligible: z.boolean().optional(),
  siv_complying: z.boolean().optional(),
  contact_name: z
    .string({ error: () => "Contact name is required." })
    .trim()
    .min(1, "Contact name is required."),
  contact_email: z
    .string({ error: () => "A valid contact email is required." })
    .trim()
    .email("A valid contact email is required."),
  contact_phone: z.string().trim().optional(),
  listing_plan: z.string().optional(),
  advisor_opt_ins: z.array(z.string()).optional(),
});

export const POST = withValidatedBody(SubmitSchema, async (request: NextRequest, body) => {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (await isRateLimited(`listing-submit:${ip}`, 5, 10)) {
      return NextResponse.json({ error: "Too many submissions. Please try again later." }, { status: 429 });
    }

    const baseSlug = body.title
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 80);

    const slug = `${baseSlug}-${Date.now()}`;

    const admin = createAdminClient();

    const { data: inserted, error: insertError } = await admin
      .from("investment_listings")
      .insert({
        vertical: body.vertical,
        title: body.title,
        slug,
        description: body.description,
        location_state: body.location_state,
        location_city: body.location_city ?? null,
        price_display: body.asking_price_display ?? null,
        industry: body.industry ?? null,
        firb_eligible: body.firb_eligible ?? false,
        siv_complying: body.siv_complying ?? false,
        contact_name: body.contact_name,
        contact_email: body.contact_email,
        contact_phone: body.contact_phone ?? null,
        listing_type: body.listing_plan === "featured" ? "featured" : body.listing_plan === "premium" ? "premium" : "standard",
        status: "pending",
        views: 0,
        enquiries: 0,
      })
      .select("id")
      .single();

    if (insertError) {
      log.error("[listings/submit] insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to save your listing. Please try again." },
        { status: 500 }
      );
    }

    let opt_ins_queued = 0;
    if (body.advisor_opt_ins && body.advisor_opt_ins.length > 0 && inserted?.id) {
      try {
        const optInResult = await processAdvisorOptIns({
          admin,
          source: "investment_listing",
          investment_listing_id: inserted.id,
          advisor_types: body.advisor_opt_ins,
          contact_email: body.contact_email,
          contact_name: body.contact_name,
          contact_phone: body.contact_phone,
          user_location_state: body.location_state,
          context_note: `Listed: ${body.title.slice(0, 80)}`,
        });
        opt_ins_queued = optInResult.inserted;
      } catch (err) {
        log.warn("[listings/submit] opt-in processing failed", {
          err: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({ success: true, listing_id: inserted?.id, opt_ins_queued });
  } catch (err) {
    log.error("[listings/submit] unexpected error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred." },
      { status: 500 }
    );
  }
});
