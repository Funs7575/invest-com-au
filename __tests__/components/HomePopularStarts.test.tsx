import { describe, it, expect } from "vitest";
import { render, screen } from "./setup";
import HomePopularStarts from "@/components/HomePopularStarts";

/**
 * HomePopularStarts is a static set of six entry-point chips above
 * the home-page fold. Tests assert label + href contract — these
 * are user-visible entry routes, so a typo in the label or a wrong
 * href is a regression to catch.
 */
describe("HomePopularStarts", () => {
  it("renders all six starting-point chips", () => {
    render(<HomePopularStarts />);
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(6);
  });

  it("exposes the section heading 'Popular starting points'", () => {
    render(<HomePopularStarts />);
    expect(screen.getByText("Popular starting points")).toBeInTheDocument();
  });

  it("links 'Start with $500' to the budgeted share-trading list", () => {
    render(<HomePopularStarts />);
    expect(screen.getByRole("link", { name: "Start with $500" })).toHaveAttribute(
      "href",
      "/best/share-trading?budget=500",
    );
  });

  it("links 'Best platform for beginners' to the beginners list", () => {
    render(<HomePopularStarts />);
    expect(
      screen.getByRole("link", { name: "Best platform for beginners" }),
    ).toHaveAttribute("href", "/best/share-trading-beginners");
  });

  it("links 'Browse property opportunities' to /property", () => {
    render(<HomePopularStarts />);
    expect(
      screen.getByRole("link", { name: "Browse property opportunities" }),
    ).toHaveAttribute("href", "/property");
  });

  it("links 'Find a mortgage broker' to the mortgage-broker advisors page", () => {
    render(<HomePopularStarts />);
    expect(
      screen.getByRole("link", { name: "Find a mortgage broker" }),
    ).toHaveAttribute("href", "/advisors/mortgage-brokers");
  });

  it("links 'Get matched to a specialist' to the post-quote intake", () => {
    render(<HomePopularStarts />);
    expect(
      screen.getByRole("link", { name: "Get matched to a specialist" }),
    ).toHaveAttribute("href", "/quotes/post");
  });

  it("links 'Investing from overseas' to /foreign-investment", () => {
    render(<HomePopularStarts />);
    expect(
      screen.getByRole("link", { name: "Investing from overseas" }),
    ).toHaveAttribute("href", "/foreign-investment");
  });

  it("renders inside a <section> landmark", () => {
    const { container } = render(<HomePopularStarts />);
    expect(container.querySelector("section")).not.toBeNull();
  });

  it("uses the home-popular-starts-row class on the chip row container", () => {
    const { container } = render(<HomePopularStarts />);
    expect(
      container.querySelector(".home-popular-starts-row"),
    ).not.toBeNull();
  });
});
