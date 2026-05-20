import { describe, it, expect } from "vitest";
import { render } from "./setup";
import TableSkeleton from "@/components/TableSkeleton";

/**
 * TableSkeleton — generic configurable loading placeholder shown
 * under route-level loading boundaries for table-shaped pages
 * (compare/* etc). The configurable props matter for visual
 * matching to the post-load table layout.
 */
describe("TableSkeleton", () => {
  it("renders 5 rows + 5 cols by default with header", () => {
    const { container } = render(<TableSkeleton />);
    // header row is detectable by bg-slate-50 class
    expect(container.querySelector(".bg-slate-50")).not.toBeNull();
    // 5 body rows
    expect(container.querySelectorAll(".divide-y > div")).toHaveLength(5);
    // 5 cells per row + 5 header cells = 30 placeholder bars total
    // header cells = 5, body row cells = 5*5 = 25 → 30
    expect(container.querySelectorAll(".rounded")).toHaveLength(30);
  });

  it("honours custom rows prop", () => {
    const { container } = render(<TableSkeleton rows={3} />);
    expect(container.querySelectorAll(".divide-y > div")).toHaveLength(3);
  });

  it("honours custom cols prop", () => {
    const { container } = render(<TableSkeleton rows={1} cols={3} showHeader={false} />);
    expect(container.querySelectorAll(".rounded")).toHaveLength(3);
  });

  it("omits the header row when showHeader=false", () => {
    const { container } = render(<TableSkeleton showHeader={false} />);
    expect(container.querySelector(".bg-slate-50")).toBeNull();
  });

  it("renders animate-pulse on the outer wrapper", () => {
    const { container } = render(<TableSkeleton />);
    expect(container.firstElementChild).toHaveClass("animate-pulse");
  });

  it("renders zero rows gracefully", () => {
    const { container } = render(<TableSkeleton rows={0} showHeader={false} />);
    expect(container.querySelectorAll(".divide-y > div")).toHaveLength(0);
  });
});
