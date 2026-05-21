/**
 * GET /api/advisor-portal/firm-leads
 *
 * Returns all professional_leads rows for every member of the calling
 * advisor's firm. Restricted to firm admins (is_firm_admin = true).
 *
 * Query params:
 *   status  — filter by lead status (optional)
 *   search  — search name/email (optional)
 *
 * PATCH /api/advisor-portal/firm-leads
 *
 * Reassigns a lead to a different firm member.
 * Body: { lead_id: number, professional_id: number }
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("api:advisor-portal:firm-leads");

export async function GET(request: NextRequest): Promise<NextResponse> {
  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  const admin = createAdminClient();

  // Verify caller is a firm admin
  const { data: advisor } = await admin
    .from("professionals")
    .select("id, firm_id, is_firm_admin")
    .eq("id", advisorId)
    .maybeSingle();

  if (!advisor?.is_firm_admin || !advisor.firm_id) {
    return NextResponse.json({ error: "Firm admin access required." }, { status: 403 });
  }

  // Fetch all members of the firm
  const { data: members } = await admin
    .from("professionals")
    .select("id, name, slug")
    .eq("firm_id", advisor.firm_id)
    .eq("status", "active");

  if (!members || members.length === 0) {
    return NextResponse.json({ leads: [], members: [] });
  }

  const memberIds = members.map((m) => m.id);

  const url = new URL(request.url);
  const status = url.searchParams.get("status");
  const search = url.searchParams.get("search")?.toLowerCase();

  let query = admin
    .from("professional_leads")
    .select("id, professional_id, user_name, user_email, user_phone, message, source_page, status, advisor_notes, contacted_at, converted_at, created_at, quality_score, bill_amount_cents, billed")
    .in("professional_id", memberIds)
    .order("created_at", { ascending: false })
    .limit(200);

  if (status && status !== "all") {
    query = query.eq("status", status);
  }

  const { data: leads, error } = await query;

  if (error) {
    log.error("firm-leads fetch failed", { error: error.message });
    return NextResponse.json({ error: "Failed to fetch." }, { status: 500 });
  }

  // Attach member name to each lead
  const memberMap = new Map(members.map((m) => [m.id, m]));
  const enriched = (leads ?? [])
    .filter((l) => {
      if (!search) return true;
      return (
        l.user_name?.toLowerCase().includes(search) ||
        l.user_email?.toLowerCase().includes(search) ||
        (l.user_phone ?? "").includes(search)
      );
    })
    .map((l) => ({
      ...l,
      professional_name: memberMap.get(l.professional_id)?.name ?? "Unknown",
      professional_slug: memberMap.get(l.professional_id)?.slug ?? null,
    }));

  return NextResponse.json({ leads: enriched, members });
}

const AssignBody = z.object({
  lead_id: z.number().int().positive(),
  professional_id: z.number().int().positive(),
});

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) {
    return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const parsed = AssignBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();

  // Verify caller is firm admin and target professional is in same firm
  const { data: caller } = await admin
    .from("professionals")
    .select("firm_id, is_firm_admin")
    .eq("id", advisorId)
    .maybeSingle();

  if (!caller?.is_firm_admin || !caller.firm_id) {
    return NextResponse.json({ error: "Firm admin access required." }, { status: 403 });
  }

  const { data: target } = await admin
    .from("professionals")
    .select("id, firm_id")
    .eq("id", parsed.data.professional_id)
    .eq("firm_id", caller.firm_id)
    .maybeSingle();

  if (!target) {
    return NextResponse.json({ error: "Target advisor not in your firm." }, { status: 403 });
  }

  const { error } = await admin
    .from("professional_leads")
    .update({ professional_id: parsed.data.professional_id })
    .eq("id", parsed.data.lead_id);

  if (error) {
    log.error("lead reassign failed", { error: error.message });
    return NextResponse.json({ error: "Failed to reassign." }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
