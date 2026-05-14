import { describe, expect, it, vi } from "vitest";
import { render, screen } from "./setup";
import CalculatorLeadCapture from "@/components/CalculatorLeadCapture";

interface CapturedHubProps {
  heading: string;
  subheading?: string;
  intent: { need: string; context?: string[] };
  source: string;
  ctaLabel?: string;
}

const capturedProps: { value: CapturedHubProps | null } = { value: null };

vi.mock("@/components/leads/HubLeadForm", () => ({
  default: (props: CapturedHubProps) => {
    capturedProps.value = props;
    return (
      <div data-testid="hub-lead-form">
        <span data-testid="heading">{props.heading}</span>
        <span data-testid="subheading">{props.subheading}</span>
        <span data-testid="source">{props.source}</span>
        <span data-testid="cta">{props.ctaLabel}</span>
      </div>
    );
  },
}));

describe("CalculatorLeadCapture", () => {
  it("forwards the standard heading + CTA copy to HubLeadForm", () => {
    render(
      <CalculatorLeadCapture
        calcSlug="cgt-calculator"
        calcTitle="CGT"
        need="tax"
      />,
    );

    expect(screen.getByTestId("heading")).toHaveTextContent(
      "Save these results — get a free 15-minute review",
    );
    expect(screen.getByTestId("cta")).toHaveTextContent("Get my free review");
  });

  it("includes the calculator title in the subheading", () => {
    render(
      <CalculatorLeadCapture
        calcSlug="mortgage-calculator"
        calcTitle="mortgage repayment"
        need="mortgage"
      />,
    );

    expect(screen.getByTestId("subheading")).toHaveTextContent(
      /mortgage repayment numbers/,
    );
  });

  it("tags source_page with the calculator slug so analytics can isolate calc-driven leads", () => {
    render(
      <CalculatorLeadCapture
        calcSlug="smsf-calculator"
        calcTitle="SMSF cost"
        need="smsf"
      />,
    );

    expect(screen.getByTestId("source")).toHaveTextContent(
      "/calculator-leadbox|calc=smsf-calculator",
    );
  });

  it("passes need + contextKeys through to the lead intent", () => {
    render(
      <CalculatorLeadCapture
        calcSlug="cgt-calculator"
        calcTitle="CGT"
        need="tax"
        contextKeys={["cgt", "tax-planning"]}
      />,
    );

    expect(capturedProps.value?.intent).toEqual({
      need: "tax",
      context: ["cgt", "tax-planning"],
    });
  });

  it("omits the context field entirely when no contextKeys are supplied", () => {
    render(
      <CalculatorLeadCapture
        calcSlug="compound-interest-calculator"
        calcTitle="compound interest"
        need="planning"
      />,
    );

    expect(capturedProps.value?.intent).toEqual({ need: "planning" });
    expect(capturedProps.value?.intent.context).toBeUndefined();
  });

  it("omits context when contextKeys is an empty array (defensive — empty arrays would survive JSON)", () => {
    render(
      <CalculatorLeadCapture
        calcSlug="fire-calculator"
        calcTitle="FIRE projection"
        need="planning"
        contextKeys={[]}
      />,
    );

    expect(capturedProps.value?.intent).toEqual({ need: "planning" });
  });

  it("renders the wrapper div with the testid hook used by mounted-on-pages assertions", () => {
    render(
      <CalculatorLeadCapture
        calcSlug="cgt-calculator"
        calcTitle="CGT"
        need="tax"
      />,
    );

    expect(screen.getByTestId("calculator-lead-capture")).toBeInTheDocument();
    // Hub form is mounted inside it
    expect(screen.getByTestId("hub-lead-form")).toBeInTheDocument();
  });
});
