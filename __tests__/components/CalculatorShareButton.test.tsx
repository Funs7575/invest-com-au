import { describe, it, expect, vi } from "vitest";
import { render, screen } from "./setup";

vi.mock("@/hooks/use-calculator-state", () => ({
  buildShareableUrl: (path: string, key: string, state: Record<string, unknown>) =>
    `${path}?k=${key}&s=${encodeURIComponent(JSON.stringify(state))}`,
}));

import CalculatorShareButton from "@/components/CalculatorShareButton";

/**
 * Structural-only tests — the clipboard interaction needs a
 * non-secure-context fallback test which fights jsdom's read-only
 * `navigator.clipboard`. Click-and-state-change semantics are
 * exercised in e2e against the live preview.
 */
describe("CalculatorShareButton", () => {
  it("renders the default 'Share results' label", () => {
    render(
      <CalculatorShareButton calculatorKey="mortgage" state={{ rate: 0.06 }} />,
    );
    expect(screen.getByText("Share results")).toBeInTheDocument();
  });

  it("exposes the trigger as a button with descriptive aria-label", () => {
    render(<CalculatorShareButton calculatorKey="x" state={{}} />);
    expect(
      screen.getByRole("button", {
        name: "Copy shareable link to this calculation",
      }),
    ).toBeInTheDocument();
  });

  it("accepts a custom className override", () => {
    render(
      <CalculatorShareButton
        calculatorKey="x"
        state={{}}
        className="custom-share-btn"
      />,
    );
    expect(screen.getByRole("button")).toHaveClass("custom-share-btn");
  });

  it("uses the default class when no className is supplied", () => {
    render(<CalculatorShareButton calculatorKey="x" state={{}} />);
    expect(screen.getByRole("button")).toHaveClass("border-slate-200");
  });
});
