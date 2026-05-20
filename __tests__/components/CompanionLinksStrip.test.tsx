import { describe, it, expect } from "vitest";
import { render, screen } from "./setup";
import CompanionLinksStrip from "@/components/CompanionLinksStrip";

const LINKS = [
  {
    label: "SMSF Accountants",
    sub: "Set up + lodgement specialists",
    href: "/advisors/smsf-accountants",
  },
  {
    label: "Super Funds",
    sub: "Compare 50+ providers",
    href: "/super",
  },
  {
    label: "Property Investment Loans",
    sub: "Mortgage broker comparison",
    href: "/compare/mortgages",
  },
];

describe("CompanionLinksStrip", () => {
  it("renders nothing when links is empty", () => {
    const { container } = render(<CompanionLinksStrip links={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("uses the default 'People also lined up' heading", () => {
    render(<CompanionLinksStrip links={LINKS} />);
    expect(screen.getByText("People also lined up")).toBeInTheDocument();
  });

  it("accepts a custom heading", () => {
    render(<CompanionLinksStrip links={LINKS} heading="Adjacent services" />);
    expect(screen.getByText("Adjacent services")).toBeInTheDocument();
  });

  it("exposes the section via aria-labelledby pointing to the heading", () => {
    render(<CompanionLinksStrip links={LINKS} />);
    const section = screen.getByRole("region", { name: "People also lined up" });
    expect(section).toBeInTheDocument();
    expect(section).toHaveAttribute("aria-labelledby", "companion-strip-heading");
  });

  it("renders one Link per item with correct href + label + sub", () => {
    render(<CompanionLinksStrip links={LINKS} />);
    expect(
      screen.getByRole("link", { name: /SMSF Accountants/ }),
    ).toHaveAttribute("href", "/advisors/smsf-accountants");
    expect(
      screen.getByText("Set up + lodgement specialists"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Super Funds/ }),
    ).toHaveAttribute("href", "/super");
    expect(
      screen.getByText("Compare 50+ providers"),
    ).toBeInTheDocument();
  });

  it("renders the expected number of links", () => {
    render(<CompanionLinksStrip links={LINKS} />);
    expect(screen.getAllByRole("link")).toHaveLength(3);
  });
});
