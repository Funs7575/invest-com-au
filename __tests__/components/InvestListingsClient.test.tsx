import { describe, it, expect, beforeEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { InvestmentListing } from "@/lib/types";

// Router mock — hoisted so the factory can reference it (see CLAUDE.md vi.mock note).
const { mockReplace } = vi.hoisted(() => ({ mockReplace: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace: mockReplace,
    push: vi.fn(),
    prefetch: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
  }),
  usePathname: () => "/invest",
  useSearchParams: () => new URLSearchParams(),
}));

// Stub heavy children so the test isolates the filter-chrome wiring.
vi.mock("@/components/InvestListingCard", () => ({
  default: ({ listing }: { listing: { title: string } }) => (
    <div data-testid="listing-card">{listing.title}</div>
  ),
}));
vi.mock("@/components/invest/ListingCompareBar", () => ({ default: () => null }));
vi.mock("@/components/invest/SaveSearchButton", () => ({ default: () => null }));
vi.mock("@/components/Icon", () => ({ default: () => <span aria-hidden /> }));

import InvestListingsClient from "@/components/InvestListingsClient";

function makeListing(over: Partial<InvestmentListing> = {}): InvestmentListing {
  return {
    id: 1,
    slug: "demo-fund",
    title: "Demo Fund",
    vertical: "fund",
    sub_category: null,
    listing_kind: "fund",
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

const categories = [{ slug: "funds", label: "Funds" }];

describe("InvestListingsClient — filter primitives wiring", () => {
  beforeEach(() => {
    mockReplace.mockClear();
  });

  it("renders the compliance FacetGroup options in the inline filter panel", () => {
    render(<InvestListingsClient listings={[makeListing()]} categories={categories} />);
    expect(screen.getByRole("checkbox", { name: /FIRB-eligible/i })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /SIV-complying/i })).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: /Wholesale only/i })).toBeInTheDocument();
  });

  it("toggling a compliance facet writes the matching URL param", async () => {
    const user = userEvent.setup();
    // FIRB-eligible listing so the facet's live count is > 0 and the option
    // is enabled (FacetGroup disables zero-count facets — Session 5.5).
    render(<InvestListingsClient listings={[makeListing({ firb_eligible: true })]} categories={categories} />);
    await user.click(screen.getByRole("checkbox", { name: /FIRB-eligible/i }));
    expect(mockReplace).toHaveBeenCalled();
    expect(mockReplace.mock.calls.at(-1)?.[0]).toContain("firb=eligible");
  });

  it("toggling the Featured checkbox writes featured=true", async () => {
    const user = userEvent.setup();
    render(<InvestListingsClient listings={[makeListing()]} categories={categories} />);
    await user.click(screen.getByRole("checkbox", { name: /Featured \/ Premium only/i }));
    expect(mockReplace.mock.calls.at(-1)?.[0]).toContain("featured=true");
  });

  it("renders no active-filter chips when nothing is filtered", () => {
    render(<InvestListingsClient listings={[makeListing()]} categories={categories} />);
    expect(screen.queryByText("Filtering:")).not.toBeInTheDocument();
  });
});
