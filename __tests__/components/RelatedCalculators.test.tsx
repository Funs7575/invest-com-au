import { describe, it, expect } from "vitest";
import { render, screen } from "./setup";
import RelatedCalculators from "@/components/RelatedCalculators";

const ITEMS = [
  {
    name: "Stamp Duty Calculator",
    description: "Estimate stamp duty across all states.",
    href: "/calculators/stamp-duty",
    tag: "Free tool",
  },
  {
    name: "Switching Calculator",
    description: "Estimate broker switch savings.",
    href: "/switching-calculator",
  },
];

describe("RelatedCalculators", () => {
  it("renders nothing when items is empty", () => {
    const { container } = render(<RelatedCalculators items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("uses the default 'Also useful' heading", () => {
    render(<RelatedCalculators items={ITEMS} />);
    expect(screen.getByText("Also useful")).toBeInTheDocument();
  });

  it("renders a custom heading when supplied", () => {
    render(<RelatedCalculators items={ITEMS} heading="Try these next" />);
    expect(screen.getByText("Try these next")).toBeInTheDocument();
  });

  it("renders one Link per item with name + description + correct href", () => {
    render(<RelatedCalculators items={ITEMS} />);
    expect(
      screen.getByRole("link", { name: /Stamp Duty Calculator/ }),
    ).toHaveAttribute("href", "/calculators/stamp-duty");
    expect(
      screen.getByRole("link", { name: /Switching Calculator/ }),
    ).toHaveAttribute("href", "/switching-calculator");
    expect(
      screen.getByText("Estimate stamp duty across all states."),
    ).toBeInTheDocument();
  });

  it("renders the optional tag pill when present", () => {
    render(<RelatedCalculators items={ITEMS} />);
    expect(screen.getByText("Free tool")).toBeInTheDocument();
  });

  it("does not render a tag pill for items without a tag", () => {
    render(<RelatedCalculators items={[ITEMS[1]]} />);
    expect(screen.queryByText("Free tool")).not.toBeInTheDocument();
  });

  it("exposes the section via aria-label='Related calculators'", () => {
    render(<RelatedCalculators items={ITEMS} />);
    expect(
      screen.getByRole("region", { name: "Related calculators" }),
    ).toBeInTheDocument();
  });
});
