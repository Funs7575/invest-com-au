import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import DirectoryHero from "@/components/directory/DirectoryHero";

describe("DirectoryHero", () => {
  it("renders breadcrumb, headline lead + accent, subtitle and stat tiles", () => {
    render(
      <DirectoryHero
        breadcrumbLabel="Compare Platforms"
        pill={{ label: "Live fee tracking", live: true }}
        headlineLead="Compare Australian investing platforms."
        headlineAccent="100+ tracked"
        subtitle="Side-by-side comparison of fees."
        stats={[
          { v: "100", l: "Platforms tracked" },
          { v: "9", l: "Categories" },
        ]}
      />,
    );
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(
      "Compare Australian investing platforms.",
    );
    expect(screen.getByText("100+ tracked")).toBeTruthy();
    expect(screen.getByText("Compare Platforms")).toBeTruthy();
    expect(screen.getByText("Live fee tracking")).toBeTruthy();
    expect(screen.getByText("Side-by-side comparison of fees.")).toBeTruthy();
    expect(screen.getByText("Platforms tracked")).toBeTruthy();
    expect(screen.getByText("Categories")).toBeTruthy();
  });

  it("caps stat tiles at 4", () => {
    render(
      <DirectoryHero
        breadcrumbLabel="Opportunities"
        headlineLead="184 live opportunities."
        stats={[
          { v: "1", l: "One" },
          { v: "2", l: "Two" },
          { v: "3", l: "Three" },
          { v: "4", l: "Four" },
          { v: "5", l: "Five" },
        ]}
      />,
    );
    expect(screen.queryByText("Five")).toBeNull();
    expect(screen.getByText("Four")).toBeTruthy();
  });

  it("light tone hides the eyebrow pill but keeps breadcrumb, headline, subtitle and stats", () => {
    render(
      <DirectoryHero
        tone="light"
        breadcrumbLabel="Opportunities"
        pill={{ label: "Live marketplace", live: true }}
        headlineLead="Investment marketplace"
        subtitle="Businesses, property, projects."
        stats={[
          { v: "247", l: "Live opportunities" },
          { v: "$1.2B", l: "Aggregate ask" },
        ]}
      />,
    );
    // The pill is intentionally omitted in the compact light treatment — the
    // live count rides in the first stat pill instead.
    expect(screen.queryByText("Live marketplace")).toBeNull();
    expect(screen.getByRole("heading", { level: 1 }).textContent).toContain(
      "Investment marketplace",
    );
    expect(screen.getByText("Opportunities")).toBeTruthy();
    expect(screen.getByText("Businesses, property, projects.")).toBeTruthy();
    expect(screen.getByText("Live opportunities")).toBeTruthy();
    expect(screen.getByText("247")).toBeTruthy();
  });

  it("stamps data-speakable on the headline block when speakableId is set", () => {
    const { container } = render(
      <DirectoryHero
        breadcrumbLabel="Compare Platforms"
        headlineLead="Compare Australian investing platforms."
        speakableId="compare-hero"
      />,
    );
    const region = container.querySelector("[data-speakable='compare-hero']");
    expect(region).not.toBeNull();
    expect(region?.textContent).toContain("Compare Australian investing platforms.");
  });
});
