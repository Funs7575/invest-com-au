import { describe, it, expect, vi } from "vitest";
import { render, screen } from "./setup";

// Icon imports an SVG sprite system that doesn't need to be exercised
// here — render a lightweight stub so we can focus on AdvisorPrompt.
vi.mock("@/components/Icon", () => ({
  default: ({ name }: { name: string }) => (
    <span data-testid="icon" data-name={name} />
  ),
}));

import AdvisorPrompt from "@/components/AdvisorPrompt";

describe("AdvisorPrompt — default (general) context", () => {
  it("renders the general heading + description by default", () => {
    render(<AdvisorPrompt />);
    expect(screen.getByText("Need professional advice?")).toBeInTheDocument();
    expect(
      screen.getByText(/Browse verified financial professionals/),
    ).toBeInTheDocument();
  });

  it("links the Browse CTA to /advisors filtered by the inferred type", () => {
    render(<AdvisorPrompt />);
    const browse = screen.getByRole("link", {
      name: /Browse Financial Planners/,
    });
    expect(browse).toHaveAttribute("href", "/advisors?type=financial_planner");
  });

  it("shows the 'How to Choose' guide link when one is mapped for the type", () => {
    render(<AdvisorPrompt />);
    const guide = screen.getByRole("link", { name: /How to Choose/ });
    expect(guide).toHaveAttribute(
      "href",
      "/advisor-guides/how-to-choose-financial-planner",
    );
  });
});

describe("AdvisorPrompt — context presets", () => {
  it("smsf context uses the SMSF accountant copy + link", () => {
    render(<AdvisorPrompt context="smsf" />);
    expect(screen.getByText("Setting up an SMSF?")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Browse SMSF Accountants/ }),
    ).toHaveAttribute("href", "/advisors?type=smsf_accountant");
  });

  it("high-value context uses the financial planner copy", () => {
    render(<AdvisorPrompt context="high-value" />);
    expect(screen.getByText("Investing $100k+?")).toBeInTheDocument();
  });

  it("tax context uses the tax-agent copy + link", () => {
    render(<AdvisorPrompt context="tax" />);
    expect(screen.getByText("Capital gains adding up?")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Browse Tax Agents/ }),
    ).toHaveAttribute("href", "/advisors?type=tax_agent");
  });

  it("property context uses the property-advisor copy + link", () => {
    render(<AdvisorPrompt context="property" />);
    expect(
      screen.getByText("Considering property investment?"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Browse Property Advisors/ }),
    ).toHaveAttribute("href", "/advisors?type=property_advisor");
  });
});

describe("AdvisorPrompt — overrides", () => {
  it("an explicit `type` overrides the context default", () => {
    render(<AdvisorPrompt context="general" type="mortgage_broker" />);
    expect(
      screen.getByRole("link", { name: /Browse Mortgage Brokers/ }),
    ).toHaveAttribute("href", "/advisors?type=mortgage_broker");
  });

  it("an explicit heading overrides the preset", () => {
    render(<AdvisorPrompt heading="Custom headline" />);
    expect(screen.getByText("Custom headline")).toBeInTheDocument();
    expect(
      screen.queryByText("Need professional advice?"),
    ).not.toBeInTheDocument();
  });

  it("an explicit description overrides the preset", () => {
    render(<AdvisorPrompt description="Custom body text." />);
    expect(screen.getByText("Custom body text.")).toBeInTheDocument();
  });

  it("does NOT render the How-to-Choose link when the type has no guide mapping", () => {
    // wealth_manager is not in GUIDE_MAP — there's no "How to Choose" link.
    render(<AdvisorPrompt type="wealth_manager" />);
    expect(
      screen.queryByRole("link", { name: /How to Choose/ }),
    ).not.toBeInTheDocument();
  });
});

describe("AdvisorPrompt — compact variant", () => {
  it("renders a single anchor wrapping the whole row", () => {
    render(<AdvisorPrompt compact />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute(
      "href",
      "/advisors?type=financial_planner",
    );
  });

  it("compact still shows the heading and the lowercased type label CTA", () => {
    render(<AdvisorPrompt compact />);
    expect(screen.getByText("Need professional advice?")).toBeInTheDocument();
    expect(
      screen.getByText(/Browse financial planners/),
    ).toBeInTheDocument();
  });

  it("compact ignores the How-to-Choose link entirely", () => {
    render(<AdvisorPrompt compact />);
    expect(
      screen.queryByRole("link", { name: /How to Choose/ }),
    ).not.toBeInTheDocument();
  });
});

describe("AdvisorPrompt — Icon prop", () => {
  it("passes the context-specific icon name to <Icon />", () => {
    render(<AdvisorPrompt context="property" />);
    expect(screen.getByTestId("icon")).toHaveAttribute("data-name", "home");
  });
});
