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
