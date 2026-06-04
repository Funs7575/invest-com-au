import { describe, it, expect } from "vitest";
import { render, screen, within } from "./setup";
import ArticleCategoryFilter from "@/components/ArticleCategoryFilter";

/**
 * setup.tsx mocks useSearchParams() to return an empty URLSearchParams,
 * so every test below executes the "no category, no query" branch:
 * the "All" pill is active, all others are not.
 *
 * The filter renders navigation links (not tabs): each pill is an <a>
 * that navigates to /articles?category=<slug>, wrapped in a
 * role="group" aria-label="Filter by category" container. Active state
 * is conveyed with aria-pressed rather than the previously-misused
 * role="tab"/aria-selected (tabs don't navigate; these links do).
 *
 * Behaviour specific to active/category and ?q= passthrough is covered
 * by E2E and route-level integration tests where useSearchParams is
 * resolved by Next at request time.
 */
describe("ArticleCategoryFilter", () => {
  it("renders the filter group landmark with the right label", () => {
    render(<ArticleCategoryFilter />);
    expect(
      screen.getByRole("group", { name: "Filter by category" }),
    ).toBeInTheDocument();
  });

  it("renders 14 filter links (All + 13 categories)", () => {
    render(<ArticleCategoryFilter />);
    const group = screen.getByRole("group", { name: "Filter by category" });
    expect(within(group).getAllByRole("link")).toHaveLength(14);
  });

  it("marks the 'All' link as aria-pressed when no category is in the URL", () => {
    render(<ArticleCategoryFilter />);
    const allLink = screen.getByRole("link", { name: "All" });
    expect(allLink).toHaveAttribute("aria-pressed", "true");
  });

  it("marks every category link as aria-pressed=false when no category is set", () => {
    render(<ArticleCategoryFilter />);
    const group = screen.getByRole("group", { name: "Filter by category" });
    const links = within(group).getAllByRole("link");
    const nonAll = links.filter((t) => t.textContent !== "All");
    nonAll.forEach((link) => {
      expect(link).toHaveAttribute("aria-pressed", "false");
    });
  });

  it("the 'All' link points to /articles with no query string", () => {
    render(<ArticleCategoryFilter />);
    const allLink = screen.getByRole("link", { name: "All" });
    expect(allLink).toHaveAttribute("href", "/articles");
  });

  it("each category link points to /articles?category=<slug>", () => {
    render(<ArticleCategoryFilter />);
    expect(screen.getByRole("link", { name: "Tax" })).toHaveAttribute(
      "href",
      "/articles?category=tax",
    );
    expect(screen.getByRole("link", { name: "SMSF" })).toHaveAttribute(
      "href",
      "/articles?category=smsf",
    );
    expect(screen.getByRole("link", { name: "ETFs" })).toHaveAttribute(
      "href",
      "/articles?category=etfs",
    );
    expect(
      screen.getByRole("link", { name: "Robo-Advisors" }),
    ).toHaveAttribute("href", "/articles?category=robo-advisors");
    expect(
      screen.getByRole("link", { name: "CFD & Forex" }),
    ).toHaveAttribute("href", "/articles?category=cfd-forex");
    expect(
      screen.getByRole("link", { name: "Research Tools" }),
    ).toHaveAttribute("href", "/articles?category=research-tools");
  });

  it("renders human labels for every category slug", () => {
    render(<ArticleCategoryFilter />);
    const group = screen.getByRole("group", { name: "Filter by category" });
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
        within(group).getByRole("link", { name: label }),
      ).toBeInTheDocument();
    });
  });

  it("the 'All' link carries the active dark styling", () => {
    render(<ArticleCategoryFilter />);
    const allLink = screen.getByRole("link", { name: "All" });
    expect(allLink.className).toContain("bg-slate-900");
    expect(allLink.className).toContain("text-white");
  });

  it("non-All links carry the unselected light styling", () => {
    render(<ArticleCategoryFilter />);
    const link = screen.getByRole("link", { name: "Tax" });
    expect(link.className).toContain("bg-slate-100");
    expect(link.className).toContain("text-slate-700");
  });
});
