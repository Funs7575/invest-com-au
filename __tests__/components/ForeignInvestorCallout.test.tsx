import { describe, it, expect } from "vitest";
import { render, screen } from "./setup";
import ForeignInvestorCallout from "@/components/ForeignInvestorCallout";

describe("ForeignInvestorCallout", () => {
  it("renders the vertical-aware headline", () => {
    render(
      <ForeignInvestorCallout
        href="/foreign-investment/property"
        verticalName="Australian property"
        keyRule="FIRB approval needed for established dwellings."
      />,
    );
    expect(
      screen.getByText("Investing in Australian property from overseas?"),
    ).toBeInTheDocument();
  });

  it("renders the keyRule body copy", () => {
    render(
      <ForeignInvestorCallout
        href="/foreign-investment/shares"
        verticalName="ASX shares"
        keyRule="Withholding tax applies to dividend income."
      />,
    );
    expect(
      screen.getByText("Withholding tax applies to dividend income."),
    ).toBeInTheDocument();
  });

  it("CTA link points at the supplied href", () => {
    render(
      <ForeignInvestorCallout
        href="/foreign-investment/crypto"
        verticalName="Crypto"
        keyRule="x"
      />,
    );
    expect(
      screen.getByRole("link", { name: /Foreign Investor Guide/ }),
    ).toHaveAttribute("href", "/foreign-investment/crypto");
  });

  it("renders the globe emoji in the row", () => {
    render(
      <ForeignInvestorCallout
        href="/x"
        verticalName="y"
        keyRule="z"
      />,
    );
    expect(screen.getByText("🌏")).toBeInTheDocument();
  });

  it("applies the amber callout palette to the outer wrapper", () => {
    const { container } = render(
      <ForeignInvestorCallout
        href="/x"
        verticalName="y"
        keyRule="z"
      />,
    );
    expect(container.firstElementChild?.className).toContain("bg-amber-50");
    expect(container.firstElementChild?.className).toContain(
      "border-amber-200",
    );
  });
});
