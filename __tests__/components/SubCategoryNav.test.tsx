import { describe, it, expect } from "vitest";
import { render, screen } from "./setup";
import SubCategoryNav from "@/components/SubCategoryNav";
import type { InvestCategory } from "@/lib/invest-categories";

function makeCategory(over: Partial<InvestCategory>): InvestCategory {
  return {
    slug: "alternatives",
    label: "Alternatives",
    description: "x",
    subcategories: [
      { slug: "wine", label: "Wine" },
      { slug: "art", label: "Art" },
      { slug: "cars", label: "Classic Cars" },
    ],
    ...over,
  } as unknown as InvestCategory;
}

describe("SubCategoryNav", () => {
  it("renders nothing when subcategories is empty", () => {
    const { container } = render(
      <SubCategoryNav
        category={makeCategory({ subcategories: [] })}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when subcategories is undefined", () => {
    const { container } = render(
      <SubCategoryNav
        category={makeCategory({ subcategories: undefined })}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("exposes the nav landmark via aria-label that includes the category name", () => {
    render(<SubCategoryNav category={makeCategory({})} />);
    expect(
      screen.getByRole("navigation", { name: "Alternatives sub-categories" }),
    ).toBeInTheDocument();
  });

  it("renders an 'All' pill + one pill per subcategory", () => {
    render(<SubCategoryNav category={makeCategory({})} />);
    expect(screen.getByText("All Alternatives")).toBeInTheDocument();
    expect(screen.getByText("Wine")).toBeInTheDocument();
    expect(screen.getByText("Art")).toBeInTheDocument();
    expect(screen.getByText("Classic Cars")).toBeInTheDocument();
  });

  it("marks 'All' as aria-current when activeSubcategory is omitted", () => {
    render(<SubCategoryNav category={makeCategory({})} />);
    const allPill = screen.getByText("All Alternatives").closest("a");
    expect(allPill).toHaveAttribute("aria-current", "page");
  });

  it("marks the matching subcategory pill as aria-current when activeSubcategory is set", () => {
    render(
      <SubCategoryNav
        category={makeCategory({})}
        activeSubcategory="wine"
      />,
    );
    const winePill = screen.getByText("Wine").closest("a");
    expect(winePill).toHaveAttribute("aria-current", "page");
    // All pill is NOT current when a subcategory is active
    const allPill = screen.getByText("All Alternatives").closest("a");
    expect(allPill).not.toHaveAttribute("aria-current");
  });

  it("links each subcategory pill to /invest/<category>/listings/<sub>", () => {
    render(<SubCategoryNav category={makeCategory({})} />);
    expect(screen.getByText("Wine").closest("a")).toHaveAttribute(
      "href",
      "/invest/alternatives/listings/wine",
    );
    expect(screen.getByText("Art").closest("a")).toHaveAttribute(
      "href",
      "/invest/alternatives/listings/art",
    );
  });

  it("All pill links to /invest/<category>/listings", () => {
    render(<SubCategoryNav category={makeCategory({})} />);
    expect(screen.getByText("All Alternatives").closest("a")).toHaveAttribute(
      "href",
      "/invest/alternatives/listings",
    );
  });
});
