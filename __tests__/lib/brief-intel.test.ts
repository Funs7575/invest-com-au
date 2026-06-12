import { describe, it, expect } from "vitest";

import {
  medianOf,
  extractPostcode,
  parseTargetLocation,
  medianBudgetBand,
  summariseSimilarBriefs,
  summariseTrackRecord,
  suggestedResponseWindow,
  qualityBandForBrief,
  SIMILAR_BRIEFS_MIN_SAMPLE,
  ACCEPTED_MEDIAN_MIN_SAMPLE,
  TRACK_RECORD_MIN_SAMPLE,
  INTEL_WINDOW_DAYS,
  type SimilarBriefRowLite,
  type TrackRecordBidLite,
} from "@/lib/brief-intel";
import type { BriefRow } from "@/lib/briefs/types";

// ─── medianOf ──────────────────────────────────────────────────────────────

describe("medianOf", () => {
  it("returns null for an empty array", () => {
    expect(medianOf([])).toBeNull();
  });

  it("returns the single value for a one-element array", () => {
    expect(medianOf([7])).toBe(7);
  });

  it("returns the middle value for odd-length input", () => {
    expect(medianOf([3, 1, 2])).toBe(2);
  });

  it("averages the middle pair for even-length input", () => {
    expect(medianOf([1, 2, 3, 4])).toBe(2.5);
  });

  it("does not mutate the input array", () => {
    const input = [3, 1, 2];
    medianOf(input);
    expect(input).toEqual([3, 1, 2]);
  });
});

// ─── extractPostcode ─────────────────────────────────────────────────────────

describe("extractPostcode", () => {
  it("returns null for null/undefined/empty", () => {
    expect(extractPostcode(null)).toBeNull();
    expect(extractPostcode(undefined)).toBeNull();
    expect(extractPostcode("")).toBeNull();
  });

  it("returns null when there is no 4-digit token", () => {
    expect(extractPostcode("Brisbane inner suburbs")).toBeNull();
  });

  it("extracts a trailing postcode", () => {
    expect(extractPostcode("Parramatta NSW 2150")).toBe("2150");
  });

  it("prefers the LAST standalone 4-digit token", () => {
    expect(extractPostcode("Unit 4000, Carlton VIC 3053")).toBe("3053");
  });

  it("ignores tokens with more than 4 digits", () => {
    expect(extractPostcode("lot 12345")).toBeNull();
  });

  it("rejects values below the valid postcode floor (200)", () => {
    expect(extractPostcode("apartment 0100")).toBeNull();
  });

  it("accepts the lower boundary 0200", () => {
    expect(extractPostcode("Australian National University 0200")).toBe("0200");
  });
});

// ─── parseTargetLocation ─────────────────────────────────────────────────────

describe("parseTargetLocation", () => {
  it("returns all-null for empty input (missing location)", () => {
    expect(parseTargetLocation(null)).toEqual({
      postcode: null,
      phrase: null,
      stateHint: null,
    });
    expect(parseTargetLocation("   ")).toEqual({
      postcode: null,
      phrase: null,
      stateHint: null,
    });
  });

  it("splits a full location into postcode, phrase and state code", () => {
    const r = parseTargetLocation("Parramatta NSW 2150");
    expect(r.postcode).toBe("2150");
    expect(r.stateHint).toBe("NSW");
    expect(r.phrase).toBe("Parramatta");
  });

  it("normalises a full state name to its code", () => {
    const r = parseTargetLocation("Carlton Victoria");
    expect(r.stateHint).toBe("VIC");
    expect(r.phrase).toBe("Carlton");
  });

  it("keeps only the first comma-delimited segment as the phrase", () => {
    const r = parseTargetLocation("Bondi Beach, Eastern Suburbs");
    expect(r.phrase).toBe("Bondi Beach");
  });

  it("drops a phrase shorter than 3 chars", () => {
    const r = parseTargetLocation("WA 6000");
    expect(r.phrase).toBeNull();
    expect(r.stateHint).toBe("WA");
    expect(r.postcode).toBe("6000");
  });
});

// ─── medianBudgetBand ────────────────────────────────────────────────────────

describe("medianBudgetBand", () => {
  it("returns null when no valid bands are present", () => {
    expect(medianBudgetBand([])).toBeNull();
    expect(medianBudgetBand(["not_sure", null, undefined])).toBeNull();
    expect(medianBudgetBand(["nonsense"])).toBeNull();
  });

  it("excludes 'not_sure' from the sample", () => {
    expect(medianBudgetBand(["not_sure", "2k_5k", "not_sure"])).toBe("2k_5k");
  });

  it("returns the lower-middle band for an even-count sample", () => {
    // canonical order: under_500 < 500_2k < 2k_5k < 5k_10k < 10k_plus
    expect(medianBudgetBand(["under_500", "500_2k", "2k_5k", "5k_10k"])).toBe("500_2k");
  });

  it("returns the middle band for an odd-count sample", () => {
    expect(medianBudgetBand(["under_500", "2k_5k", "10k_plus"])).toBe("2k_5k");
  });
});

// ─── summariseSimilarBriefs (suppression boundaries + empty history) ─────────

function similarRow(over: Partial<SimilarBriefRowLite>): SimilarBriefRowLite {
  return {
    id: Math.floor(Math.random() * 1e9),
    created_at: "2026-01-01T00:00:00.000Z",
    accepted_at: null,
    status: "closed",
    budget_band: null,
    location: "NSW",
    ...over,
  };
}

/** A decided-but-accepted row, posted then accepted `hours` later. */
function acceptedRow(hours: number, band: string | null = null): SimilarBriefRowLite {
  const created = new Date("2026-01-01T00:00:00.000Z");
  const accepted = new Date(created.getTime() + hours * 3_600_000);
  return similarRow({
    created_at: created.toISOString(),
    accepted_at: accepted.toISOString(),
    status: "closed",
    budget_band: band,
  });
}

describe("summariseSimilarBriefs", () => {
  it("returns null on empty history", () => {
    expect(summariseSimilarBriefs([], "national", null, "General Expert Brief")).toBeNull();
  });

  it("returns null one below the decided-brief suppression threshold", () => {
    const rows = Array.from({ length: SIMILAR_BRIEFS_MIN_SAMPLE - 1 }, () =>
      acceptedRow(10),
    );
    expect(summariseSimilarBriefs(rows, "state", "NSW", "General Expert Brief")).toBeNull();
  });

  it("emits stats exactly at the decided-brief threshold", () => {
    const rows = Array.from({ length: SIMILAR_BRIEFS_MIN_SAMPLE }, () => acceptedRow(10));
    const stats = summariseSimilarBriefs(rows, "state", "NSW", "General Expert Brief");
    expect(stats).not.toBeNull();
    expect(stats!.sampleSize).toBe(SIMILAR_BRIEFS_MIN_SAMPLE);
    expect(stats!.acceptedCount).toBe(SIMILAR_BRIEFS_MIN_SAMPLE);
    expect(stats!.acceptRatePct).toBe(100);
    expect(stats!.windowDays).toBe(INTEL_WINDOW_DAYS);
  });

  it("treats open rows as undecided and only counts accepted/closed", () => {
    const rows = [
      ...Array.from({ length: 5 }, () => acceptedRow(8)),
      similarRow({ status: "open", accepted_at: null }),
      similarRow({ status: "open", accepted_at: null }),
    ];
    const stats = summariseSimilarBriefs(rows, "national", null, "General Expert Brief");
    expect(stats!.sampleSize).toBe(5); // open rows excluded
    expect(stats!.acceptRatePct).toBe(100);
  });

  it("computes accept rate from accepted / decided", () => {
    const rows = [
      ...Array.from({ length: 3 }, () => acceptedRow(6)),
      similarRow({ status: "closed", accepted_at: null }),
      similarRow({ status: "closed", accepted_at: null }),
    ];
    const stats = summariseSimilarBriefs(rows, "national", null, "General Expert Brief");
    expect(stats!.sampleSize).toBe(5);
    expect(stats!.acceptedCount).toBe(3);
    expect(stats!.acceptRatePct).toBe(60);
  });

  it("suppresses medians below the accepted-median threshold but still returns stats", () => {
    // 5 decided, but only 2 accepted (< ACCEPTED_MEDIAN_MIN_SAMPLE = 3).
    const rows = [
      acceptedRow(4, "2k_5k"),
      acceptedRow(6, "2k_5k"),
      similarRow({ status: "closed", accepted_at: null }),
      similarRow({ status: "closed", accepted_at: null }),
      similarRow({ status: "closed", accepted_at: null }),
    ];
    const stats = summariseSimilarBriefs(rows, "national", null, "General Expert Brief");
    expect(stats).not.toBeNull();
    expect(stats!.medianHoursToAccept).toBeNull();
    expect(stats!.typicalAcceptedBudgetBand).toBeNull();
    expect(stats!.acceptRatePct).toBe(40);
  });

  it("emits median time-to-accept and budget band at the accepted-median threshold", () => {
    const rows = [
      acceptedRow(2, "500_2k"),
      acceptedRow(4, "2k_5k"),
      acceptedRow(6, "2k_5k"),
    ];
    expect(rows.length).toBeGreaterThanOrEqual(ACCEPTED_MEDIAN_MIN_SAMPLE);
    // Pad to reach the decided-brief suppression floor.
    const padded = [
      ...rows,
      similarRow({ status: "closed", accepted_at: null }),
      similarRow({ status: "closed", accepted_at: null }),
    ];
    const stats = summariseSimilarBriefs(padded, "national", null, "General Expert Brief");
    expect(stats!.medianHoursToAccept).toBe(4); // median of [2,4,6]
    expect(stats!.typicalAcceptedBudgetBand).toBe("2k_5k");
  });

  it("nulls the state on a national-scope summary", () => {
    const rows = Array.from({ length: 5 }, () => acceptedRow(5));
    const stats = summariseSimilarBriefs(rows, "national", "NSW", "General Expert Brief");
    expect(stats!.scope).toBe("national");
    expect(stats!.state).toBeNull();
  });

  it("keeps the state on a state-scope summary", () => {
    const rows = Array.from({ length: 5 }, () => acceptedRow(5));
    const stats = summariseSimilarBriefs(rows, "state", "VIC", "General Expert Brief");
    expect(stats!.scope).toBe("state");
    expect(stats!.state).toBe("VIC");
  });

  it("ignores accepted rows with negative time-to-accept", () => {
    const created = new Date("2026-01-10T00:00:00.000Z");
    const bad = similarRow({
      created_at: created.toISOString(),
      accepted_at: new Date(created.getTime() - 3_600_000).toISOString(), // before creation
      status: "closed",
    });
    const rows = [bad, acceptedRow(3), acceptedRow(5), acceptedRow(7), acceptedRow(9)];
    const stats = summariseSimilarBriefs(rows, "national", null, "General Expert Brief");
    // 5 decided, 5 accepted; only 4 have valid finite hours → median of [3,5,7,9] = 6.
    expect(stats!.medianHoursToAccept).toBe(6);
  });
});

// ─── summariseTrackRecord (win-rate suppression + empty history) ─────────────

function bid(status: string, advisorTypes: string[] | null): TrackRecordBidLite {
  return { status, advisor_auctions: { advisor_types: advisorTypes } };
}

describe("summariseTrackRecord", () => {
  it("returns zeroed counts and null win-rate on empty history", () => {
    const tr = summariseTrackRecord([], ["financial_adviser"], []);
    expect(tr.categoryBidCount).toBe(0);
    expect(tr.decidedBidCount).toBe(0);
    expect(tr.categoryWinRatePct).toBeNull();
    expect(tr.acceptedSimilarCount).toBe(0);
    expect(tr.engagedSimilarCount).toBe(0);
    expect(tr.windowDays).toBe(INTEL_WINDOW_DAYS);
  });

  it("filters bids to those whose auction overlaps the brief category", () => {
    const bids = [
      bid("won", ["financial_adviser"]),
      bid("lost", ["mortgage"]),
      bid("won", ["tax", "financial_adviser"]),
      bid("active", null), // no types → excluded when a category is required
    ];
    const tr = summariseTrackRecord(bids, ["financial_adviser"], []);
    expect(tr.categoryBidCount).toBe(2); // two financial_adviser overlaps
  });

  it("counts every bid when the brief has no category to match on", () => {
    const bids = [bid("won", ["mortgage"]), bid("lost", null)];
    const tr = summariseTrackRecord(bids, null, []);
    expect(tr.categoryBidCount).toBe(2);
  });

  it("suppresses win rate one below the decided-bid threshold", () => {
    // 2 decided (< TRACK_RECORD_MIN_SAMPLE = 3).
    const bids = [
      bid("won", ["financial_adviser"]),
      bid("lost", ["financial_adviser"]),
      bid("active", ["financial_adviser"]), // not decided
    ];
    const tr = summariseTrackRecord(bids, ["financial_adviser"], []);
    expect(tr.decidedBidCount).toBe(2);
    expect(tr.categoryWinRatePct).toBeNull();
    expect(tr.categoryBidCount).toBe(3);
  });

  it("emits win rate exactly at the decided-bid threshold", () => {
    const bids = [
      bid("won", ["financial_adviser"]),
      bid("won", ["financial_adviser"]),
      bid("lost", ["financial_adviser"]),
    ];
    const tr = summariseTrackRecord(bids, ["financial_adviser"], []);
    expect(tr.decidedBidCount).toBe(TRACK_RECORD_MIN_SAMPLE);
    expect(tr.categoryWinRatePct).toBe(67); // 2/3 rounded
  });

  it("treats only won/lost as decided (active/withdrawn excluded)", () => {
    const bids = [
      bid("won", ["tax"]),
      bid("lost", ["tax"]),
      bid("lost", ["tax"]),
      bid("active", ["tax"]),
      bid("withdrawn", ["tax"]),
      bid("expired", ["tax"]),
    ];
    const tr = summariseTrackRecord(bids, ["tax"], []);
    expect(tr.categoryBidCount).toBe(6);
    expect(tr.decidedBidCount).toBe(3); // 1 won + 2 lost
    expect(tr.categoryWinRatePct).toBe(33);
  });

  it("counts accepted similar briefs and those that became clients (won)", () => {
    const accepted = [
      { tracker_status: "won" },
      { tracker_status: "contacted" },
      { tracker_status: "won" },
      { tracker_status: null },
    ];
    const tr = summariseTrackRecord([], ["tax"], accepted);
    expect(tr.acceptedSimilarCount).toBe(4);
    expect(tr.engagedSimilarCount).toBe(2);
  });
});

// ─── suggestedResponseWindow ─────────────────────────────────────────────────

describe("suggestedResponseWindow", () => {
  it("returns null for null/undefined/non-finite/zero", () => {
    expect(suggestedResponseWindow(null)).toBeNull();
    expect(suggestedResponseWindow(undefined)).toBeNull();
    expect(suggestedResponseWindow(0)).toBeNull();
    expect(suggestedResponseWindow(Number.NaN)).toBeNull();
    expect(suggestedResponseWindow(Number.POSITIVE_INFINITY)).toBeNull();
  });

  it("clamps the window to a 2h floor", () => {
    const r = suggestedResponseWindow(1); // half = 0.5 → ceil 1 → clamp up to 2
    expect(r!.windowHours).toBe(2);
    expect(r!.medianHoursToAccept).toBe(1);
  });

  it("clamps the window to a 24h ceiling", () => {
    const r = suggestedResponseWindow(200); // half = 100 → clamp down to 24
    expect(r!.windowHours).toBe(24);
  });

  it("returns half the median (ceil) inside the clamp range", () => {
    const r = suggestedResponseWindow(13); // half = 6.5 → ceil 7
    expect(r!.windowHours).toBe(7);
    expect(r!.medianHoursToAccept).toBe(13);
  });

  it("rounds the surfaced median to one decimal place", () => {
    const r = suggestedResponseWindow(9.27);
    expect(r!.medianHoursToAccept).toBe(9.3);
  });
});

// ─── qualityBandForBrief (altitude guard) ────────────────────────────────────

function briefRow(over: Partial<BriefRow>): BriefRow {
  return {
    id: 1,
    slug: "brief-1",
    flow_type: "accept",
    brief_template: "general",
    brief_payload: {},
    provider_preference: null,
    routing_mode: null,
    target_professional_id: null,
    target_firm_id: null,
    target_team_id: null,
    accept_credits_cost: null,
    accepted_by_professional_id: null,
    accepted_by_team_id: null,
    accepted_at: null,
    tracker_status: "new",
    risk_flags: [],
    risk_review_status: "clear",
    listing_id: null,
    job_title: "",
    job_description: "",
    budget_band: "",
    advisor_types: null,
    location: null,
    contact_name: null,
    contact_email: null,
    status: "open",
    ends_at: "2026-02-01T00:00:00.000Z",
    created_at: "2026-01-01T00:00:00.000Z",
    ...over,
  };
}

describe("qualityBandForBrief", () => {
  it("rates a bare brief as the lowest tier", () => {
    const band = qualityBandForBrief(briefRow({}));
    expect(band.tier).toBe("weak");
    expect(typeof band.label).toBe("string");
  });

  it("rates a rich, complete brief at a higher tier than a bare one", () => {
    const bare = qualityBandForBrief(briefRow({}));
    const rich = qualityBandForBrief(
      briefRow({
        job_title: "SMSF property strategy in QLD with $200k super",
        job_description:
          "I'm 38, based in NSW, with about $200k in super. I want to set up an SMSF to buy an investment property in Brisbane, budget around $2,000 for advice, and I'd like to move in the next 3 months. I need lending and a buyer's agent.",
        budget_band: "2k_5k",
        location: "NSW",
        brief_template: "smsf_property",
        brief_payload: { timeline: "3 months", goal: "Buy an SMSF property" },
      }),
    );
    const order = ["weak", "fair", "good", "great"];
    expect(order.indexOf(rich.tier)).toBeGreaterThan(order.indexOf(bare.tier));
  });

  it("returns only tier + label — never a raw score or weights", () => {
    const band = qualityBandForBrief(briefRow({ job_title: "Tax help" }));
    expect(Object.keys(band).sort()).toEqual(["label", "tier"]);
  });
});
