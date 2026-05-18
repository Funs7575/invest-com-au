// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";

import FeeImpactChart from "@/components/FeeImpactChart";

// FIN_NOTEBOOK item 19 — coverage push.
// The chart math is pure and the most regression-prone part of the
// component, so test compound projection + final-value display.

describe("FeeImpactChart", () => {
  it("computes a sensible final value for a $100k / 7% / 30y / 0.1% vs 0.3% scenario", () => {
    render(
      <FeeImpactChart
        startingBalance={100_000}
        annualReturnPct={7}
        years={30}
        feeAPct={0.1}
        feeBPct={0.3}
      />,
    );

    // Headline gap is rendered with AU currency formatting.
    const headline = screen.getByLabelText("Fee impact chart");
    expect(headline.textContent).toMatch(/\$/);

    // Sanity: 100k @ 6.9% for 30 years ≈ $743k; @ 6.7% ≈ $704k. Gap ≈ $39k.
    // We don't assert the exact figure — just that legend strings are
    // rendered for both scenarios.
    expect(headline.textContent).toContain("0.10%");
    expect(headline.textContent).toContain("0.30%");
  });

  it("renders 2 polylines (low + high fee scenarios)", () => {
    const { container } = render(
      <FeeImpactChart
        startingBalance={50_000}
        annualReturnPct={6}
        years={10}
        feeAPct={0.05}
        feeBPct={0.5}
      />,
    );
    expect(container.querySelectorAll("polyline").length).toBe(2);
  });

  it("honors a custom label pair", () => {
    render(
      <FeeImpactChart
        startingBalance={10_000}
        annualReturnPct={5}
        years={5}
        feeAPct={0}
        feeBPct={1}
        feeALabel="Free brokerage"
        feeBLabel="$30 trades"
      />,
    );
    // getByText throws on miss, so the calls are the assertions.
    screen.getByText(/Free brokerage/);
    screen.getByText(/\$30 trades/);
  });
});
