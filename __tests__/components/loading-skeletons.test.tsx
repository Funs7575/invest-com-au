/**
 * Loading-skeleton presentation tests — both the generic
 * RouteLoadingSkeleton and the more specific ComparisonTableSkeleton
 * render under route-segment loading boundaries on hundreds of pages.
 * Coverage here pins the contracts that matter:
 *
 *  - role + aria-busy + aria-live on the live region so screen readers
 *    announce the busy state without reading every pulsing rectangle
 *  - bar counts on the table skeleton (5 column heads, 4 row stubs)
 *    so a future "tidy this up" change can't silently drop rows or
 *    flip column count
 */
import { describe, it, expect } from "vitest";
import { render } from "./setup";
import RouteLoadingSkeleton from "@/components/RouteLoadingSkeleton";
import ComparisonTableSkeleton from "@/components/ComparisonTableSkeleton";

describe("RouteLoadingSkeleton", () => {
  it("exposes the live region with aria-live=polite and aria-busy=true", () => {
    const { container } = render(<RouteLoadingSkeleton />);
    const region = container.querySelector("[aria-live]");
    expect(region).not.toBeNull();
    expect(region).toHaveAttribute("aria-live", "polite");
    expect(region).toHaveAttribute("aria-busy", "true");
  });

  it("renders 6 pulsing placeholder bars", () => {
    const { container } = render(<RouteLoadingSkeleton />);
    expect(container.querySelectorAll(".animate-pulse")).toHaveLength(6);
  });
});

describe("ComparisonTableSkeleton", () => {
  it("renders a heading bar + 5 column-head bars + 4 row stubs", () => {
    const { container } = render(<ComparisonTableSkeleton />);
    // 5 column-head bars in the header row
    const header = container.querySelector(".bg-slate-50");
    expect(header).not.toBeNull();
    expect(header!.querySelectorAll(".bg-slate-200")).toHaveLength(5);
    // 4 row stubs
    expect(container.querySelectorAll(".border-t")).toHaveLength(4);
  });

  it("uses the animate-pulse class on the wrapper", () => {
    const { container } = render(<ComparisonTableSkeleton />);
    expect(container.firstElementChild).toHaveClass("animate-pulse");
  });
});
