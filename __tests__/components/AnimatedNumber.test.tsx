// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import AnimatedNumber from "@/components/ui/AnimatedNumber";

function stubMatchMedia(reduce: boolean) {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: reduce && query.includes("reduce"),
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  });
}

describe("AnimatedNumber", () => {
  it("renders the initial value formatted (en-AU grouping)", () => {
    stubMatchMedia(false);
    render(<AnimatedNumber value={12500} />);
    expect(screen.getByText("12,500")).toBeTruthy();
  });

  it("supports a custom formatter", () => {
    stubMatchMedia(false);
    render(<AnimatedNumber value={118} format={(n) => `$${Math.round(n)}/yr`} />);
    expect(screen.getByText("$118/yr")).toBeTruthy();
  });

  it("snaps straight to a new value under reduced motion", () => {
    stubMatchMedia(true);
    const { rerender } = render(<AnimatedNumber value={100} />);
    act(() => {
      rerender(<AnimatedNumber value={250} />);
    });
    expect(screen.getByText("250")).toBeTruthy();
  });
});
