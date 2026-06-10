import { describe, it, expect } from "vitest";
import { render, screen } from "./setup";

import HomeListingsTeaser, { type HomeListing } from "@/components/HomeListingsTeaser";
import { ADVERTISER_DISCLOSURE_SHORT } from "@/lib/compliance";

let nextId = 1;

function listing(over: Partial<HomeListing> = {}): HomeListing {
  return {
    id: nextId++,
    title: "Riverina Cropping Aggregation",
    slug: "riverina-cropping",
    vertical: "farmland",
    sub_category: null,
    listing_kind: "for_sale_asset",
    location_state: "NSW",
    location_city: "Wagga Wagga",
    price_display: "$12.5M",
    asking_price_cents: null,
    images: ["https://example.com/farm.jpg"],
    listing_type: "standard",
    key_metrics: { hectares: 1840, water_entitlements: "4,800 ML" },
    status: "active",
    ...over,
  };
}

describe("HomeListingsTeaser", () => {
  it("links every card through the canonical listingUrl shape", () => {
    const farm = listing();
    const carbon = listing({
      title: "NSW Biodiversity Credits — 50 Units",
      slug: "nsw-biodiversity-credits",
      vertical: "carbon-environmental-markets",
      key_metrics: { credits: 50, scheme: "NSW BCS" },
    });
    render(<HomeListingsTeaser listings={[farm, carbon]} totalCount={2} />);

    const links = screen.getAllByRole("link").map((a) => a.getAttribute("href"));
    expect(links).toContain("/invest/farmland/listings/riverina-cropping");
    // Drifted vertical maps to its canonical category, never the raw slug path.
    expect(links).toContain("/invest/carbon-credits/listings/nsw-biodiversity-credits");
    expect(links.some((h) => h === "/invest/farmland/riverina-cropping")).toBe(false);
  });

  it("humanises category chips instead of leaking raw slugs", () => {
    render(
      <HomeListingsTeaser
        listings={[
          listing({ vertical: "carbon-environmental-markets", key_metrics: null }),
          listing({ vertical: "water-rights", key_metrics: null }),
          listing({ vertical: "public-social-infrastructure", key_metrics: null }),
        ]}
        totalCount={3}
      />,
    );
    expect(screen.getByText("Carbon & enviro")).toBeInTheDocument();
    expect(screen.getByText("Water rights")).toBeInTheDocument();
    // Unmapped vertical falls back to acronym-aware title case, not the slug.
    expect(screen.getByText("Public Social Infrastructure")).toBeInTheDocument();
    expect(screen.queryByText("public-social-infrastructure")).not.toBeInTheDocument();
  });

  it("renders only stats that exist — never an em-dash placeholder", () => {
    render(<HomeListingsTeaser listings={[listing()]} totalCount={1} />);
    // Kind-aware price label for a for-sale asset.
    expect(screen.getByText("Asking")).toBeInTheDocument();
    expect(screen.getByText("$12.5M")).toBeInTheDocument();
    // key_metrics surface with humanised labels/values.
    expect(screen.getByText("hectares")).toBeInTheDocument();
    expect(screen.getByText("4,800 ML")).toBeInTheDocument();
    // The old fixed Yield/Term columns rendered "—" when absent.
    expect(screen.queryByText("—")).not.toBeInTheDocument();
    expect(screen.queryByText("Yield")).not.toBeInTheDocument();
  });

  it("labels paid placements and shows the advertiser disclosure", () => {
    render(
      <HomeListingsTeaser
        listings={[listing({ listing_type: "featured" }), listing()]}
        totalCount={2}
      />,
    );
    expect(screen.getByText("Featured")).toBeInTheDocument();
    expect(screen.getByText(ADVERTISER_DISCLOSURE_SHORT)).toBeInTheDocument();
  });

  it("omits the advertiser disclosure when no visible card is paid", () => {
    render(<HomeListingsTeaser listings={[listing(), listing()]} totalCount={2} />);
    expect(screen.queryByText(ADVERTISER_DISCLOSURE_SHORT)).not.toBeInTheDocument();
  });

  it("renders the empty state with a browse-all escape hatch", () => {
    render(<HomeListingsTeaser listings={[]} totalCount={0} />);
    expect(screen.getByText(/No listings yet/)).toBeInTheDocument();
  });
});
