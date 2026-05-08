import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "./setup";

const { mockGetIntentCountry, mockGetFilters } = vi.hoisted(() => ({
  mockGetIntentCountry: vi.fn(),
  mockGetFilters: vi.fn(),
}));

vi.mock("@/lib/intent-context-server", () => ({
  getIntentCountry: mockGetIntentCountry,
}));

vi.mock("@/lib/country-mode", async () => {
  const actual = await vi.importActual<typeof import("@/lib/country-mode")>(
    "@/lib/country-mode",
  );
  return {
    ...actual,
    getHomepageFiltersForCountry: mockGetFilters,
  };
});

import CountryPopularLinks from "@/components/country-mode/CountryPopularLinks";

const HK_FILTERS_WITH_LINKS = {
  listings: null,
  experts: null,
  platforms: null,
  tools: [],
  popularLinks: [
    { emoji: "🤝", label: "Get matched for HK investors", sublabel: "60s quiz", href: "/quiz?country=hong-kong" },
    { emoji: "🇭🇰", label: "Investing from Hong Kong", sublabel: "Full guide", href: "/foreign-investment/hong-kong" },
    { emoji: "📈", label: "Brokers that accept HK residents", sublabel: "IBKR + Saxo", href: "/compare/non-residents" },
    { emoji: "🏠", label: "FIRB-eligible properties", sublabel: "Sydney/Melbourne CBD", href: "/invest?firb=eligible" },
    { emoji: "💱", label: "HKD → AUD transfers", sublabel: "FX corridor", href: "/foreign-investment/send-money-australia" },
  ],
};

const EMPTY_FILTERS = {
  listings: null,
  experts: null,
  platforms: null,
  tools: [],
  popularLinks: [],
};

describe("CountryPopularLinks", () => {
  beforeEach(() => {
    mockGetIntentCountry.mockReset();
    mockGetFilters.mockReset();
  });

  it("returns null when no country is set", async () => {
    mockGetIntentCountry.mockResolvedValue(null);
    expect(await CountryPopularLinks()).toBeNull();
  });

  it("returns null when the country has no popular links", async () => {
    mockGetIntentCountry.mockResolvedValue("hk");
    mockGetFilters.mockReturnValue(EMPTY_FILTERS);
    expect(await CountryPopularLinks()).toBeNull();
  });

  it("renders the country's popular links capped at 4", async () => {
    mockGetIntentCountry.mockResolvedValue("hk");
    mockGetFilters.mockReturnValue(HK_FILTERS_WITH_LINKS);
    const ui = await CountryPopularLinks();
    render(<>{ui}</>);

    // First 4 links visible
    expect(screen.getByRole("link", { name: /Get matched for HK investors/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Investing from Hong Kong/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Brokers that accept HK residents/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /FIRB-eligible properties/i })).toBeInTheDocument();
    // 5th link cut off by the slice(0, 4)
    expect(screen.queryByRole("link", { name: /HKD → AUD transfers/i })).not.toBeInTheDocument();
  });

  it("first link is the Get-matched bridge to country-aware quiz", async () => {
    // Step 7's HK config seeds the popular-links list with Get-matched
    // as item 1 — Country Mode's bridge into the matching funnel.
    mockGetIntentCountry.mockResolvedValue("hk");
    mockGetFilters.mockReturnValue(HK_FILTERS_WITH_LINKS);
    const ui = await CountryPopularLinks();
    render(<>{ui}</>);
    const getMatched = screen.getByRole("link", { name: /Get matched for HK investors/i });
    expect(getMatched).toHaveAttribute("href", "/quiz?country=hong-kong");
  });
});
