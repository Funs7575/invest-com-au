import { describe, it, expect } from "vitest";
import { render, screen, within } from "./setup";
import ArticleCategoryFilter from "@/components/ArticleCategoryFilter";

/**
 * setup.tsx mocks useSearchParams() to return an empty URLSearchParams,
 * so every test below executes the "no category, no query" branch:
 * the "All" tab is selected, all others are not.
 *
 * Behaviour specific to active/category and ?q= passthrough is covered
 * by E2E and route-level integration tests where useSearchParams is
 * resolved by Next at request time.
 */
describe("ArticleCategoryFilter", () => {
  it("renders the tablist landmark with the right label", () => {
    render(<ArticleCategoryFilter />);
    expect(
      screen.getByRole("tablist", { name: "Article category filter" }),
    ).toBeInTheDocument();
  });

  it("renders 14 tabs (All + 13 categories)", () => {
    render(<ArticleCategoryFilter />);
    expect(screen.getAllByRole("tab")).toHaveLength(14);
  });

  it("marks the 'All' tab as aria-selected when no category is in the URL", () => {
    render(<ArticleCategoryFilter />);
    const allTab = screen.getByRole("tab", { name: "All" });
    expect(allTab).toHaveAttribute("aria-selected", "true");
  });

  it("marks every category tab as aria-selected=false when no category is set", () => {
    render(<ArticleCategoryFilter />);
    const tabs = screen.getAllByRole("tab");
    const nonAll = tabs.filter((t) => t.textContent !== "All");
    nonAll.forEach((tab) => {
      expect(tab).toHaveAttribute("aria-selected", "false");
    });
  });

  it("the 'All' tab links to /articles with no query string", () => {
    render(<ArticleCategoryFilter />);
    const allTab = screen.getByRole("tab", { name: "All" });
    expect(allTab).toHaveAttribute("href", "/articles");
  });

  it("each category tab links to /articles?category=<slug>", () => {
    render(<ArticleCategoryFilter />);
    expect(screen.getByRole("tab", { name: "Tax" })).toHaveAttribute(
      "href",
      "/articles?category=tax",
    );
    expect(screen.getByRole("tab", { name: "SMSF" })).toHaveAttribute(
      "href",
      "/articles?category=smsf",
    );
    expect(screen.getByRole("tab", { name: "ETFs" })).toHaveAttribute(
      "href",
      "/articles?category=etfs",
    );
    expect(
      screen.getByRole("tab", { name: "Robo-Advisors" }),
    ).toHaveAttribute("href", "/articles?category=robo-advisors");
    expect(
      screen.getByRole("tab", { name: "CFD & Forex" }),
    ).toHaveAttribute("href", "/articles?category=cfd-forex");
    expect(
      screen.getByRole("tab", { name: "Research Tools" }),
    ).toHaveAttribute("href", "/articles?category=research-tools");
  });

  it("renders human labels for every category slug", () => {
    render(<ArticleCategoryFilter />);
    const tablist = screen.getByRole("tablist");
    const labels = [
      "All",
      "Beginners",
      "Tax",
      "SMSF",
      "Strategy",
      "Crypto",
      "ETFs",
      "Robo-Advisors",
      "Super",
      "Property",
      "CFD & Forex",
      "Research Tools",
      "Reviews",
      "News",
    ];
    labels.forEach((label) => {
      expect(
        within(tablist).getByRole("tab", { name: label }),
      ).toBeInTheDocument();
    });
  });

  it("the 'All' tab carries the active dark styling", () => {
    render(<ArticleCategoryFilter />);
    const allTab = screen.getByRole("tab", { name: "All" });
    expect(allTab.className).toContain("bg-slate-900");
    expect(allTab.className).toContain("text-white");
  });

  it("non-All tabs carry the unselected light styling", () => {
    render(<ArticleCategoryFilter />);
    const tab = screen.getByRole("tab", { name: "Tax" });
    expect(tab.className).toContain("bg-slate-100");
    expect(tab.className).toContain("text-slate-700");
  });
});
