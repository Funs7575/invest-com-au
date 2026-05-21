import { describe, expect, it } from "vitest";
import {
  computeLeadBenchmark,
  MIN_PEERS,
  MIN_PEER_LEADS,
} from "@/lib/advisor/lead-benchmark";

function statuses(counts: {
  new?: number;
  contacted?: number;
  converted?: number;
  lost?: number;
}): string[] {
  const out: string[] = [];
  for (const [status, n] of Object.entries(counts)) {
    for (let i = 0; i < (n ?? 0); i++) out.push(status);
  }
  return out;
}

describe("computeLeadBenchmark", () => {
  it("is unavailable (no_type) when the advisor has no type", () => {
    const r = computeLeadBenchmark({
      advisorType: null,
      peerCount: 50,
      peerLeadStatuses: statuses({ converted: 100 }),
      windowDays: 90,
    });
    expect(r).toEqual({ available: false, reason: "no_type" });
  });

  it("is unavailable (insufficient_peers) below the peer floor", () => {
    const r = computeLeadBenchmark({
      advisorType: "financial_planner",
      peerCount: MIN_PEERS - 1,
      peerLeadStatuses: statuses({ converted: 100 }),
      windowDays: 90,
    });
    expect(r.available).toBe(false);
    expect(r.reason).toBe("insufficient_peers");
    expect(r.peer_count).toBe(MIN_PEERS - 1);
    // Privacy: no rates leak when gated.
    expect(r.peer_accept_rate_pct).toBeUndefined();
  });

  it("is unavailable (insufficient_data) below the lead-sample floor", () => {
    const r = computeLeadBenchmark({
      advisorType: "financial_planner",
      peerCount: 10,
      peerLeadStatuses: statuses({ contacted: MIN_PEER_LEADS - 1 }),
      windowDays: 90,
    });
    expect(r.available).toBe(false);
    expect(r.reason).toBe("insufficient_data");
    expect(r.peer_accept_rate_pct).toBeUndefined();
  });

  it("returns aggregate accept + conversion rates when above both floors", () => {
    // 100 leads: 50 converted, 30 contacted, 20 lost.
    // accepted = contacted + converted = 80 → 80.0%; converted = 50 → 50.0%.
    const r = computeLeadBenchmark({
      advisorType: "mortgage_broker",
      peerCount: 12,
      peerLeadStatuses: statuses({ converted: 50, contacted: 30, lost: 20 }),
      windowDays: 90,
    });
    expect(r.available).toBe(true);
    expect(r.advisor_type).toBe("mortgage_broker");
    expect(r.peer_count).toBe(12);
    expect(r.peer_accept_rate_pct).toBe(80);
    expect(r.peer_conversion_rate_pct).toBe(50);
    expect(r.window_days).toBe(90);
  });

  it("rounds rates to one decimal place", () => {
    // 33 converted of 99 total = 33.33% → 33.3
    const r = computeLeadBenchmark({
      advisorType: "accountant",
      peerCount: 8,
      peerLeadStatuses: statuses({ converted: 33, lost: 66 }),
      windowDays: 90,
    });
    expect(r.peer_conversion_rate_pct).toBe(33.3);
  });
});
