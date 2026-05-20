/**
 * Agent + internal-team identity registry (Idea #15) — ADDITIVE reader.
 *
 * Read/register helpers over the agents + internal_team_members tables.
 * The registry is the future home for the 19 agents' first-class identity
 * (replacing the free-text agent_name in agent_logs) and the internal team
 * (founders / responsible manager / editorial collaborator).
 *
 * IMPORTANT: this module does NOT migrate the live agent_logs write path.
 * Backfilling the agents + flipping agent_name → agent_id (with the
 * dual-write trigger) is the founder-owned R1-HIGH cutover documented in
 * the expansion plan. registerAgent() exists so that backfill can be done
 * deliberately when the founder is ready, but nothing calls it yet.
 */

// eslint-disable-next-line no-restricted-imports -- cross-user / service-role-managed reads with no per-user JWT path (see CLAUDE.md § "Two Supabase clients").
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("agents-registry");

export interface Agent {
  id: number;
  principalId: string | null;
  number: number | null;
  slug: string;
  displayName: string;
  defaultTier: number | null;
  cadence: string | null;
  activatesPostAfsl: boolean;
  deactivatedAt: string | null;
}

interface AgentRow {
  id: number;
  principal_id: string | null;
  number: number | null;
  slug: string;
  display_name: string;
  default_tier: number | null;
  cadence: string | null;
  activates_post_afsl: boolean;
  deactivated_at: string | null;
}

function rowToAgent(r: AgentRow): Agent {
  return {
    id: r.id,
    principalId: r.principal_id,
    number: r.number,
    slug: r.slug,
    displayName: r.display_name,
    defaultTier: r.default_tier,
    cadence: r.cadence,
    activatesPostAfsl: r.activates_post_afsl,
    deactivatedAt: r.deactivated_at,
  };
}

export async function getAgentBySlug(slug: string): Promise<Agent | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("agents")
      .select("id, principal_id, number, slug, display_name, default_tier, cadence, activates_post_afsl, deactivated_at")
      .eq("slug", slug)
      .maybeSingle();
    if (error || !data) return null;
    return rowToAgent(data as AgentRow);
  } catch (err) {
    log.warn("getAgentBySlug threw", { slug, err: err instanceof Error ? err.message : String(err) });
    return null;
  }
}

export async function listActiveAgents(): Promise<Agent[]> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("agents")
      .select("id, principal_id, number, slug, display_name, default_tier, cadence, activates_post_afsl, deactivated_at")
      .is("deactivated_at", null)
      .order("number", { ascending: true });
    if (error) return [];
    return (data ?? []).map((r) => rowToAgent(r as AgentRow));
  } catch {
    return [];
  }
}

/**
 * Register an agent: create its principal (kind='agent', no auth_user_id)
 * and the agents row. Idempotent on slug. Provided for the founder-owned
 * backfill — NOT called automatically. Returns the agent id or null.
 */
export async function registerAgent(opts: {
  number: number;
  slug: string;
  displayName: string;
  specFile?: string | null;
  defaultTier?: number | null;
  cadence?: string | null;
  activatesPostAfsl?: boolean;
}): Promise<number | null> {
  try {
    const supabase = createAdminClient();

    // Reuse an existing agent row if the slug is already registered.
    const existing = await getAgentBySlug(opts.slug);
    if (existing) return existing.id;

    const { data: principal, error: pErr } = await supabase
      .from("principals")
      .insert({
        kind: "agent",
        display_name: opts.displayName,
        slug: `agent-${opts.slug}`,
        status: "active",
      })
      .select("id")
      .single();
    if (pErr || !principal) {
      log.warn("registerAgent principal insert failed", { slug: opts.slug, error: pErr?.message });
      return null;
    }

    const { data: agent, error: aErr } = await supabase
      .from("agents")
      .insert({
        principal_id: principal.id,
        number: opts.number,
        slug: opts.slug,
        display_name: opts.displayName,
        spec_file: opts.specFile ?? null,
        default_tier: opts.defaultTier ?? null,
        cadence: opts.cadence ?? null,
        activates_post_afsl: opts.activatesPostAfsl ?? false,
      })
      .select("id")
      .single();
    if (aErr || !agent) {
      log.warn("registerAgent agents insert failed", { slug: opts.slug, error: aErr?.message });
      return null;
    }
    return agent.id as number;
  } catch (err) {
    log.warn("registerAgent threw", { slug: opts.slug, err: err instanceof Error ? err.message : String(err) });
    return null;
  }
}
