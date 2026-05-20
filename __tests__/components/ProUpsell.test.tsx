import { describe, it, expect, vi } from "vitest";
import { render, screen } from "./setup";

vi.mock("@/components/Icon", () => ({
  default: ({ name }: { name: string }) => (
    <span data-testid={`icon-${name}`} />
  ),
}));

import ProUpsell from "@/components/ProUpsell";

describe("ProUpsell — card variants", () => {
  it("fee-alert renders its title, desc and CTA into a /pro link", () => {
    render(<ProUpsell variant="fee-alert" />);
    expect(screen.getByText("Never Overpay Again")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Get Fee Alerts — $9/mo" }),
    ).toHaveAttribute("href", "/pro");
  });

  it("calculator variant renders its 'See All Results' copy", () => {
    render(<ProUpsell variant="calculator" />);
    expect(screen.getByText("See All Results")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Unlock Full Results — $9/mo" }),
    ).toBeInTheDocument();
  });

  it("comparison variant renders the advanced-tools copy", () => {
    render(<ProUpsell variant="comparison" />);
    expect(
      screen.getByText("Advanced Comparison Tools"),
    ).toBeInTheDocument();
  });

  it("course variant renders the learn-to-invest copy", () => {
    render(<ProUpsell variant="course" />);
    expect(screen.getByText("Learn to Invest Smarter")).toBeInTheDocument();
  });

  it("renders the variant-specific icon", () => {
    render(<ProUpsell variant="fee-alert" />);
    expect(screen.getByTestId("icon-bell")).toBeInTheDocument();
  });

  it("applies a passed className to the card wrapper", () => {
    const { container } = render(
      <ProUpsell variant="calculator" className="mt-8" />,
    );
    expect(container.firstElementChild?.className).toContain("mt-8");
  });
});

describe("ProUpsell — inline variant", () => {
  it("renders a single compact /pro link (no separate heading)", () => {
    render(<ProUpsell variant="inline" />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/pro");
  });

  it("shows the inline desc + the short CTA", () => {
    render(<ProUpsell variant="inline" />);
    expect(
      screen.getByText(/Fee alerts, advanced tools/),
    ).toBeInTheDocument();
    expect(screen.getByText("$9/mo →")).toBeInTheDocument();
  });

  it("uses the zap icon for the inline variant", () => {
    render(<ProUpsell variant="inline" />);
    expect(screen.getByTestId("icon-zap")).toBeInTheDocument();
  });

  it("does NOT render the card title element in inline mode", () => {
    render(<ProUpsell variant="inline" />);
    // "Investor Pro" is the inline title field but it's not rendered
    // as visible text in the inline branch (only desc + cta show).
    expect(screen.queryByText("Investor Pro")).not.toBeInTheDocument();
  });
});
