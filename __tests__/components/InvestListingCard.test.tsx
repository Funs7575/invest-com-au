import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import type { InvestmentListing } from "@/lib/types";

// Keep the test scoped to the card's own DOM — stub next primitives and the
// client-only children (enquire/shortlist/match/claim) to no-ops.
vi.mock("next/link", () => ({
  default: ({ children, href }: { children: React.ReactNode; href: unknown }) => (
    <a href={typeof href === "string" ? href : "#"}>{children}</a>
  ),
}));
vi.mock("next/image", () => ({
  // The hero image is irrelevant to these assertions — render nothing.
  default: () => null,
}));
vi.mock("@/components/marketplace/EnquireButton", () => ({ default: () => <button>Enquire</button> }));
vi.mock("@/components/invest/ListingShortlistButton", () => ({ default: () => null }));
vi.mock("@/components/invest/MatchScorePill", () => ({ default: () => null }));
vi.mock("@/components/invest/ListingClaimLink", () => ({ default: () => null }));

import InvestListingCard from "@/components/InvestListingCard";

function makeListing(over: Partial<InvestmentListing> = {}): InvestmentListing {
  return {
    id: 1,
    slug: "demo",
    title: "Demo Listing",
    vertical: "commercial_property",
    sub_category: null,
    listing_kind: "for_sale_asset",
    key_metrics: {},
    asking_price_cents: null,
    price_display: null,
    created_at: "2026-01-01T00:00:00Z",
    location_state: null,
    location_city: null,
    industry: null,
    images: [],
    firb_eligible: false,
    siv_complying: false,
    listing_type: "standard",
    views: 0,
    expires_at: null,
    description: "",
    ...over,
  } as unknown as InvestmentListing;
}

describe("InvestListingCard — price + headline stat layout", () => {
  it("renders the SDA price and yield as two separate stats, not one mashed string", () => {
    render(
      <InvestListingCard
        listing={makeListing({
          title: "SDA Melbourne — Fully-Accessible 3BR",
          vertical: "commercial_property",
          listing_kind: "for_sale_asset",
          asking_price_cents: 85_000_000,
          // The legacy overloaded override — must NOT reach the big number.
          price_display: "AUD $850,000 — Net yield 11.2%",
          key_metrics: { net_yield_pct: 11.2, bedrooms: 3, build_year: 2025, smsf_eligible: true },
        })}
      />,
    );

    // Price renders as a clean compact figure; yield is its own labelled stat.
    expect(screen.getByText("$850k")).toBeInTheDocument();
    expect(screen.getByText("Net yield")).toBeInTheDocument();
    expect(screen.getByText("11.2%")).toBeInTheDocument();

    // The overloaded string is gone — no "AUD $850,000 …" anywhere.
    expect(screen.queryByText(/AUD \$850,000/)).not.toBeInTheDocument();

    // …and price + yield are in distinct elements.
    expect(screen.getByText("$850k")).not.toBe(screen.getByText("11.2%"));
  });

  it("renders a true boolean as a presence chip without a leading 'Yes'", () => {
    render(
      <InvestListingCard
        listing={makeListing({
          key_metrics: { bedrooms: 3, build_year: 2025, smsf_eligible: true },
        })}
      />,
    );
    expect(screen.getByText("SMSF eligible")).toBeInTheDocument();
    expect(screen.queryByText(/Yes\s+SMSF eligible/)).not.toBeInTheDocument();
  });

  it("shows a fund's min investment and a forward-looking target IRR", () => {
    render(
      <InvestListingCard
        listing={makeListing({
          title: "Australia Tech ESVCLP Fund IV",
          vertical: "fund",
          listing_kind: "fund",
          // asking_price_cents stays null (base default) — funds price off min.
          price_display: "Min $250,000 · 10% upfront tax offset + 100% CGT exempt",
          key_metrics: { min_investment_aud: 250000, target_irr_pct: 22 },
        })}
      />,
    );
    expect(screen.getByText("$250k")).toBeInTheDocument();
    expect(screen.getByText("Target IRR")).toBeInTheDocument();
    expect(screen.getByText("22%")).toBeInTheDocument();
    expect(screen.queryByText(/upfront tax offset/)).not.toBeInTheDocument();
  });
});
