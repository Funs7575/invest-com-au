import { describe, it, expect } from "vitest";
import { render, screen } from "./setup";
import CompareNav from "@/app/compare/CompareNav";

/**
 * Setup helper already mocks next/navigation with usePathname → "/",
 * so the active-state branching can't be flipped per test without
 * fighting the helper. Coverage here is for path-independent
 * structure: every nav item is rendered, hrefs are correct, ARIA
 * landmark is exposed. Active-state branching is covered by
 * end-to-end smoke (the visible amber underline on the current page
 * is checked by the eyeball test on /compare manually).
 */

describe("CompareNav", () => {
  it("renders a link for every nav item with the correct href", () => {
    render(<CompareNav />);
    const nav = screen.getByRole("navigation", { name: "Compare sections" });
    const hrefs = Array.from(nav.querySelectorAll("a")).map((a) =>
      a.getAttribute("href"),
    );
    expect(hrefs).toEqual([
      "/compare",
      "/share-trading",
      "/compare/etfs",
      "/crypto",
      "/compare/super",
      "/savings",
      "/cfd",
      "/compare/insurance",
      "/compare/non-residents",
    ]);
  });

  it("exposes the nav landmark via aria-label", () => {
    render(<CompareNav />);
    expect(
      screen.getByRole("navigation", { name: "Compare sections" }),
    ).toBeInTheDocument();
  });

  it("renders 9 nav items total", () => {
    render(<CompareNav />);
    const nav = screen.getByRole("navigation", { name: "Compare sections" });
    expect(nav.querySelectorAll("a")).toHaveLength(9);
  });

  it("renders both responsive label spans on every item", () => {
    // Each nav item has two <span>s — one with `hidden sm:inline`
    // (the long label) and one with `sm:hidden` (the short label).
    // jsdom doesn't compute the responsive class, so both render in
    // the DOM. This is intentional — Tailwind picks one at runtime
    // based on viewport.
    render(<CompareNav />);
    const nav = screen.getByRole("navigation", { name: "Compare sections" });
    const spans = nav.querySelectorAll("a > span");
    expect(spans).toHaveLength(18); // 9 items × 2 label spans
  });

  it("renders the / route nav with the All Platforms anchor first", () => {
    render(<CompareNav />);
    const nav = screen.getByRole("navigation", { name: "Compare sections" });
    const firstLink = nav.querySelector("a");
    expect(firstLink).toHaveAttribute("href", "/compare");
  });
});
