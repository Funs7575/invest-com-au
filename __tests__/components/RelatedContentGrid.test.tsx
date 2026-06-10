import { describe, it, expect } from "vitest";
import { render, screen } from "./setup";
import RelatedContentGrid from "@/components/RelatedContentGrid";

const ITEMS = [
  {
    id: 1,
    href: "/article/best-share-trading-platforms-australia",
    title: "Best share trading platforms Australia 2026",
    badgeText: "Guide",
    badgeClass: "bg-blue-100 text-blue-700",
    meta: "5 min read",
  },
  {
    id: 2,
    href: "/article/how-to-buy-us-stocks",
    title: "How to buy US stocks from Australia",
    meta: "8 min read",
  },
  {
    id: 3,
    href: "/article/sponsor-feature",
    title: "Sponsored deep-dive on crypto",
    badgeText: "Sponsored",
  },
];

describe("RelatedContentGrid", () => {
  it("renders the curated fallback when items is empty (ADV-116: never returns null)", () => {
    render(<RelatedContentGrid items={[]} />);
    // Empty items → curated static articles, so users always have a next step.
    expect(screen.getByText("You might also like")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /How to start investing in Australia/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Discover more investing guides/ }),
    ).toBeInTheDocument();
  });

  it("uses the default 'Related Content' heading", () => {
    render(<RelatedContentGrid items={ITEMS} />);
    expect(screen.getByText("Related Content")).toBeInTheDocument();
  });

  it("accepts a custom heading", () => {
    render(<RelatedContentGrid items={ITEMS} heading="Read next" />);
    expect(screen.getByText("Read next")).toBeInTheDocument();
  });

  it("renders one Link per item with correct href + title", () => {
    render(<RelatedContentGrid items={ITEMS} />);
    expect(
      screen.getByRole("link", {
        name: /Best share trading platforms Australia 2026/,
      }),
    ).toHaveAttribute("href", "/article/best-share-trading-platforms-australia");
    expect(
      screen.getByRole("link", { name: /How to buy US stocks/ }),
    ).toHaveAttribute("href", "/article/how-to-buy-us-stocks");
  });

  it("renders optional badge text when supplied", () => {
    render(<RelatedContentGrid items={ITEMS} />);
    expect(screen.getByText("Guide")).toBeInTheDocument();
    expect(screen.getByText("Sponsored")).toBeInTheDocument();
  });

  it("omits the badge entirely for items without badgeText", () => {
    render(<RelatedContentGrid items={[ITEMS[1]]} />);
    expect(screen.queryByText(/Guide|Sponsored/)).not.toBeInTheDocument();
  });

  it("renders optional meta footer line when supplied", () => {
    render(<RelatedContentGrid items={ITEMS} />);
    expect(screen.getByText("5 min read")).toBeInTheDocument();
    expect(screen.getByText("8 min read")).toBeInTheDocument();
  });

  it("omits the meta footer for items without it", () => {
    render(<RelatedContentGrid items={[ITEMS[2]]} />);
    expect(screen.queryByText(/min read/)).not.toBeInTheDocument();
  });
});
