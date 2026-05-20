import { describe, it, expect } from "vitest";
import { render } from "./setup";
import ComparisonTableSkeleton from "@/components/ComparisonTableSkeleton";

describe("ComparisonTableSkeleton", () => {
  it("renders a header strip with 5 column placeholders", () => {
    const { container } = render(<ComparisonTableSkeleton />);
    // First "row" inside the bordered card is the header strip.
    const headerStrip = container.querySelector(".bg-slate-50");
    expect(headerStrip).not.toBeNull();
    expect(headerStrip?.querySelectorAll("div")).toHaveLength(5);
  });

  it("renders 4 row placeholders below the header", () => {
    const { container } = render(<ComparisonTableSkeleton />);
    // Each row sits inside a border-t-100 div.
    const rows = container.querySelectorAll(".border-t");
    expect(rows).toHaveLength(4);
  });

  it("animates the placeholder with .animate-pulse on the outer wrapper", () => {
    const { container } = render(<ComparisonTableSkeleton />);
    expect(container.firstElementChild?.className).toContain("animate-pulse");
  });
});
