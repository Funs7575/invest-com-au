import { describe, it, expect, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import type { InvestmentListing } from "@/lib/types";
import { getSubcategoryBySlug } from "@/lib/invest-categories";

// Router mock — hoisted so the factory can reference it (see CLAUDE.md vi.mock note).
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: vi.fn(),
    push: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/invest/mining/listings/gold",
  useSearchParams: () => new URLSearchParams(),
}));

// Stub heavy children so the test isolates the page shell wiring.
vi.mock("@/components/InvestListingCard", () => ({
  default: ({ listing }: { listing: { title: string } }) => (
    <div data-testid="listing-card">{listing.title}</div>
  ),
}));
vi.mock("@/components/invest/ListingCompareBar", () => ({ default: () => null }));
vi.mock("@/components/invest/SaveSearchButton", () => ({ default: () => null }));
vi.mock("@/components/Icon", () => ({ default: () => <span aria-hidden /> }));

import SubCategoryListingsView from "@/components/SubCategoryListingsView";

function makeListing(over: Partial<InvestmentListing> = {}): InvestmentListing {
  return {
    id: 1,
    slug: "gold-project",
    title: "Gold Project",
    vertical: "mining",
    sub_category: "gold",
    listing_kind: "project_equity",
    key_metrics: {},
    asking_price_cents: null,
    created_at: "2026-01-01T00:00:00Z",
    location_state: null,
    location_city: null,
    industry: null,
    firb_eligible: false,
    siv_complying: false,
    listing_type: "standard",
    views: 0,
    expires_at: null,
    description: "",
    ...over,
  } as unknown as InvestmentListing;
}

const goldSub = getSubcategoryBySlug("mining", "gold")!;

describe("SubCategoryListingsView — upgraded sub-type page shell", () => {
  it("renders the SEO h1, the sub-type tab nav, and the interactive toolbar", () => {
    render(
      <SubCategoryListingsView
        listings={[makeListing()]}
        subCategory={goldSub}
        categorySlug="mining"
        categoryLabel="Mining"
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: goldSub.h1 })).toBeInTheDocument();
    // SubCategoryNav tab bar with the Gold tab marked current
    const nav = screen.getByRole("navigation", { name: /sub-categories/i });
    expect(nav).toBeInTheDocument();
    // Full filter chrome from InvestListingsClient
    expect(screen.getByRole("button", { name: /All filters/i })).toBeInTheDocument();
    expect(screen.getByText("Gold Project")).toBeInTheDocument();
    // The duplicate in-results chips stay hidden
    expect(screen.queryByRole("group", { name: /Filter results by type/i })).not.toBeInTheDocument();
  });

  it("collapses the general-advice warning to a one-line summary", () => {
    render(
      <SubCategoryListingsView
        listings={[makeListing()]}
        subCategory={goldSub}
        categorySlug="mining"
        categoryLabel="Mining"
      />,
    );
    expect(
      screen.getByText(/General advice only — not a personal recommendation/i),
    ).toBeInTheDocument();
  });

  it("keeps the listed_security kind visible (skipCategoryFilter wiring)", () => {
    // categoryForListing maps listed_security → "listed-securities", which the
    // "mining" lock would drop without skipCategoryFilter.
    render(
      <SubCategoryListingsView
        listings={[makeListing({ listing_kind: "listed_security", title: "Gold Miner ASX" })]}
        subCategory={goldSub}
        categorySlug="mining"
        categoryLabel="Mining"
      />,
    );
    expect(screen.getByText("Gold Miner ASX")).toBeInTheDocument();
  });

  it("renders the FAQ accordion when the sub-category defines FAQs", () => {
    render(
      <SubCategoryListingsView
        listings={[makeListing()]}
        subCategory={goldSub}
        categorySlug="mining"
        categoryLabel="Mining"
      />,
    );
    if (goldSub.faqs.length > 0) {
      expect(screen.getByText("Frequently Asked Questions")).toBeInTheDocument();
      expect(screen.getByText(goldSub.faqs[0]!.question)).toBeInTheDocument();
    }
  });

  it("shows the empty state (not the toolbar) when no listings match", () => {
    render(
      <SubCategoryListingsView
        listings={[]}
        subCategory={goldSub}
        categorySlug="mining"
        categoryLabel="Mining"
      />,
    );
    expect(screen.queryByRole("button", { name: /All filters/i })).not.toBeInTheDocument();
  });
});
