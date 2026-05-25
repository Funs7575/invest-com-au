/**
 * POST /api/org-apply
 *
 * Public endpoint — no auth required. Accepts organisation applications and
 * inserts into the organisation_applications table for admin review.
 * Rate-limited to 5 requests/hour per IP.
 */

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger("org-apply");

const OrgApplySchema = z.object({
  organisation_name: z.string().min(2).max(200),
  organisation_type: z.enum([
    "training_provider",
    "cpd_provider",
    "compliance",
    "fintech",
    "industry_body",
    "law_firm",
    "accounting_firm",
    "other",
  ]),
  abn: z.string().max(20).optional(),
  website: z.string().url().max(500),
  contact_name: z.string().min(2).max(200),
  contact_email: z.string().email().max(254),
  contact_phone: z.string().max(50).optional(),
  bio: z.string().max(2000).optional(),
  cpd_provider_number: z.string().max(100).optional(),
});

export const POST = withValidatedBody(OrgApplySchema, async (req: NextRequest, body) => {
  // Per-IP rate limit: 5 applications per hour
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (await isRateLimited(`org_apply_ip:${ip}`, 5, 3600)) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429 },
    );
  }

  const supabase = createAdminClient();

  const { error } = await supabase.from("organisation_applications").insert({
    organisation_name: body.organisation_name,
    organisation_type: body.organisation_type,
    abn: body.abn ?? null,
    website: body.website,
    contact_name: body.contact_name,
    contact_email: body.contact_email.toLowerCase().trim(),
    contact_phone: body.contact_phone ?? null,
    bio: body.bio ?? null,
    cpd_provider_number: body.cpd_provider_number ?? null,
    status: "pending",
  });

  if (error) {
    log.error("org-apply insert error", { error: error.message });
    return NextResponse.json(
      { error: "Failed to submit application. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true }, { status: 201 });
});
