import { describe, it, expect } from "vitest";
import { render, screen } from "../setup";
import CompareBar from "@/components/directory/CompareBar";

describe("CompareBar", () => {
  it("renders nothing when count is 0", () => {
    const { container } = render(
      <CompareBar count={0} max={4} noun="advisor" compareHref="/x" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("shows 'save 1 more to compare' when count is 1", () => {
    render(<CompareBar count={1} max={4} noun="advisor" compareHref="/x" />);
    expect(screen.getByText(/1 advisor saved/)).toBeInTheDocument();
    expect(screen.getByText(/save 1 more to compare/)).toBeInTheDocument();
  });

  it("shows the Compare CTA when count is 2 or more", () => {
    render(<CompareBar count={3} max={4} noun="advisor" compareHref="/advisors/compare" />);
    const cta = screen.getByRole("link", { name: /Compare 3/ });
    expect(cta).toHaveAttribute("href", "/advisors/compare");
  });

  it("pluralises the noun correctly", () => {
    render(<CompareBar count={2} max={4} noun="listing" compareHref="/x" />);
    expect(screen.getByText(/2 listings saved/)).toBeInTheDocument();
  });

  it("hides View Saved when viewHref is not supplied", () => {
    render(<CompareBar count={1} max={4} noun="advisor" compareHref="/x" />);
    expect(screen.queryByRole("link", { name: /View saved/ })).not.toBeInTheDocument();
  });

  it("renders View Saved link when viewHref is supplied", () => {
    render(
      <CompareBar
        count={2}
        max={4}
        noun="advisor"
        compareHref="/x"
        viewHref="/shortlist/advisors"
      />,
    );
    expect(screen.getByRole("link", { name: /View saved/ })).toHaveAttribute(
      "href",
      "/shortlist/advisors",
    );
  });

  it("exposes the comparison shortlist via aria-label", () => {
    render(<CompareBar count={1} max={4} noun="x" compareHref="/x" />);
    expect(
      screen.getByRole("region", { name: "Comparison shortlist" }),
    ).toBeInTheDocument();
  });
});
