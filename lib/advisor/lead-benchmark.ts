/**
 * Lead-quality peer benchmark (B5).
 *
 * Computes an advisor's same-type peer-group lead-quality aggregate so the
 * advisor can benchmark their own accept/conversion rates. PRIVACY: this only
 * ever returns aggregates, and is gated behind a minimum peer count AND a
 * minimum total-lead sample so no individual competitor's data can be inferred.
 * The pure computation lives here so it can be unit-tested without a DB.
 */

/** Minimum distinct same-type peers before any benchmark is returned. */
export const MIN_PEERS = 5;
/** Minimum total peer leads in the window before a benchmark is returned. */
export const MIN_PEER_LEADS = 30;

export type LeadBenchmarkReason =
  | "no_type"
  | "insufficient_peers"
  | "insufficient_data";

export interface LeadBenchmark {
  available: boolean;
  reason?: LeadBenchmarkReason;
  window_days?: number;
  advisor_type?: string;
  peer_count?: number;
  peer_accept_rate_pct?: number;
  peer_conversion_rate_pct?: number;
}

function rate(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0;
}

/**
 * Build the benchmark from a peer set's lead statuses. `peerLeadStatuses` is
 * the flat list of `professional_leads.status` across all same-type peers in
 * the window — never grouped by advisor, so no per-peer figure is exposed.
 */
export function computeLeadBenchmark(params: {
  advisorType: string | null;
  peerCount: number;
  peerLeadStatuses: string[];
  windowDays: number;
}): LeadBenchmark {
  const { advisorType, peerCount, peerLeadStatuses, windowDays } = params;

  if (!advisorType) return { available: false, reason: "no_type" };
  if (peerCount < MIN_PEERS) {
    return { available: false, reason: "insufficient_peers", peer_count: peerCount };
  }

  const total = peerLeadStatuses.length;
  if (total < MIN_PEER_LEADS) {
    return { available: false, reason: "insufficient_data", peer_count: peerCount };
  }

  const accepted = peerLeadStatuses.filter(
    (s) => s === "contacted" || s === "converted",
  ).length;
  const converted = peerLeadStatuses.filter((s) => s === "converted").length;

  return {
    available: true,
    window_days: windowDays,
    advisor_type: advisorType,
    peer_count: peerCount,
    peer_accept_rate_pct: rate(accepted, total),
    peer_conversion_rate_pct: rate(converted, total),
  };
}
