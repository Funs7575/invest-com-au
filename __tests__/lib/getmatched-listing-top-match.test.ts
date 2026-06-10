import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreateClient, mockFrom } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
  mockFrom: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({ createClient: mockCreateClient }));

import {
  computeTopListings,
  lanesIncludeListings,
  listingMatchesForLanes,
} from "@/lib/getmatched/listing-top-match";
import type { LaneResolution } from "@/lib/getmatched/resolve-lanes";

function chain(rows: unknown[], error: { message: string } | null = null) {
  const q: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order"]) q[m] = vi.fn(() => q);
  q.limit = vi.fn(() => Promise.resolve({ data: rows, error }));
  return q;
}

const NOW = new Date().toISOString();

// Within the 100k_500k band (midpoint A$300k) and in the user's state.
const CP_ROW = {
  id: 11,
  slug: "syd-office-asset",
  title: "Sydney Office Asset",
  vertical: "commercial_property",
  sub_category: null,
  listing_kind: "asset",
  location_state: "NSW",
  asking_price_cents: 25_000_000,
  price_display: null,
  listing_type: "featured",
  firb_eligible: false,
  images: ["thumb.jpg"],
  status: "active",
  created_at: NOW,
};

// CSF primary raise — hard-excluded by the P4 redline regardless of fit.
const CSF_ROW = {
  ...CP_ROW,
  id: 12,
  slug: "startup-raise",
  title: "Startup Raise",
  listing_kind: "equity_raise",
};

// FIRB-eligible fund with an art sub_category → canonical home is the
// alternatives sector page (FUND_SUB_TO_CATEGORY override in listingUrl).
const ART_FUND_ROW = {
  ...CP_ROW,
  id: 13,
  slug: "art-fund-iv",
  title: "Art Fund IV",
  vertical: "fund",
  sub_category: "art",
  listing_kind: "fund",
  firb_eligible: true,
  price_display: "From A$50 / unit",
  asking_price_cents: null,
};

const PROPERTY_ANSWERS = {
  intent: "property",
  budget_band: "100k_500k",
  location_state: "NSW",
  starting_point: "australia",
};

const lanesWith = (hero: string, secondary: string[] = []): LaneResolution =>
  ({
    hero,
    secondary,
    lanes: [{ kind: hero, weight: 80, reasons: [] }],
  }) as unknown as LaneResolution;

describe("computeTopListings (Decision Engine listings lane)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateClient.mockResolvedValue({ from: mockFrom });
    mockFrom.mockImplementation(() => chain([CP_ROW, CSF_ROW, ART_FUND_ROW]));
  });

  it("maps scored listings to the display-safe shape with canonical hrefs", async () => {
    const out = await computeTopListings(PROPERTY_ANSWERS);

    // CSF row is hard-excluded; the two eligible rows come back ranked.
    expect(out.map((l) => l.slug)).toEqual(["syd-office-asset", "art-fund-iv"]);

    const cp = out[0]!;
    // Asking price formatted when the listing has no display price.
    expect(cp.price_display).toBe("A$250,000");
    expect(cp.image_url).toBe("thumb.jpg");
    // Canonical sector-scoped detail URL via lib/listing-url.
    expect(cp.href).toBe("/invest/commercial-property/listings/syd-office-asset");
    // Factual criteria reasons only.
    expect(cp.reasons).toContain("In a category you chose (commercial property)");
    expect(cp.reasons).toContain("Within your stated budget (A$100k–A$500k)");

    const fund = out[1]!;
    // Listing's own display price wins; art sub_category → alternatives home.
    expect(fund.price_display).toBe("From A$50 / unit");
    expect(fund.href).toBe("/invest/alternatives/listings/art-fund-iv");
  });

  it("non-residents only see FIRB-eligible listings (hard gate)", async () => {
    const out = await computeTopListings({
      ...PROPERTY_ANSWERS,
      starting_point: "overseas",
    });
    expect(out.map((l) => l.slug)).toEqual(["art-fund-iv"]);
    expect(out[0]!.reasons).toContain("Open to overseas buyers (FIRB-eligible)");
  });

  it("fail-soft: query error or client failure returns [] (lane keeps its browse link)", async () => {
    mockFrom.mockImplementation(() => chain([], { message: "db down" }));
    expect(await computeTopListings(PROPERTY_ANSWERS)).toEqual([]);

    mockCreateClient.mockRejectedValue(new Error("no cookie context"));
    expect(await computeTopListings(PROPERTY_ANSWERS)).toEqual([]);
  });
});

describe("listingMatchesForLanes gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateClient.mockResolvedValue({ from: mockFrom });
    mockFrom.mockImplementation(() => chain([CP_ROW]));
  });

  it("lanesIncludeListings covers hero, secondary, absent and null", () => {
    expect(lanesIncludeListings(lanesWith("listings"))).toBe(true);
    expect(lanesIncludeListings(lanesWith("advisor", ["listings"]))).toBe(true);
    expect(lanesIncludeListings(lanesWith("advisor", ["platforms"]))).toBe(false);
    expect(lanesIncludeListings(null)).toBe(false);
    expect(lanesIncludeListings(undefined)).toBe(false);
  });

  it("computes matches only when the lanes surface listings — no DB touch otherwise", async () => {
    const out = await listingMatchesForLanes(
      PROPERTY_ANSWERS,
      lanesWith("advisor", ["platforms"]),
    );
    expect(out).toEqual([]);
    expect(mockCreateClient).not.toHaveBeenCalled();

    const hit = await listingMatchesForLanes(PROPERTY_ANSWERS, lanesWith("listings"));
    expect(hit.map((l) => l.slug)).toEqual(["syd-office-asset"]);
  });
});
