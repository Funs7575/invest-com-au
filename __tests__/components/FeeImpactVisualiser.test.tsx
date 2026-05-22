import { describe, it, expect } from "vitest";
import { fireEvent } from "@testing-library/react";
import { render, screen } from "./setup";
import FeeImpactVisualiser from "@/components/FeeImpactVisualiser";

describe("FeeImpactVisualiser", () => {
  it("renders the heading and description", () => {
    render(<FeeImpactVisualiser />);
    expect(screen.getByText("Fee impact over time")).toBeInTheDocument();
    expect(screen.getByText(/0\.1% vs 0\.65% MER/)).toBeInTheDocument();
  });

  it("renders Starting amount and Time horizon controls", () => {
    render(<FeeImpactVisualiser />);
    expect(screen.getByText("Starting amount")).toBeInTheDocument();
    expect(screen.getByText("Time horizon")).toBeInTheDocument();
  });

  it("renders the legend with correct labels and fees", () => {
    render(
      <FeeImpactVisualiser feeA={0.1} feeB={0.65} labelA="Low-cost" labelB="Average" />,
    );
    expect(screen.getByText(/Low-cost \(0\.1% MER\)/)).toBeInTheDocument();
    expect(screen.getByText(/Average \(0\.65% MER\)/)).toBeInTheDocument();
  });

  it("renders an SVG chart with a meaningful aria-label", () => {
    render(
      <FeeImpactVisualiser
        initialAmount={50_000}
        feeA={0.1}
        feeB={0.65}
        labelA="Low-cost"
        labelB="Average"
        years={20}
        annualReturn={7}
      />,
    );
    const svg = screen.getByRole("img");
    const label = svg.getAttribute("aria-label") ?? "";
    expect(label).toMatch(/Low-cost \(0\.1%\)/);
    expect(label).toMatch(/Average \(0\.65%\)/);
    expect(label).toMatch(/difference/i);
  });

  it("summary callout shows gap amount and year count", () => {
    render(
      <FeeImpactVisualiser
        initialAmount={50_000}
        feeA={0.1}
        feeB={0.65}
        years={20}
        annualReturn={7}
      />,
    );
    expect(screen.getByText(/difference over 20 years/i)).toBeInTheDocument();
    expect(screen.getByText(/0\.65%.*costs you/i)).toBeInTheDocument();
  });

  it("accepts custom label props in the callout copy", () => {
    render(
      <FeeImpactVisualiser
        feeA={0.05}
        feeB={0.9}
        labelA="ETF"
        labelB="Managed fund"
        years={10}
      />,
    );
    expect(screen.getByText(/managed fund.*fee of 0\.9%/i)).toBeInTheDocument();
  });

  it("changing Starting amount updates the description text", () => {
    render(<FeeImpactVisualiser />);
    const selects = screen.getAllByRole("combobox");
    const amountSelect = selects[0]!;
    fireEvent.change(amountSelect, { target: { value: "100000" } });
    expect(screen.getAllByText(/\$100k/).length).toBeGreaterThan(0);
  });

  it("changing Time horizon updates the summary callout year count", () => {
    render(<FeeImpactVisualiser />);
    const selects = screen.getAllByRole("combobox");
    const yearsSelect = selects[1]!;
    fireEvent.change(yearsSelect, { target: { value: "30" } });
    expect(screen.getByText(/difference over 30 years/i)).toBeInTheDocument();
  });

  it("formatAud: amounts below $1k are rendered as dollar-sign integers in description", () => {
    render(
      <FeeImpactVisualiser
        initialAmount={500}
        feeA={0.1}
        feeB={0.65}
        years={1}
        annualReturn={7}
      />,
    );
    // description shows formatAud(500) → "$500"
    expect(screen.getByText(/\$500 at 7% annual return/i)).toBeInTheDocument();
  });
});
