/**
 * Squad analytics — funnel metrics + cohort comparison + member contributions
 * for the members-only dashboard at /teams/[slug]/dashboard.
 *
 * Each helper is fail-safe: returns sensible zero defaults on DB errors so
 * one bad table doesn't 500 the dashboard.
 */
// eslint-disable-next-line no-restricted-imports -- dashboard reads cross-table on the squad's behalf; service-role keeps the surface server-rendered without retuning RLS for joined visibility checks.
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("squad-analytics");

export interface FunnelMetrics {
  briefs_visible: number;
  briefs_accepted: number;
  consultations_booked: number;
  outcomes_completed: number;
}

export const EMPTY_FUNNEL: FunnelMetrics = {
  briefs_visible: 0,
  briefs_accepted: 0,
  consultations_booked: 0,
  outcomes_completed: 0,
};

export function ratesFromFunnel(funnel: FunnelMetrics): {
  accept_rate: number;
  book_rate: number;
  complete_rate: number;
} {
  return {
    accept_rate: pct(funnel.briefs_accepted, funnel.briefs_visible),
    book_rate: pct(funnel.consultations_booked, funnel.briefs_accepted),
    complete_rate: pct(funnel.outcomes_completed, funnel.consultations_booked),
  };
}

function pct(numerator: number, denominator: number): number {
  if (!denominator || denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10; // 1 decimal
}

export async function getFunnelMetrics(
  teamId: number,
  fromDate: Date,
  toDate: Date,
): Promise<FunnelMetrics> {
  try {
    const admin = createAdminClient();
    const fromIso = fromDate.toISOString();
    const toIso = toDate.toISOString();

    const [visibleRes, acceptedRes, bookedRes, completedRes] = await Promise.all(
      [
        admin
          .from("advisor_auctions")
          .select("id", { count: "exact", head: true })
          .eq("flow_type", "accept")
          .gte("created_at", fromIso)
          .lte("created_at", toIso),
        admin
          .from("advisor_auctions")
          .select("id", { count: "exact", head: true })
          .eq("accepted_by_team_id", teamId)
          .gte("accepted_at", fromIso)
          .lte("accepted_at", toIso),
        admin
          .from("consultation_bookings")
          .select("brief_id, status, created_at, advisor_auctions!inner(accepted_by_team_id)", {
            count: "exact",
            head: true,
          })
          .eq("advisor_auctions.accepted_by_team_id", teamId)
          .gte("created_at", fromIso)
          .lte("created_at", toIso),
        admin
          .from("brief_outcomes")
          .select("id", { count: "exact", head: true })
          .eq("outcome", "completed")
          .eq("team_id", teamId)
          .gte("submitted_at", fromIso)
          .lte("submitted_at", toIso),
      ],
    );
    return {
      briefs_visible: visibleRes.count ?? 0,
      briefs_accepted: acceptedRes.count ?? 0,
      consultations_booked: bookedRes.count ?? 0,
      outcomes_completed: completedRes.count ?? 0,
    };
  } catch (err) {
    log.warn("getFunnelMetrics failed", {
      teamId,
      err: err instanceof Error ? err.message : String(err),
    });
    return EMPTY_FUNNEL;
  }
}

export async function getResponseLatencyMinutes(
  teamId: number,
  fromDate: Date,
  toDate: Date,
): Promise<number | null> {
  try {
    const admin = createAdminClient();
    const { data } = await admin
      .from("advisor_auctions")
      .select("created_at, accepted_at")
      .eq("accepted_by_team_id", teamId)
      .gte("accepted_at", fromDate.toISOString())
      .lte("accepted_at", toDate.toISOString())
      .not("accepted_at", "is", null);
    if (!data || data.length === 0) return null;
    let total = 0;
    let n = 0;
    for (const row of data as Array<{ created_at: string; accepted_at: string }>) {
      const ms =
        new Date(row.accepted_at).getTime() - new Date(row.created_at).getTime();
      if (ms > 0 && ms < 90 * 24 * 60 * 60 * 1000) {
        total += ms;
        n++;
      }
    }
    if (n === 0) return null;
    return Math.round(total / n / 60_000);
  } catch (err) {
    log.warn("getResponseLatency failed", {
      teamId,
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export interface CohortComparison {
  current: FunnelMetrics;
  previous: FunnelMetrics;
  delta_accept: number;
  delta_complete: number;
}

export async function getCohortComparison(
  teamId: number,
  periodDays: number,
): Promise<CohortComparison> {
  const now = new Date();
  const currentStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
  const previousStart = new Date(now.getTime() - 2 * periodDays * 24 * 60 * 60 * 1000);

  const [current, previous] = await Promise.all([
    getFunnelMetrics(teamId, currentStart, now),
    getFunnelMetrics(teamId, previousStart, currentStart),
  ]);

  return {
    current,
    previous,
    delta_accept: current.briefs_accepted - previous.briefs_accepted,
    delta_complete: current.outcomes_completed - previous.outcomes_completed,
  };
}

export interface MemberContribution {
  professional_id: number;
  name: string;
  briefs_accepted: number;
  outcomes_completed: number;
  avg_rating: number | null;
}

export async function getMemberContributions(
  teamId: number,
  fromDate: Date,
  toDate: Date,
): Promise<MemberContribution[]> {
  try {
    const admin = createAdminClient();
    const { data: members } = await admin
      .from("expert_team_members")
      .select("professional_id, professionals!inner(id, name)")
      .eq("team_id", teamId)
      .eq("status", "active");
    if (!members || members.length === 0) return [];

    const result: MemberContribution[] = [];
    for (const m of members as unknown as Array<{
      professional_id: number;
      professionals: { id: number; name: string } | Array<{ id: number; name: string }>;
    }>) {
      const proRecord = Array.isArray(m.professionals)
        ? m.professionals[0]
        : m.professionals;
      const [acceptedRes, outcomesRes] = await Promise.all([
        admin
          .from("advisor_auctions")
          .select("id", { count: "exact", head: true })
          .eq("accepted_by_professional_id", m.professional_id)
          .eq("accepted_by_team_id", teamId)
          .gte("accepted_at", fromDate.toISOString())
          .lte("accepted_at", toDate.toISOString()),
        admin
          .from("brief_outcomes")
          .select("rating, outcome")
          .eq("professional_id", m.professional_id)
          .eq("team_id", teamId)
          .gte("submitted_at", fromDate.toISOString())
          .lte("submitted_at", toDate.toISOString()),
      ]);
      const outcomes = (outcomesRes.data ?? []) as Array<{
        rating: number | null;
        outcome: string;
      }>;
      const ratings = outcomes
        .map((o) => o.rating)
        .filter((r): r is number => typeof r === "number");
      result.push({
        professional_id: m.professional_id,
        name: proRecord?.name ?? `Pro #${m.professional_id}`,
        briefs_accepted: acceptedRes.count ?? 0,
        outcomes_completed: outcomes.filter((o) => o.outcome === "completed").length,
        avg_rating:
          ratings.length > 0
            ? Math.round((ratings.reduce((a, b) => a + b, 0) / ratings.length) * 10) / 10
            : null,
      });
    }
    return result.sort((a, b) => b.briefs_accepted - a.briefs_accepted);
  } catch (err) {
    log.warn("getMemberContributions failed", {
      teamId,
      err: err instanceof Error ? err.message : String(err),
    });
    return [];
  }
}
