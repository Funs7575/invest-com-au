// eslint-disable-next-line no-restricted-imports -- agent_memory has service-role-only RLS; afsl_granted_at is read by every consumer-facing footer + checkout, so the read path needs the admin client.
import { createAdminClient } from "@/lib/supabase/admin";

// Read the AFSL-grant gate that Agent #13 writes after ASIC grants
// the licence. Cached lightly (per request via Next's `force-cache`
// semantics on RSC) — the row flips once and stays.
//
// Pairs with .claude/agents/13-licensing.md and the #00 kind-map
// activation gate. Surface this anywhere the AFSL number / status
// should display differently pre- vs post-grant — site footer, the
// /pro/research checkout, every comparison-page disclosure.

export interface AfslStatus {
  granted: boolean;
  /** ISO timestamp when ASIC granted the licence. */
  grantedAt: string | null;
  /** AFSL number issued by ASIC. */
  afslNumber: string | null;
  /** ASIC letter reference (audit trail). */
  letterId: string | null;
}

const PENDING: AfslStatus = {
  granted: false,
  grantedAt: null,
  afslNumber: null,
  letterId: null,
};

/**
 * Returns the AFSL grant state. Returns `granted: false` for any error
 * or missing row — pre-launch is the safer default to render. Callers
 * MUST treat `granted: false` as "show the not-licensed disclosure".
 */
export async function getAfslStatus(): Promise<AfslStatus> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("agent_memory")
      .select("value")
      .eq("agent_name", "licensing")
      .eq("key", "afsl_granted_at")
      .maybeSingle();

    if (error || !data || !data.value || typeof data.value !== "object") {
      return PENDING;
    }
    const value = data.value as Record<string, unknown>;
    const grantedAt = typeof value.granted_at === "string" ? value.granted_at : null;
    if (!grantedAt) return PENDING;

    return {
      granted: true,
      grantedAt,
      afslNumber: typeof value.afsl_number === "string" ? value.afsl_number : null,
      letterId:
        typeof value.granted_by_asic_letter_id === "string"
          ? value.granted_by_asic_letter_id
          : null,
    };
  } catch {
    return PENDING;
  }
}
