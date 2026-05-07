import { render, screen } from "@testing-library/react";
import { vi, describe, it, expect } from "vitest";
import HubAdvisorCTA from "@/components/HubAdvisorCTA";

vi.mock("@/components/leads/HubLeadForm", () => ({
  default: ({
    heading,
    subheading,
    ctaLabel,
  }: {
    heading: string;
    subheading?: string;
    ctaLabel?: string;
  }) => (
    <div data-testid="hub-lead-form">
      <span data-testid="heading">{heading}</span>
      {subheading && <span data-testid="subheading">{subheading}</span>}
      {ctaLabel && <span data-testid="cta-label">{ctaLabel}</span>}
    </div>
  ),
}));

describe("HubAdvisorCTA", () => {
  const baseProps = {
    heading: "Find an SMSF specialist",
    intent: { need: "smsf", context: ["smsf_setup"] },
    source: "smsf_hub",
  };

  it("renders HubLeadForm with passed heading", () => {
    render(<HubAdvisorCTA {...baseProps} />);
    expect(screen.getByTestId("hub-lead-form")).toBeInTheDocument();
    expect(screen.getByTestId("heading")).toHaveTextContent("Find an SMSF specialist");
  });

  it("uses default slate background when no className provided", () => {
    const { container } = render(<HubAdvisorCTA {...baseProps} />);
    const section = container.querySelector("section");
    expect(section?.className).toContain("bg-slate-50");
    expect(section?.className).toContain("border-t");
  });

  it("applies custom className over default when provided", () => {
    const { container } = render(
      <HubAdvisorCTA {...baseProps} className="py-12 bg-white" />,
    );
    const section = container.querySelector("section");
    expect(section?.className).toContain("bg-white");
    expect(section?.className).not.toContain("bg-slate-50");
  });

  it("applies border-y variant via className", () => {
    const { container } = render(
      <HubAdvisorCTA {...baseProps} className="py-12 bg-slate-50 border-y border-slate-200" />,
    );
    const section = container.querySelector("section");
    expect(section?.className).toContain("border-y");
  });

  it("preserves max-w-2xl container constraint", () => {
    const { container } = render(<HubAdvisorCTA {...baseProps} />);
    expect(container.querySelector(".max-w-2xl")).toBeInTheDocument();
  });

  it("forwards subheading to HubLeadForm", () => {
    render(<HubAdvisorCTA {...baseProps} subheading="Expert SMSF advice" />);
    expect(screen.getByTestId("subheading")).toHaveTextContent("Expert SMSF advice");
  });

  it("forwards ctaLabel to HubLeadForm", () => {
    render(<HubAdvisorCTA {...baseProps} ctaLabel="Find a specialist" />);
    expect(screen.getByTestId("cta-label")).toHaveTextContent("Find a specialist");
  });

  it("renders section as HTML section element", () => {
    const { container } = render(<HubAdvisorCTA {...baseProps} />);
    expect(container.firstChild?.nodeName).toBe("SECTION");
  });
});
