import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import SVGRadarChart from "@/components/charts/SVGRadarChart";

describe("SVGRadarChart", () => {
  const axes = [
    { label: "Rating", min: 0, max: 5 },
    { label: "ASX fee", min: 0, max: 30, polarity: "lower-better" as const },
    { label: "US fee", min: 0, max: 30, polarity: "lower-better" as const },
    { label: "FX %", min: 0, max: 1.5, polarity: "lower-better" as const },
    { label: "AUM ($B)", min: 0, max: 100 },
  ];

  it("renders nothing when axes < 3", () => {
    const { container } = render(
      <SVGRadarChart axes={[axes[0]!, axes[1]!]} series={[{ name: "x", values: [1, 2] }]} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing with empty series", () => {
    const { container } = render(<SVGRadarChart axes={axes} series={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders one polygon per series", () => {
    const { container } = render(
      <SVGRadarChart
        axes={axes}
        series={[
          { name: "Stake", values: [4.5, 3, 5, 0.6, 2] },
          { name: "CommSec", values: [4.0, 10, 19.95, 0.6, 80] },
        ]}
      />,
    );
    // Each series gets a polygon; the grid also uses polygons (rings=4 default).
    // We assert series polygons via their <title> elements (one per series group).
    const titles = container.querySelectorAll("title");
    expect(titles).toHaveLength(2);
    expect(titles[0]?.textContent).toBe("Stake");
    expect(titles[1]?.textContent).toBe("CommSec");
  });

  it("renders axis labels for every axis", () => {
    const { container } = render(
      <SVGRadarChart
        axes={axes}
        series={[{ name: "x", values: [1, 1, 1, 1, 1] }]}
      />,
    );
    const text = Array.from(container.querySelectorAll("text")).map((t) => t.textContent);
    for (const a of axes) {
      expect(text).toContain(a.label);
    }
  });

  it("collapses a vertex to centre when value is null (no data)", () => {
    const { container } = render(
      <SVGRadarChart
        axes={axes}
        series={[{ name: "Partial", values: [4, null, 5, null, 50] }]}
      />,
    );
    // The polygon's points string should include the centre coordinate (size/2)
    // for each null vertex. We assert the polygon exists; geometry tested by
    // visual snapshot or e2e; here we just ensure no throw.
    const polygons = container.querySelectorAll("polygon");
    expect(polygons.length).toBeGreaterThan(0);
  });

  it("aria-label describes the comparison", () => {
    const { container } = render(
      <SVGRadarChart
        axes={axes}
        series={[
          { name: "Stake", values: [4, 3, 5, 0.6, 2] },
          { name: "CommSec", values: [4, 10, 20, 0.6, 80] },
        ]}
      />,
    );
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("role")).toBe("img");
    expect(svg?.getAttribute("aria-label")).toMatch(/Stake/);
    expect(svg?.getAttribute("aria-label")).toMatch(/CommSec/);
    expect(svg?.getAttribute("aria-label")).toMatch(/5 dimensions/);
  });

  it("does not throw when all values are equal on an axis (zero-span)", () => {
    expect(() =>
      render(
        <SVGRadarChart
          axes={[
            { label: "x", min: 5, max: 5 },
            { label: "y", min: 0, max: 10 },
            { label: "z", min: 0, max: 10 },
          ]}
          series={[{ name: "Tied", values: [5, 5, 5] }]}
        />,
      ),
    ).not.toThrow();
  });
});
