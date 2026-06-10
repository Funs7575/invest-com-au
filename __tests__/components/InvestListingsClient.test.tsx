import { describe, it, expect, beforeEach, vi } from "vitest";
import "@testing-library/jest-dom/vitest";
import { render, screen, within } from "@testing-library/react";
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

  // Filters live in a single top bar on all breakpoints: a pill-popover bar
  // (primary facets) plus an "All filters" slide-over drawer (the long tail).
  // Both render role="dialog" surfaces; scope post-open assertions to the open
  // dialog so getByRole stays unambiguous.
  it("exposes the compliance FacetGroup options via the All filters drawer", async () => {
    const user = userEvent.setup();
    render(<InvestListingsClient listings={[makeListing()]} categories={categories} />);
    // Primary facets live in the pill bar; the long tail opens from "All filters".
    await user.click(screen.getByRole("button", { name: /All filters/i }));
    const drawer = within(screen.getByRole("dialog"));
    expect(drawer.getByRole("checkbox", { name: /FIRB-eligible/i })).toBeInTheDocument();
    expect(drawer.getByRole("checkbox", { name: /SIV-complying/i })).toBeInTheDocument();
    expect(drawer.getByRole("checkbox", { name: /Wholesale only/i })).toBeInTheDocument();
  });

  it("toggling a compliance facet writes the matching URL param", async () => {
    const user = userEvent.setup();
    // FIRB-eligible listing so the facet's live count is > 0 and the option
    // is enabled (FacetGroup disables zero-count facets — Session 5.5).
    render(<InvestListingsClient listings={[makeListing({ firb_eligible: true })]} categories={categories} />);
    await user.click(screen.getByRole("button", { name: /All filters/i }));
    await user.click(within(screen.getByRole("dialog")).getByRole("checkbox", { name: /FIRB-eligible/i }));
    expect(mockReplace).toHaveBeenCalled();
    expect(mockReplace.mock.calls.at(-1)?.[0]).toContain("firb=eligible");
  });

  it("toggling the Featured checkbox writes featured=true", async () => {
    const user = userEvent.setup();
    render(<InvestListingsClient listings={[makeListing()]} categories={categories} />);
    await user.click(screen.getByRole("button", { name: /All filters/i }));
    await user.click(within(screen.getByRole("dialog")).getByRole("checkbox", { name: /Featured \/ Premium only/i }));
    expect(mockReplace.mock.calls.at(-1)?.[0]).toContain("featured=true");
  });

  it("selecting a ticket bucket from the Budget pill writes the price param", async () => {
    const user = userEvent.setup();
    render(<InvestListingsClient listings={[makeListing()]} categories={categories} />);
    await user.click(screen.getByRole("button", { name: /Budget/i }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: /Under \$10k/i }));
    expect(mockReplace.mock.calls.at(-1)?.[0]).toContain("price=under-10k");
  });

  it("applying the wholesale 'Growth & raises' quick start keeps the s708 gate", async () => {
    const user = userEvent.setup();
    render(<InvestListingsClient listings={[makeListing()]} categories={categories} />);
    await user.click(screen.getByRole("button", { name: /Quick starts/i }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: /Growth & raises/i }));
    const url = mockReplace.mock.calls.at(-1)?.[0] as string;
    // Compliance gate: the equity quick start must retain wholesale=true.
    expect(url).toContain("wholesale=true");
    expect(url).toContain("equity_raise");
  });

  it("renders no active-filter chips when nothing is filtered", () => {
    render(<InvestListingsClient listings={[makeListing()]} categories={categories} />);
    expect(screen.queryByText("Filtering:")).not.toBeInTheDocument();
  });
});

describe("InvestListingsClient — sub-category chips vs SubCategoryNav tabs", () => {
  const miningCategories = [{ slug: "mining", label: "Mining" }];
  const goldListing = makeListing({
    id: 2,
    slug: "gold-project",
    title: "Gold Project",
    vertical: "mining",
    sub_category: "gold",
    listing_kind: "project_equity",
  });

  it("shows the 'Filter results by type' chips on a locked-category page by default", () => {
    render(
      <InvestListingsClient
        listings={[goldListing]}
        categories={miningCategories}
        lockedCategory="mining"
      />,
    );
    expect(screen.getByRole("group", { name: /Filter results by type/i })).toBeInTheDocument();
  });

  it("hides the chips when hideSubCategoryChips is set (pages with a SubCategoryNav tab bar)", () => {
    render(
      <InvestListingsClient
        listings={[goldListing]}
        categories={miningCategories}
        lockedCategory="mining"
        hideSubCategoryChips
      />,
    );
    expect(screen.queryByRole("group", { name: /Filter results by type/i })).not.toBeInTheDocument();
  });

  it("hiding the chips leaves the rest of the filter chrome intact", () => {
    render(
      <InvestListingsClient
        listings={[goldListing]}
        categories={miningCategories}
        lockedCategory="mining"
        hideSubCategoryChips
      />,
    );
    expect(screen.getByRole("button", { name: /All filters/i })).toBeInTheDocument();
    expect(screen.getByText("Gold Project")).toBeInTheDocument();
  });
});
