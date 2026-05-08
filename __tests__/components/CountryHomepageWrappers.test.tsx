/**
 * Smoke tests for the three Country Mode homepage preview wrappers.
 *
 * Each wrapper is a server component that:
 *   1. Returns null when no country cookie
 *   2. Returns null when the country has no homepage* filters configured
 *   3. Returns null when Supabase returns < supply threshold
 *   4. Renders content when filters + sufficient supply
 *
 * The third gate is what enforces "Don't fake supply" at runtime — see
 * lib/country-mode/supply-thresholds.ts.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "./setup";

// ─── Module mocks ─────────────────────────────────────────────────────

const { mockGetIntentCountry, mockGetFilters, mockSupabaseLimit } = vi.hoisted(() => ({
  mockGetIntentCountry: vi.fn(),
  mockGetFilters: vi.fn(),
  mockSupabaseLimit: vi.fn(),
}));

vi.mock("@/lib/intent-context", async () => {
  const actual = await vi.importActual<typeof import("@/lib/intent-context")>(
    "@/lib/intent-context",
  );
  return {
    ...actual,
    getIntentCountry: mockGetIntentCountry,
  };
});

vi.mock("@/lib/country-mode", async () => {
  const actual = await vi.importActual<typeof import("@/lib/country-mode")>(
    "@/lib/country-mode",
  );
  return {
    ...actual,
    getHomepageFiltersForCountry: mockGetFilters,
  };
});

// Supabase mock — chainable builder that always resolves to whatever
// mockSupabaseLimit was last configured with.
function makeQueryBuilder() {
  const builder: Record<string, (...args: unknown[]) => unknown> = {};
  ["select", "eq", "in", "order"].forEach((method) => {
    builder[method] = () => builder;
  });
  builder.limit = mockSupabaseLimit;
  return builder;
}

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => Promise.resolve({ from: () => makeQueryBuilder() }),
}));

import CountryListingsPreview from "@/components/country-mode/CountryListingsPreview";
import CountryExpertsPreview from "@/components/country-mode/CountryExpertsPreview";
import CountryComparePreview from "@/components/country-mode/CountryComparePreview";

// ─── Shared setup ─────────────────────────────────────────────────────

const NULL_FILTERS = {
  listings: null,
  experts: null,
  platforms: null,
  tools: [],
  popularLinks: [],
};

const HK_FILTERS = {
  listings: { verticals: ["commercial-property"], firb: false },
  experts: { specialties: ["tax"], languages: [] },
  platforms: { types: ["share_broker"], nonResidentsOnly: true },
  tools: [],
  popularLinks: [],
};

beforeEach(() => {
  mockGetIntentCountry.mockReset();
  mockGetFilters.mockReset();
  mockSupabaseLimit.mockReset();
});

// ─── CountryListingsPreview ───────────────────────────────────────────

describe("CountryListingsPreview", () => {
  it("returns null when no country is set", async () => {
    mockGetIntentCountry.mockResolvedValue(null);
    expect(await CountryListingsPreview()).toBeNull();
  });

  it("returns null when the country has no listing filters", async () => {
    mockGetIntentCountry.mockResolvedValue("hk");
    mockGetFilters.mockReturnValue(NULL_FILTERS);
    expect(await CountryListingsPreview()).toBeNull();
  });

  it("returns null when supply falls below threshold (2 listings)", async () => {
    mockGetIntentCountry.mockResolvedValue("hk");
    mockGetFilters.mockReturnValue(HK_FILTERS);
    mockSupabaseLimit.mockResolvedValue({
      data: [{ id: 1, title: "Solo", slug: "solo", vertical: "commercial-property", images: [] }],
      error: null,
    });
    expect(await CountryListingsPreview()).toBeNull();
  });

  it("renders when filters present and supply meets threshold", async () => {
    mockGetIntentCountry.mockResolvedValue("hk");
    mockGetFilters.mockReturnValue(HK_FILTERS);
    mockSupabaseLimit.mockResolvedValue({
      data: [
        { id: 1, title: "Sydney CBD office", slug: "sydney-cbd-office", vertical: "commercial-property", images: ["/img/a.jpg"], location_state: "NSW", location_city: "Sydney", price_display: "AU$5M" },
        { id: 2, title: "Melbourne medical", slug: "melbourne-medical", vertical: "commercial-property", images: [], location_state: "VIC", location_city: "Melbourne", price_display: null },
        { id: 3, title: "Brisbane retail", slug: "brisbane-retail", vertical: "commercial-property", images: [], location_state: "QLD", location_city: "Brisbane", price_display: "AU$2M" },
      ],
      error: null,
    });
    const ui = await CountryListingsPreview();
    render(<>{ui}</>);
    expect(screen.getByText(/Tailored for HK investors/i)).toBeInTheDocument();
    expect(screen.getByText("Sydney CBD office")).toBeInTheDocument();
    expect(screen.getByText("Melbourne medical")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /See all opportunities/i })).toBeInTheDocument();
  });
});

// ─── CountryExpertsPreview ────────────────────────────────────────────

describe("CountryExpertsPreview", () => {
  it("returns null when no country is set", async () => {
    mockGetIntentCountry.mockResolvedValue(null);
    expect(await CountryExpertsPreview()).toBeNull();
  });

  it("returns null when the country has no expert filters", async () => {
    mockGetIntentCountry.mockResolvedValue("hk");
    mockGetFilters.mockReturnValue(NULL_FILTERS);
    expect(await CountryExpertsPreview()).toBeNull();
  });

  it("returns null when supply falls below threshold (2 experts)", async () => {
    mockGetIntentCountry.mockResolvedValue("hk");
    mockGetFilters.mockReturnValue(HK_FILTERS);
    mockSupabaseLimit.mockResolvedValue({
      data: [{ slug: "solo", name: "Solo", firm_name: null, type: "tax", location_display: null, photo_url: null }],
      error: null,
    });
    expect(await CountryExpertsPreview()).toBeNull();
  });

  it("renders when filters present and supply meets threshold", async () => {
    mockGetIntentCountry.mockResolvedValue("hk");
    mockGetFilters.mockReturnValue(HK_FILTERS);
    mockSupabaseLimit.mockResolvedValue({
      data: [
        { slug: "alex-tax", name: "Alex Tax", firm_name: "Tax Firm", type: "tax", location_display: "Sydney", photo_url: null },
        { slug: "betty-tax", name: "Betty Tax", firm_name: null, type: "tax", location_display: "Melbourne", photo_url: null },
      ],
      error: null,
    });
    const ui = await CountryExpertsPreview();
    render(<>{ui}</>);
    expect(screen.getByText(/Specialists for investors from Hong Kong/i)).toBeInTheDocument();
    expect(screen.getByText("Alex Tax")).toBeInTheDocument();
    expect(screen.getByText("Betty Tax")).toBeInTheDocument();
  });
});

// ─── CountryComparePreview ────────────────────────────────────────────

describe("CountryComparePreview", () => {
  it("returns null when no country is set", async () => {
    mockGetIntentCountry.mockResolvedValue(null);
    expect(await CountryComparePreview()).toBeNull();
  });

  it("returns null when the country has no platform filters", async () => {
    mockGetIntentCountry.mockResolvedValue("hk");
    mockGetFilters.mockReturnValue(NULL_FILTERS);
    expect(await CountryComparePreview()).toBeNull();
  });

  it("returns null when supply falls below threshold (3 platforms — stricter)", async () => {
    mockGetIntentCountry.mockResolvedValue("hk");
    mockGetFilters.mockReturnValue(HK_FILTERS);
    // 2 platforms is below the platforms threshold (3). For listings/experts
    // the same count would pass — the stricter platforms gate matters here.
    mockSupabaseLimit.mockResolvedValue({
      data: [
        { id: 1, slug: "a", name: "A", platform_type: "share_broker", logo_url: null, rating: 4.5, asx_fee: "$5", accepts_non_residents: true },
        { id: 2, slug: "b", name: "B", platform_type: "share_broker", logo_url: null, rating: 4.0, asx_fee: "$10", accepts_non_residents: true },
      ],
      error: null,
    });
    expect(await CountryComparePreview()).toBeNull();
  });

  it("renders when filters present and supply meets threshold (3+ platforms)", async () => {
    mockGetIntentCountry.mockResolvedValue("hk");
    mockGetFilters.mockReturnValue(HK_FILTERS);
    mockSupabaseLimit.mockResolvedValue({
      data: [
        { id: 1, slug: "ibkr-hk", name: "IBKR HK", platform_type: "share_broker", logo_url: null, rating: 4.7, asx_fee: "$5", accepts_non_residents: true },
        { id: 2, slug: "saxo-hk", name: "Saxo HK", platform_type: "share_broker", logo_url: null, rating: 4.5, asx_fee: "$10", accepts_non_residents: true },
        { id: 3, slug: "tiger-hk", name: "Tiger HK", platform_type: "share_broker", logo_url: null, rating: 4.3, asx_fee: "$8", accepts_non_residents: true },
      ],
      error: null,
    });
    const ui = await CountryComparePreview();
    render(<>{ui}</>);
    expect(screen.getByText(/Platforms that accept investors from Hong Kong/i)).toBeInTheDocument();
    expect(screen.getByText("IBKR HK")).toBeInTheDocument();
    expect(screen.getByText("Tiger HK")).toBeInTheDocument();
  });
});
