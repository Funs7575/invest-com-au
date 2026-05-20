import { describe, it, expect } from "vitest";
import { render } from "./setup";
import RouteLoadingSkeleton from "@/components/RouteLoadingSkeleton";

describe("RouteLoadingSkeleton", () => {
  it("renders six placeholder bars", () => {
    const { container } = render(<RouteLoadingSkeleton />);
    // 1 title + 4 line bars + 1 big block (h-40) = 6 total
    const bars = container.querySelectorAll(".animate-pulse");
    expect(bars).toHaveLength(6);
  });

  it("exposes the loading state to assistive tech via aria-live and aria-busy", () => {
    const { container } = render(<RouteLoadingSkeleton />);
    const region = container.querySelector("[aria-live]");
    expect(region).not.toBeNull();
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toHaveAttribute("aria-busy", "true");
  });

  it("centres the skeleton vertically with min-h-[60vh]", () => {
    const { container } = render(<RouteLoadingSkeleton />);
    expect(container.firstElementChild?.className).toContain("min-h-[60vh]");
  });
});
