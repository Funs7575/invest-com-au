// @vitest-environment jsdom
import { describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import Confetti from "@/components/ui/Confetti";

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

describe("Confetti", () => {
  it("renders the requested particle count when motion is allowed", () => {
    stubMatchMedia(false);
    const { container } = render(<Confetti count={12} />);
    expect(container.querySelectorAll(".confetti-particle").length).toBe(12);
  });

  it("is decorative: hidden from assistive tech", () => {
    stubMatchMedia(false);
    const { container } = render(<Confetti />);
    expect(container.querySelector(".confetti-container")?.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders nothing under prefers-reduced-motion", () => {
    stubMatchMedia(true);
    const { container } = render(<Confetti />);
    expect(container.querySelector(".confetti-container")).toBeNull();
  });
});
