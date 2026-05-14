import { NextRequest, NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { isRateLimited } from "@/lib/rate-limit";
import { isValidEmail, isDisposableEmail } from "@/lib/validate-email";
import { logger } from "@/lib/logger";
import { CreateBriefRequest } from "@/lib/api-schemas";
import { scanBrief } from "@/lib/briefs/risk-flags";
import { getAcceptCost } from "@/lib/briefs/credits";
import {
  BRIEF_TEMPLATE_SCHEMAS,
  isBriefTemplate,
} from "@/lib/briefs/templates";
import type { BriefTemplate, ProviderKind } from "@/lib/briefs/types";

const log = logger("briefs:create");

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

function providerPrefToKind(pref: string | null): ProviderKind {
  switch (pref) {
    case "individual":
      return "individual";
    case "firm":
      return "firm";
    case "expert_team":
      return "expert_team";
    default:
      return "individual";
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (await isRateLimited(`briefs-post:${ip}`, 5, 60)) {
      return NextResponse.json(
        { error: "Too many submissions. Please try again later." },
        { status: 429 },
      );
    }

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    // Honeypot — silently 200 to bots.
    const maybeBot = rawBody as Record<string, unknown>;
    if (maybeBot.website || maybeBot.fax) {
      return NextResponse.json({ success: true, brief_id: null, slug: null });
    }

    const parsed = CreateBriefRequest.safeParse(rawBody);
    if (!parsed.success) {
      const msg = parsed.error.issues[0]?.message || "Invalid request body.";
      return NextResponse.json({ error: msg }, { status: 400 });
    }
    const body = parsed.data;

    if (!isBriefTemplate(body.brief_template)) {
      return NextResponse.json({ error: "Unknown brief template." }, { status: 400 });
    }

    // Validate brief_payload against the template-specific schema.
    const payloadSchema = BRIEF_TEMPLATE_SCHEMAS[body.brief_template as BriefTemplate];
    const payloadParsed = payloadSchema.safeParse(body.brief_payload ?? {});
    if (!payloadParsed.success) {
      const msg =
        payloadParsed.error.issues[0]?.message ||
        "Some required fields are missing.";
      return NextResponse.json(
        { error: `Brief details: ${msg}` },
        { status: 400 },
      );
    }

    if (!isValidEmail(body.contact_email) || isDisposableEmail(body.contact_email)) {
      return NextResponse.json(
        { error: "Please use a real email address." },
        { status: 400 },
      );
    }

    const admin = createAdminClient();

    // Resolve direct-routing targets if slugs were supplied.
    let targetTeamId: number | null = null;
    let targetProfessionalId: number | null = null;
    let targetFirmId: number | null = null;
    if (body.target_team_slug) {
      const { data: team } = await admin
        .from("expert_teams")
        .select("id")
        .eq("slug", body.target_team_slug)
        .maybeSingle();
      if (team) targetTeamId = team.id as number;
    }
    if (body.target_professional_slug) {
      const { data: pro } = await admin
        .from("professionals")
        .select("id")
        .eq("slug", body.target_professional_slug)
        .maybeSingle();
      if (pro) targetProfessionalId = pro.id as number;
    }
    if (body.target_firm_slug) {
      const { data: firm } = await admin
        .from("advisor_firms")
        .select("id")
        .eq("slug", body.target_firm_slug)
        .maybeSingle();
      if (firm) targetFirmId = firm.id as number;
    }

    const providerKind = providerPrefToKind(body.provider_preference);
    const credits = await getAcceptCost({
      briefTemplate: body.brief_template,
      providerKind,
    });

    const riskHaystack = [
      body.job_title,
      body.job_description,
      JSON.stringify(body.brief_payload ?? {}),
    ].join(" ");
    const risk = await scanBrief(riskHaystack);

    if (risk.severity === "block") {
      return NextResponse.json(
        {
          error:
            "We can't accept briefs containing this kind of content. Please contact our team if you believe this is a mistake.",
        },
        { status: 400 },
      );
    }

    const baseSlug = slugify(body.job_title);
    const slug = `${baseSlug}-${Date.now().toString(36)}`;
    const endsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const insertRow: Record<string, unknown> = {
      flow_type: "accept",
      source: "public_brief",
      is_public: false,
      slug,
      job_title: body.job_title.trim(),
      job_description: body.job_description.trim(),
      budget_band: body.budget_band,
      advisor_types: body.advisor_types,
      location: body.location_state,
      contact_name: body.contact_name.trim(),
      contact_email: body.contact_email.toLowerCase().trim(),
      contact_phone: body.contact_phone?.trim() || null,
      status: "open",
      ends_at: endsAt,
      brief_template: body.brief_template,
      brief_payload: payloadParsed.data,
      provider_preference: body.provider_preference,
      routing_mode: body.routing_mode,
      target_team_id: targetTeamId,
      target_professional_id: targetProfessionalId,
      target_firm_id: targetFirmId,
      accept_credits_cost: credits,
      tracker_status: "new",
      risk_flags: risk.flags,
      risk_review_status: risk.reviewStatus,
      listing_id: body.listing_id ?? null,
    };

    const { data: brief, error: insertError } = await admin
      .from("advisor_auctions")
      .insert(insertRow)
      .select("id, slug")
      .single();

    if (insertError || !brief) {
      log.error("brief insert failed", { error: insertError?.message });
      return NextResponse.json({ error: "Failed to create brief." }, { status: 500 });
    }

    await admin.from("brief_tracker_events").insert({
      brief_id: brief.id,
      event_type: "created",
      actor_kind: "user",
      actor_id: body.contact_email.toLowerCase().trim(),
      payload: {
        brief_template: body.brief_template,
        provider_preference: body.provider_preference,
        routing_mode: body.routing_mode,
        risk_flags: risk.flags,
        risk_severity: risk.severity,
        credits_cost: credits,
      },
    });

    if (risk.flags.length > 0) {
      await admin.from("brief_tracker_events").insert({
        brief_id: brief.id,
        event_type: "risk_flagged",
        actor_kind: "system",
        payload: { flags: risk.flags, severity: risk.severity },
      });
    }

    log.info("Brief created", {
      briefId: brief.id,
      slug: brief.slug,
      template: body.brief_template,
      riskSeverity: risk.severity,
    });

    return NextResponse.json({
      success: true,
      brief_id: brief.id,
      slug: brief.slug,
      accept_credits_cost: credits,
      risk_review_status: risk.reviewStatus,
    });
  } catch (err) {
    log.error("briefs POST error", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Failed to create brief." }, { status: 500 });
  }
}
