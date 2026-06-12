import { describe, it, expect } from "vitest";
import { render, screen, within } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

import OptionsBoard, {
  presentKinds,
  savedKinds,
  shouldRenderBoard,
} from "@/app/get-matched/_components/OptionsBoard";
import type { ListingMatch, SavedItem, TopMatch } from "@/lib/getmatched/types";

const ADVISOR: TopMatch = {
  kind: "advisor",
  slug: "jane-tax",
  name: "Jane Tax",
  logo_url: null,
  rating: 4.8,
  rating_count: 21,
  one_line_why: "Specialises in Crypto Tax",
  cta_label: "View profile",
  cta_href: "/advisor/jane-tax",
  vertical: null,
};

const PLATFORM: TopMatch = {
  kind: "broker",
  slug: "cmc-invest",
  name: "CMC Invest",
  logo_url: null,
  rating: 4.5,
  rating_count: 100,
  one_line_why: "Low-cost ASX brokerage",
  cta_label: "See review",
  cta_href: "/brokers/cmc-invest",
  vertical: "shares",
  fee_projection: { annualCostAud: 120, assumptionLabel: "10 trades/yr" },
};

const LISTING: ListingMatch = {
  id: 11,
  slug: "syd-office-asset",
  title: "Sydney Office Asset",
  vertical: "commercial_property",
  location_state: "NSW",
  price_display: "A$250,000",
  image_url: null,
  reasons: ["Within your stated budget"],
  href: "/invest/commercial-property/listings/syd-office-asset",
};

describe("OptionsBoard — render rules", () => {
  it("hides entirely with fewer than 2 content kinds (one live lane)", () => {
    const { container } = render(<OptionsBoard advisors={[ADVISOR]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("hides with one live lane plus a single-kind saved shortlist", () => {
    const saved: SavedItem[] = [
      { kind: "advisor", ref: "jane-tax", saved_at: "2026-06-01T00:00:00Z" },
    ];
    const { container } = render(<OptionsBoard advisors={[ADVISOR]} saved={saved} />);
    // advisors=1 kind; saved is also advisor — still one distinct kind overall.
    expect(container).toBeEmptyDOMElement();
  });

  it("renders with 2 live lanes", () => {
    render(<OptionsBoard advisors={[ADVISOR]} platforms={[PLATFORM]} />);
    expect(screen.getByTestId("options-board")).toBeInTheDocument();
  });

  it("renders one row per present live kind", () => {
    render(
      <OptionsBoard advisors={[ADVISOR]} listings={[LISTING]} platforms={[PLATFORM]} />,
    );
    expect(screen.getByTestId("board-row-advisor")).toBeInTheDocument();
    expect(screen.getByTestId("board-row-listing")).toBeInTheDocument();
    expect(screen.getByTestId("board-row-platform")).toBeInTheDocument();
  });

  it("shows advisor name + why + View profile link", () => {
    render(<OptionsBoard advisors={[ADVISOR]} listings={[LISTING]} />);
    const row = screen.getByTestId("board-row-advisor");
    expect(row).toHaveTextContent("Jane Tax");
    expect(row).toHaveTextContent("Specialises in Crypto Tax");
    const link = screen.getByRole("link", { name: "View profile" });
    expect(link).toHaveAttribute("href", "/advisor/jane-tax");
  });

  it("shows listing title + criteria line + View link", () => {
    render(<OptionsBoard advisors={[ADVISOR]} listings={[LISTING]} />);
    const row = screen.getByTestId("board-row-listing");
    expect(row).toHaveTextContent("Sydney Office Asset");
    expect(row).toHaveTextContent("commercial property");
    expect(row).toHaveTextContent("NSW");
    expect(within(row).getByRole("link")).toHaveAttribute(
      "href",
      "/invest/commercial-property/listings/syd-office-asset",
    );
  });

  it("shows platform name + fee projection + See review link", () => {
    render(<OptionsBoard advisors={[ADVISOR]} platforms={[PLATFORM]} />);
    const row = screen.getByTestId("board-row-platform");
    expect(row).toHaveTextContent("CMC Invest");
    expect(row).toHaveTextContent("$120/yr");
    expect(row).toHaveTextContent("10 trades/yr");
    expect(within(row).getByRole("link")).toHaveAttribute("href", "/brokers/cmc-invest");
  });

  it("includes the honest framing explainer + general-info disclaimer", () => {
    render(<OptionsBoard advisors={[ADVISOR]} platforms={[PLATFORM]} />);
    expect(
      screen.getByText(/An advisor advises under their own licence/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/a platform is DIY/i)).toBeInTheDocument();
    expect(screen.getByText(/a listing is a specific opportunity/i)).toBeInTheDocument();
    expect(
      screen.getByText(/not financial\s+advice or a recommendation to invest/i),
    ).toBeInTheDocument();
  });

  it("adds no Connect / Save / lead CTAs (links only)", () => {
    render(
      <OptionsBoard advisors={[ADVISOR]} listings={[LISTING]} platforms={[PLATFORM]} />,
    );
    expect(screen.queryByRole("button", { name: /connect/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /save/i })).not.toBeInTheDocument();
  });
});

describe("OptionsBoard — saved-only hub variant", () => {
  const saved: SavedItem[] = [
    { kind: "advisor", ref: "jane-tax", label: "Jane Tax", saved_at: "2026-06-01T00:00:00Z" },
    { kind: "listing", ref: "11", label: "Sydney Office Asset", saved_at: "2026-06-01T00:00:00Z" },
  ];

  it("renders when the saved shortlist spans ≥2 kinds (no live matches)", () => {
    render(<OptionsBoard saved={saved} />);
    expect(screen.getByTestId("options-board")).toBeInTheDocument();
    expect(screen.getByTestId("board-row-advisor")).toHaveTextContent("Jane Tax");
    expect(screen.getByTestId("board-row-listing")).toHaveTextContent("Sydney Office Asset");
  });

  it("hides when the saved shortlist is a single kind", () => {
    const single: SavedItem[] = [
      { kind: "listing", ref: "11", label: "A", saved_at: "2026-06-01T00:00:00Z" },
      { kind: "listing", ref: "12", label: "B", saved_at: "2026-06-01T00:00:00Z" },
    ];
    const { container } = render(<OptionsBoard saved={single} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("keeps the honest framing on the hub variant", () => {
    render(<OptionsBoard saved={saved} />);
    expect(
      screen.getByText(/An advisor advises under their own licence/i),
    ).toBeInTheDocument();
  });
});

describe("OptionsBoard — pure helpers", () => {
  it("presentKinds counts only non-empty live lanes", () => {
    expect(presentKinds({ advisors: [ADVISOR] })).toEqual(["advisor"]);
    expect(presentKinds({ advisors: [ADVISOR], platforms: [PLATFORM] })).toEqual([
      "advisor",
      "platform",
    ]);
    expect(presentKinds({})).toEqual([]);
  });

  it("savedKinds returns distinct kinds", () => {
    expect(
      savedKinds([
        { kind: "advisor", ref: "a", saved_at: "x" },
        { kind: "advisor", ref: "b", saved_at: "x" },
        { kind: "listing", ref: "c", saved_at: "x" },
      ]),
    ).toEqual(["advisor", "listing"]);
  });

  it("shouldRenderBoard is true for 2 live lanes or 2 saved kinds, false otherwise", () => {
    expect(shouldRenderBoard({ advisors: [ADVISOR], platforms: [PLATFORM] })).toBe(true);
    expect(
      shouldRenderBoard({
        saved: [
          { kind: "advisor", ref: "a", saved_at: "x" },
          { kind: "platform", ref: "b", saved_at: "x" },
        ],
      }),
    ).toBe(true);
    expect(shouldRenderBoard({ advisors: [ADVISOR] })).toBe(false);
  });
});
