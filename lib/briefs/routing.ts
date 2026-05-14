/**
 * Brief routing — `resolveEligibleProviders(brief)` returns an ordered
 * list of providers eligible to see the brief preview.
 *
 * Rules live in `brief_routing_rules`. Each rule has:
 *   - match_conditions: jsonb filter (subset-equality on brief fields)
 *   - route_to: jsonb action describing preferred provider kind + extras
 *
 * For `routing_mode='direct'` we route ONLY to the target_* the user
 * picked. Otherwise we apply matching rules in priority order and
 * concatenate eligible providers (deduped by kind+id).
 *
 * The function is intentionally simple: it returns up to 50 eligible
 * providers for the brief. The provider's inbox endpoint filters
 * further (subscription, country eligibility, accepts_new_clients).
 */

// eslint-disable-next-line no-restricted-imports -- routing cross-references advisor_firms + expert_teams + professionals across users; service-role legitimate (anon-RLS cannot see all rows).
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

import type { BriefRow, EligibleProvider, ProviderKind } from "./types";

const log = logger("briefs:routing");

interface RoutingRuleRow {
  id: number;
  name: string;
  priority: number;
  enabled: boolean;
  match_conditions: Record<string, unknown>;
  route_to: Record<string, unknown>;
}

const MAX_RESULTS = 50;

export async function resolveEligibleProviders(
  brief: BriefRow,
): Promise<EligibleProvider[]> {
  // Direct routing short-circuits rule evaluation.
  if (brief.routing_mode === "direct") {
    return directProviders(brief);
  }

  const admin = createAdminClient();
  const { data: rulesData } = await admin
    .from("brief_routing_rules")
    .select("id, name, priority, enabled, match_conditions, route_to")
    .eq("enabled", true)
    .order("priority", { ascending: true });

  const rules = (rulesData ?? []) as RoutingRuleRow[];

  // First matching rule wins for ordering; if none matches, fall through
  // to the implicit any-provider behaviour.
  const matched = rules.find((r) => ruleMatches(r.match_conditions, brief));

  if (!matched) {
    log.info("resolveEligibleProviders: no rule matched", { briefId: brief.id });
    return anyProviders(brief);
  }

  const prefer = (matched.route_to.prefer ?? "any") as ProviderKind | "any";
  const fallback = Array.isArray(matched.route_to.fallback)
    ? (matched.route_to.fallback as ProviderKind[])
    : [];
  const teamCategory =
    typeof matched.route_to.team_category === "string"
      ? (matched.route_to.team_category as string)
      : null;

  const out: EligibleProvider[] = [];

  if (prefer === "expert_team") {
    out.push(...(await fetchExpertTeams(brief, teamCategory)));
  } else if (prefer === "individual") {
    out.push(...(await fetchIndividuals(brief)));
  } else if (prefer === "firm") {
    out.push(...(await fetchFirms(brief)));
  } else {
    out.push(
      ...(await fetchExpertTeams(brief, teamCategory)),
      ...(await fetchIndividuals(brief)),
      ...(await fetchFirms(brief)),
    );
  }

  for (const fb of fallback) {
    if (fb === "expert_team") out.push(...(await fetchExpertTeams(brief, teamCategory)));
    if (fb === "individual") out.push(...(await fetchIndividuals(brief)));
    if (fb === "firm") out.push(...(await fetchFirms(brief)));
  }

  return dedupe(out).slice(0, MAX_RESULTS);
}

function ruleMatches(conditions: Record<string, unknown>, brief: BriefRow): boolean {
  for (const [key, value] of Object.entries(conditions)) {
    if (key === "brief_template" && brief.brief_template !== value) return false;
    if (key === "provider_preference" && brief.provider_preference !== value) return false;
    if (key === "routing_mode" && brief.routing_mode !== value) return false;
    if (key === "help_needed") {
      const payload = brief.brief_payload ?? {};
      const hn = (payload as Record<string, unknown>).help_needed;
      const target = String(value);
      if (Array.isArray(hn)) {
        if (!hn.map(String).includes(target)) return false;
      } else if (String(hn) !== target) {
        return false;
      }
    }
  }
  return true;
}

function dedupe(list: EligibleProvider[]): EligibleProvider[] {
  const seen = new Set<string>();
  const out: EligibleProvider[] = [];
  for (const p of list) {
    const key = `${p.kind}:${p.id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(p);
  }
  return out;
}

async function directProviders(brief: BriefRow): Promise<EligibleProvider[]> {
  const out: EligibleProvider[] = [];
  if (brief.target_team_id) {
    out.push({
      kind: "expert_team",
      id: brief.target_team_id,
      reason: "direct_target",
      score: 100,
    });
  }
  if (brief.target_professional_id) {
    out.push({
      kind: "individual",
      id: brief.target_professional_id,
      reason: "direct_target",
      score: 100,
    });
  }
  if (brief.target_firm_id) {
    out.push({
      kind: "firm",
      id: brief.target_firm_id,
      reason: "direct_target",
      score: 100,
    });
  }
  return out;
}

async function anyProviders(brief: BriefRow): Promise<EligibleProvider[]> {
  return dedupe([
    ...(await fetchExpertTeams(brief, null)),
    ...(await fetchIndividuals(brief)),
    ...(await fetchFirms(brief)),
  ]).slice(0, MAX_RESULTS);
}

async function fetchExpertTeams(
  brief: BriefRow,
  teamCategory: string | null,
): Promise<EligibleProvider[]> {
  if (brief.provider_preference === "individual" || brief.provider_preference === "firm") {
    return [];
  }
  const admin = createAdminClient();
  let q = admin
    .from("expert_teams")
    .select("id, team_category, accepts_briefs, verification_status, public")
    .eq("public", true)
    .eq("verification_status", "verified")
    .eq("accepts_briefs", true);
  if (teamCategory) q = q.eq("team_category", teamCategory);
  if (brief.brief_template) {
    // Match teams whose accepted_brief_templates is empty (no restriction) or
    // contains this template. PostgREST `or` syntax with array `cs.{…}`.
    q = q.or(
      `accepted_brief_templates.cs.{${brief.brief_template}},accepted_brief_templates.eq.{}`,
    );
  }
  const { data } = await q.limit(20);
  return (data ?? []).map((t) => ({
    kind: "expert_team" as const,
    id: t.id as number,
    reason: teamCategory ? `team_category=${teamCategory}` : "verified_team",
    score: 90,
  }));
}

async function fetchIndividuals(brief: BriefRow): Promise<EligibleProvider[]> {
  if (brief.provider_preference === "firm" || brief.provider_preference === "expert_team") {
    return [];
  }
  const admin = createAdminClient();
  const types =
    brief.advisor_types && brief.advisor_types.length > 0 ? brief.advisor_types : null;
  let q = admin
    .from("professionals")
    .select("id, type, accepts_new_clients, status")
    .eq("status", "active")
    .eq("accepts_new_clients", true);
  if (types) q = q.in("type", types);
  if (brief.location) q = q.or(`location_state.eq.${brief.location},location_state.is.null`);
  const { data } = await q.limit(20);
  return (data ?? []).map((p) => ({
    kind: "individual" as const,
    id: p.id as number,
    reason: types ? `type=${p.type}` : "active_individual",
    score: 70,
  }));
}

async function fetchFirms(brief: BriefRow): Promise<EligibleProvider[]> {
  if (
    brief.provider_preference === "individual" ||
    brief.provider_preference === "expert_team"
  ) {
    return [];
  }
  const admin = createAdminClient();
  const { data } = await admin
    .from("advisor_firms")
    .select("id, status, location_state")
    .eq("status", "active")
    .limit(20);
  return (data ?? []).map((f) => ({
    kind: "firm" as const,
    id: f.id as number,
    reason: "active_firm",
    score: 60,
  }));
}
