import { describe, it, expect } from "vitest";
import { render, screen } from "./setup";
import CrossBorderAdvisorCTA from "@/components/CrossBorderAdvisorCTA";

describe("<CrossBorderAdvisorCTA>", () => {
  it("renders nothing for an unmapped country", () => {
    const { container } = render(<CrossBorderAdvisorCTA countrySlug="atlantis" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the specialty CTA when the country maps to one", () => {
    render(<CrossBorderAdvisorCTA countrySlug="uk" />);
    const cta = screen.getByTestId("cross-border-advisor-cta");
    expect(cta).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /find a specialist/i });
    expect(link).toHaveAttribute(
      "href",
      "/find-advisor?specialty=UK%20Pension%20Transfer&country=gb",
    );
    expect(link).toHaveAttribute("data-specialty", "UK Pension Transfer");
    expect(link).toHaveAttribute("data-country", "gb");
  });

  it("renders the generic copy when the country has no specialty mapping", () => {
    render(<CrossBorderAdvisorCTA countrySlug="hong-kong" />);
    const link = screen.getByRole("link", { name: /find an advisor/i });
    expect(link).toHaveAttribute("href", "/find-advisor?country=hk");
    expect(link).toHaveAttribute("data-specialty", "");
  });

  it("renders the optional secondary link when both props are passed", () => {
    render(
      <CrossBorderAdvisorCTA
        countrySlug="uk"
        secondaryHref="/foreign-investment"
        secondaryLabel="← Hub"
      />,
    );
    expect(screen.getByRole("link", { name: "← Hub" })).toHaveAttribute(
      "href",
      "/foreign-investment",
    );
  });

  it("omits the secondary link when only one of the two props is set", () => {
    render(<CrossBorderAdvisorCTA countrySlug="uk" secondaryHref="/foo" />);
    expect(screen.queryAllByRole("link")).toHaveLength(1);
  });
});
