/**
 * Account-kind preferences + switch-log helpers (Phase 3).
 *
 * Persists per-user workspace preferences (default kind + last-active
 * kind) and records every workspace switch for audit / debugging.
 * Read on the auth callback so repeat visitors skip the chooser and
 * land back in their last-active workspace; written by the active-kind
 * API on every switch.
 */

// eslint-disable-next-line no-restricted-imports -- cross-user / service-role-managed reads with no per-user JWT path (see CLAUDE.md § "Two Supabase clients").
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type { WorkspaceKind } from "@/lib/account-kinds";

const log = logger("account-preferences");

export type SwitchSource = "switcher" | "chooser" | "deep_link" | "callback";

export interface AccountKindPreferences {
  principalId: string;
  defaultKind: WorkspaceKind | null;
  defaultTeamId: string | null;
  lastActiveKind: WorkspaceKind | null;
  lastActiveTeamId: string | null;
  lastActiveAt: string | null;
}

interface PrefRow {
  principal_id: string;
  default_kind: string | null;
  default_team_id: string | null;
  last_active_kind: string | null;
  last_active_team_id: string | null;
  last_active_at: string | null;
}

function rowToPrefs(r: PrefRow): AccountKindPreferences {
  return {
    principalId: r.principal_id,
    defaultKind: (r.default_kind as WorkspaceKind | null) ?? null,
    defaultTeamId: r.default_team_id,
    lastActiveKind: (r.last_active_kind as WorkspaceKind | null) ?? null,
    lastActiveTeamId: r.last_active_team_id,
    lastActiveAt: r.last_active_at,
  };
}

/**
 * Fetch the user's stored preferences. Returns null when no row exists
 * yet (first-time multi-kind user — the chooser should show).
 */
export async function getKindPreferences(
  principalId: string,
): Promise<AccountKindPreferences | null> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("account_kind_preferences")
      .select("principal_id, default_kind, default_team_id, last_active_kind, last_active_team_id, last_active_at")
      .eq("principal_id", principalId)
      .maybeSingle();
    if (error) {
      log.warn("getKindPreferences failed", { principalId, error: error.message });
      return null;
    }
    return data ? rowToPrefs(data as PrefRow) : null;
  } catch (err) {
    log.warn("getKindPreferences threw", {
      principalId,
      err: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Set the user's pinned default workspace. Pass null to clear.
 * Upserts — first call creates the row.
 */
export async function setDefaultKind(opts: {
  principalId: string;
  kind: WorkspaceKind | null;
  teamId?: string | null;
}): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("account_kind_preferences")
      .upsert(
        {
          principal_id: opts.principalId,
          default_kind: opts.kind,
          default_team_id: opts.teamId ?? null,
        },
        { onConflict: "principal_id" },
      );
    if (error) {
      log.warn("setDefaultKind failed", {
        principalId: opts.principalId,
        error: error.message,
      });
      return false;
    }
    return true;
  } catch (err) {
    log.warn("setDefaultKind threw", {
      principalId: opts.principalId,
      err: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}

/**
 * Record a workspace switch. Updates last_active_* on the preferences
 * row (upserting if needed) and appends a row to account_kind_switch_log.
 * Best-effort — never throws, returns success/failure for caller logging.
 */
export async function recordSwitch(opts: {
  principalId: string;
  fromKind: WorkspaceKind | null;
  fromTeamId?: string | null;
  toKind: WorkspaceKind;
  toTeamId?: string | null;
  source: SwitchSource;
}): Promise<boolean> {
  try {
    const supabase = createAdminClient();
    const now = new Date().toISOString();

    // Upsert preferences row to keep last_active fresh.
    const { error: prefErr } = await supabase
      .from("account_kind_preferences")
      .upsert(
        {
          principal_id: opts.principalId,
          last_active_kind: opts.toKind,
          last_active_team_id: opts.toTeamId ?? null,
          last_active_at: now,
        },
        { onConflict: "principal_id" },
      );
    if (prefErr) {
      log.warn("recordSwitch preferences upsert failed", {
        principalId: opts.principalId,
        error: prefErr.message,
      });
    }

    const { error: logErr } = await supabase
      .from("account_kind_switch_log")
      .insert({
        principal_id: opts.principalId,
        from_kind: opts.fromKind,
        from_team_id: opts.fromTeamId ?? null,
        to_kind: opts.toKind,
        to_team_id: opts.toTeamId ?? null,
        source: opts.source,
      });
    if (logErr) {
      log.warn("recordSwitch log insert failed", {
        principalId: opts.principalId,
        error: logErr.message,
      });
    }

    return !prefErr && !logErr;
  } catch (err) {
    log.warn("recordSwitch threw", {
      principalId: opts.principalId,
      err: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}
