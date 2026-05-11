import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CalcPrefillBanner from "@/components/CalcPrefillBanner";

describe("CalcPrefillBanner", () => {
  it("renders the source label for a known calculator key", () => {
    render(<CalcPrefillBanner source="savings_calculator" onDismiss={vi.fn()} />);
    expect(screen.getByText(/Savings Calculator/)).toBeTruthy();
  });

  it("renders a human-readable label for an unknown key", () => {
    render(<CalcPrefillBanner source="fire_calculator" onDismiss={vi.fn()} />);
    expect(screen.getByText(/FIRE Calculator/)).toBeTruthy();
  });

  it("calls onDismiss when the Dismiss button is clicked", () => {
    const onDismiss = vi.fn();
    render(<CalcPrefillBanner source="mortgage_calculator" onDismiss={onDismiss} />);
    fireEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("has role=status for accessible live region", () => {
    render(<CalcPrefillBanner source="tco" onDismiss={vi.fn()} />);
    expect(screen.getByRole("status")).toBeTruthy();
  });
});
