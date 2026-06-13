/**
 * GET  /api/advisor-portal/firm-routing
 * PUT  /api/advisor-portal/firm-routing
 *
 * Manager console for Firm Lead-Ops (mega-session #13). Firm-admins only.
 *
 * GET returns:
 *   - flagEnabled        — whether the firm_routing feature is on
 *   - policy             — the firm's current routing_policy (parsed)
 *   - members            — firm members + per-member stats (response/win from
 *                          advisor_metrics_daily where available; availability)
 *   - assignments        — recent lead_assignments audit rows (enriched)
 *   - unavailableCount   — members currently closed for new clients
 *
 * PUT body { mode, specialty_map? } persists advisor_firms.routing_policy.
 *
 * When the `firm_routing` flag is OFF the GET still returns the firm's members
 * + saved policy (read-only context) with flagEnabled:false, and PUT returns
 * 403 — the editor is inert until the flag is on. Manual assignment (the
 * existing /firm-leads dropdown) keeps working regardless.
 */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { isFlagEnabled } from "@/lib/feature-flags";
import { logger } from "@/lib/logger";
import {
  ROUTING_MODES,
  isRoutingMode,
  parseRoutingPolicy,
  type AvailabilityStatus,
} from "@/lib/firm-routing";
import { FIRM_ROUTING_FLAG } from "@/lib/firm-routing-runtime";
import { getFirmPerformanceSummary } from "@/lib/firm-performance";

const log = logger("api:advisor-portal:firm-routing");

interface FirmAdmin {
  id: number;
  firmId: number;
}

async function resolveFirmAdmin(
  request: NextRequest,
  admin: ReturnType<typeof createAdminClient>,
): Promise<FirmAdmin | { error: string; status: number }> {
  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) return { error: "Sign in required.", status: 401 };

  const { data: advisor } = await admin
    .from("professionals")
    .select("id, firm_id, is_firm_admin")
    .eq("id", advisorId)
    .maybeSingle();

  const row = advisor as
    | { id: number; firm_id: number | null; is_firm_admin: boolean | null }
    | null;
  if (!row?.is_firm_admin || !row.firm_id) {
    return { error: "Firm admin access required.", status: 403 };
  }
  return { id: row.id, firmId: row.firm_id };
}

function normaliseAvailability(value: string | null): AvailabilityStatus {
  return value === "waitlist" || value === "closed" ? value : "open";
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (
    !(await isAllowed("advisor_firm_routing_get", ipKey(request), {
      max: 30,
      refillPerSec: 0.5,
    }))
  ) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const admin = createAdminClient();
  const ctx = await resolveFirmAdmin(request, admin);
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  const flagEnabled = await isFlagEnabled(FIRM_ROUTING_FLAG, {
    segment: "advisor",
  });

  // Firm + saved policy.
  const { data: firmData } = await admin
    .from("advisor_firms")
    .select("id, name, routing_policy")
    .eq("id", ctx.firmId)
    .maybeSingle();
  const firm = firmData as
    | { id: number; name: string; routing_policy: unknown }
    | null;
  if (!firm) {
    return NextResponse.json({ error: "Firm not found." }, { status: 404 });
  }
  const policy = parseRoutingPolicy(firm.routing_policy);

  // Members (active) + availability + type for the specialty map editor.
  const { data: memberData } = await admin
    .from("professionals")
    .select("id, name, slug, type, status, availability_status")
    .eq("firm_id", ctx.firmId)
    .eq("status", "active")
    .order("name");
  const memberRows = (memberData ?? []) as {
    id: number;
    name: string;
    slug: string;
    type: string | null;
    status: string | null;
    availability_status: string | null;
  }[];

  // Per-member performance (views / enquiries / response / win-equivalent)
  // from the shared firm-performance helper — honest gaps where no metrics
  // exist (zeros / nulls). Best-effort: a failure just omits the stats.
  let perfMap = new Map<
    number,
    {
      enquiries30d: number;
      views30d: number;
      responseScore: number;
      avgRating: number | null;
      reviewCount: number;
    }
  >();
  try {
    const perf = await getFirmPerformanceSummary(ctx.firmId, { client: admin });
    if (perf) {
      perfMap = new Map(
        perf.members.map((m) => [
          m.professionalId,
          {
            enquiries30d: m.enquiries30d,
            views30d: m.views30d,
            responseScore: m.responseScore,
            avgRating: m.avgRating,
            reviewCount: m.reviewCount,
          },
        ]),
      );
    }
  } catch (err) {
    log.warn("firm-routing perf load failed", {
      firmId: ctx.firmId,
      err: err instanceof Error ? err.message : String(err),
    });
  }

  const members = memberRows.map((m) => {
    const perf = perfMap.get(m.id);
    return {
      id: m.id,
      name: m.name,
      slug: m.slug,
      type: m.type,
      availabilityStatus: normaliseAvailability(m.availability_status),
      enquiries30d: perf?.enquiries30d ?? null,
      views30d: perf?.views30d ?? null,
      responseScore: perf?.responseScore ?? null,
      avgRating: perf?.avgRating ?? null,
      reviewCount: perf?.reviewCount ?? null,
    };
  });

  const unavailableCount = members.filter(
    (m) => m.availabilityStatus === "closed",
  ).length;

  // Recent assignment audit rows (most recent first).
  const { data: assignmentData } = await admin
    .from("lead_assignments")
    .select("id, lead_ref, professional_id, assigned_by, assigned_at, reassigned_from")
    .eq("firm_id", ctx.firmId)
    .order("assigned_at", { ascending: false })
    .limit(50);
  const assignmentRows = (assignmentData ?? []) as {
    id: number;
    lead_ref: string;
    professional_id: number;
    assigned_by: string;
    assigned_at: string;
    reassigned_from: number | null;
  }[];

  const nameById = new Map(members.map((m) => [m.id, m.name]));
  const assignments = assignmentRows.map((a) => ({
    id: a.id,
    leadRef: a.lead_ref,
    professionalId: a.professional_id,
    professionalName: nameById.get(a.professional_id) ?? "Unknown",
    assignedBy: a.assigned_by,
    assignedAt: a.assigned_at,
    reassignedFrom: a.reassigned_from,
    reassignedFromName:
      a.reassigned_from !== null
        ? (nameById.get(a.reassigned_from) ?? "Former member")
        : null,
  }));

  return NextResponse.json({
    flagEnabled,
    modes: ROUTING_MODES,
    policy,
    members,
    unavailableCount,
    assignments,
  });
}

const PutBody = z.object({
  mode: z.enum(["manual", "round_robin", "load_balanced", "specialty"]),
  // Map of lead-type/need slug → professional_id. Values must be positive
  // ints; keys are bounded to keep the jsonb small.
  specialty_map: z
    .record(z.string().min(1).max(64), z.number().int().positive())
    .optional(),
});

export async function PUT(request: NextRequest): Promise<NextResponse> {
  if (
    !(await isAllowed("advisor_firm_routing_put", ipKey(request), {
      max: 20,
      refillPerSec: 0.2,
    }))
  ) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const admin = createAdminClient();
  const ctx = await resolveFirmAdmin(request, admin);
  if ("error" in ctx) {
    return NextResponse.json({ error: ctx.error }, { status: ctx.status });
  }

  // Editing the policy is gated on the flag — the engine that would honour it
  // is dormant otherwise, so we refuse writes to avoid silent dead config.
  if (!(await isFlagEnabled(FIRM_ROUTING_FLAG, { segment: "advisor" }))) {
    return NextResponse.json(
      { error: "Lead routing is not enabled for your account yet." },
      { status: 403 },
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const parsed = PutBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid body." },
      { status: 400 },
    );
  }

  // Defensive: confirm the mode is a known routing mode (belt-and-braces with
  // the zod enum, and keeps the runtime contract obvious).
  if (!isRoutingMode(parsed.data.mode)) {
    return NextResponse.json({ error: "Unknown routing mode." }, { status: 400 });
  }

  // Validate specialty_map targets are members of THIS firm. Silently drop
  // any that aren't, so a stale map entry (member left the firm) can't point
  // leads at an outsider.
  let specialty_map: Record<string, number> | undefined;
  if (parsed.data.mode === "specialty" && parsed.data.specialty_map) {
    const targetIds = [...new Set(Object.values(parsed.data.specialty_map))];
    const { data: validRows } = await admin
      .from("professionals")
      .select("id")
      .eq("firm_id", ctx.firmId)
      .eq("status", "active")
      .in("id", targetIds);
    const validIds = new Set(
      ((validRows ?? []) as { id: number }[]).map((r) => r.id),
    );
    const cleaned: Record<string, number> = {};
    for (const [key, id] of Object.entries(parsed.data.specialty_map)) {
      if (validIds.has(id)) cleaned[key] = id;
    }
    if (Object.keys(cleaned).length > 0) specialty_map = cleaned;
  }

  const policy = specialty_map
    ? { mode: parsed.data.mode, specialty_map }
    : { mode: parsed.data.mode };

  const { error } = await admin
    .from("advisor_firms")
    .update({ routing_policy: policy } as Record<string, unknown>)
    .eq("id", ctx.firmId);

  if (error) {
    log.error("routing policy update failed", {
      firmId: ctx.firmId,
      error: error.message,
    });
    return NextResponse.json(
      { error: "Failed to save routing policy." },
      { status: 500 },
    );
  }

  log.info("routing policy updated", {
    firmId: ctx.firmId,
    mode: policy.mode,
  });
  return NextResponse.json({ ok: true, policy });
}
