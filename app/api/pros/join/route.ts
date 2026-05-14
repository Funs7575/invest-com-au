/**
 * POST /api/pros/join
 *
 * Wizard submission endpoint for /pros/join. Validates the payload, dedupes
 * on email, inserts a `professionals` row with `verification_status='pending'`
 * + `accepts_briefs=false`, records the verification doc + payout details,
 * and fires the welcome-pro email.
 *
 * Hard requirements:
 *   - Zod-validated body via withValidatedBody (no raw req.json()).
 *   - IP-rate-limited via isAllowed/ipKey.
 *   - No createAdminClient() calls outside admin-allowed scope: this is an
 *     anon path that needs to write to professionals (deny-all-anon RLS),
 *     so service-role is the documented escape hatch (see CLAUDE.md).
 *
 * Account kind: the brief specifies `advisor` for individual/firm and
 * `broker_partner` for platforms. Pro Squad (Expert Team) is still an
 * `advisor` row — the team itself lives in expert_teams (out of scope for
 * the initial wizard).
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import { sendWelcomePro } from "@/lib/pro-onboarding-emails";
import { STARTER_FREE_CREDITS } from "@/lib/pro-onboarding";
import { PROFESSIONAL_TYPE_LABELS, type ProfessionalType } from "@/lib/types";

const log = logger("api:pros-join");

export const runtime = "nodejs";

const PROFESSIONAL_TYPES = Object.keys(PROFESSIONAL_TYPE_LABELS) as [
  ProfessionalType,
  ...ProfessionalType[],
];

const AU_STATES = ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"] as const;

// BSB is six digits (with optional hyphen). Account-number last4 — we only
// store the last 4 digits; the wizard collects the full number client-side
// for display confirmation, but the API only receives last4.
const BSB_RE = /^\d{3}-?\d{3}$/;
const LAST4_RE = /^\d{4}$/;
const ABN_RE = /^[\d\s]{11,14}$/;

const Body = z.object({
  kind: z.enum(["individual", "firm", "expert_team"]),
  // Multi-select specialties — the primary `type` is derived from the first
  // entry. The full list is stored in professionals.specialties for display.
  specialties: z
    .array(z.enum(PROFESSIONAL_TYPES))
    .min(1, "Pick at least one specialty")
    .max(8, "Pick up to 8 specialties"),
  name: z.string().trim().min(2).max(120),
  firm_name: z.string().trim().max(160).optional().nullable(),
  email: z.string().trim().toLowerCase().email().max(160),
  phone: z.string().trim().min(8).max(40).optional().nullable(),
  afsl_number: z.string().trim().max(40).optional().nullable(),
  credit_licence_number: z.string().trim().max(40).optional().nullable(),
  asic_registration_number: z.string().trim().max(40).optional().nullable(),
  abn: z
    .string()
    .trim()
    .regex(ABN_RE, "ABN should be 11 digits")
    .optional()
    .nullable(),
  location_state: z.enum(AU_STATES).optional().nullable(),
  location_suburb: z.string().trim().max(120).optional().nullable(),
  verification_doc_path: z
    .string()
    .trim()
    .min(1, "Upload a verification document")
    .max(512),
  payout_bsb: z
    .string()
    .trim()
    .regex(BSB_RE, "BSB should be 6 digits"),
  payout_account_last4: z
    .string()
    .trim()
    .regex(LAST4_RE, "Account-number last 4 digits required"),
  start_with_free_credits: z.boolean().default(true),
  agreed_to_terms: z.literal(true, {
    message: "You must agree to the terms",
  }),
});

export type ProsJoinBody = z.infer<typeof Body>;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const POST = withValidatedBody(Body, async (request: NextRequest, body) => {
  // IP rate-limit: 5 join attempts per hour per IP. Aggressive enough to
  // block scripted abuse without trapping a legitimate user who fat-fingered
  // their first attempt.
  if (
    !(await isAllowed("pros_join", ipKey(request), {
      max: 5,
      refillPerSec: 5 / 3600,
    }))
  ) {
    return NextResponse.json(
      { error: "Too many signup attempts. Please try again later." },
      { status: 429 },
    );
  }

  const supabase = createAdminClient();

  // Dedupe on normalized email. The Zod schema already lowercased it.
  const { data: existing } = await supabase
    .from("professionals")
    .select("id, verification_status")
    .eq("email", body.email)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      {
        error:
          "An application already exists for this email. Check your inbox for status.",
      },
      { status: 409 },
    );
  }

  // Primary type is the first specialty selected. Wizard validation forces
  // at least one entry so `[0]` is safe even under noUncheckedIndexedAccess.
  const primaryType = body.specialties[0];
  if (!primaryType) {
    return NextResponse.json(
      { error: "Pick at least one specialty" },
      { status: 400 },
    );
  }

  // Slug: name + suburb if available, else name + short random suffix.
  const slugSeed = body.location_suburb
    ? `${body.name}-${body.location_suburb}`
    : `${body.name}-${Math.random().toString(36).slice(2, 6)}`;
  let slug = slugify(slugSeed) || `pro-${Date.now().toString(36)}`;
  const { data: slugClash } = await supabase
    .from("professionals")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (slugClash) slug = `${slug}-${Date.now().toString(36)}`;

  const locationDisplay =
    body.location_suburb && body.location_state
      ? `${body.location_suburb}, ${body.location_state}`
      : body.location_state || body.location_suburb || null;

  const { data: inserted, error: insertError } = await supabase
    .from("professionals")
    .insert({
      slug,
      name: body.name,
      firm_name: body.firm_name || null,
      type: primaryType,
      specialties: body.specialties,
      email: body.email,
      phone: body.phone || null,
      afsl_number: body.afsl_number || body.credit_licence_number || null,
      registration_number: body.asic_registration_number || null,
      abn: body.abn?.replace(/\s+/g, "") || null,
      location_state: body.location_state || null,
      location_suburb: body.location_suburb || null,
      location_display: locationDisplay,
      // New columns from 20260514 migration:
      verification_status: "pending",
      accepts_briefs: false,
      verification_doc_url: body.verification_doc_path,
      payout_bsb: body.payout_bsb.replace("-", ""),
      payout_account_last4: body.payout_account_last4,
      // Existing columns:
      verified: false,
      status: "pending",
      rating: 0,
      review_count: 0,
    })
    .select("id, slug")
    .single();

  if (insertError || !inserted) {
    log.error("professionals insert failed", {
      error: insertError?.message,
      email: body.email,
    });
    return NextResponse.json(
      { error: "Could not save your application. Please try again." },
      { status: 500 },
    );
  }

  // Fire-and-await the welcome email. We log but don't fail the request if
  // the email service is down — the row exists, the admin queue will pick
  // it up regardless.
  try {
    const ok = await sendWelcomePro(body.email, body.name);
    if (!ok) {
      log.warn("welcome-pro email send returned ok=false", {
        professional_id: inserted.id,
      });
    }
  } catch (err) {
    log.warn("welcome-pro email threw", {
      professional_id: inserted.id,
      err: err instanceof Error ? err.message : String(err),
    });
  }

  log.info("Provider join submitted", {
    professional_id: inserted.id,
    slug: inserted.slug,
    kind: body.kind,
    primary_type: primaryType,
    starter_credits_opt_in: body.start_with_free_credits,
  });

  return NextResponse.json({
    ok: true,
    professional_id: inserted.id,
    slug: inserted.slug,
    starter_credits_granted_on_approval: body.start_with_free_credits
      ? STARTER_FREE_CREDITS
      : 0,
  });
});
