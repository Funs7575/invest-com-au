import { describe, it, expect } from "vitest";
import { render } from "./setup";
import Sparkline from "@/components/Sparkline";

describe("Sparkline", () => {
  it("returns null when data is empty", () => {
    const { container } = render(<Sparkline data={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when data has only one point", () => {
    const { container } = render(<Sparkline data={[5]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders an SVG when given two or more data points", () => {
    const { container } = render(<Sparkline data={[1, 2, 3]} />);
    const svg = container.querySelector("svg");
    expect(svg).not.toBeNull();
  });

  it("uses default dimensions 80x24 when not specified", () => {
    const { container } = render(<Sparkline data={[1, 2]} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "80");
    expect(svg).toHaveAttribute("height", "24");
    expect(svg).toHaveAttribute("viewBox", "0 0 80 24");
  });

  it("respects custom width and height", () => {
    const { container } = render(
      <Sparkline data={[1, 2, 3]} width={120} height={40} />,
    );
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("width", "120");
    expect(svg).toHaveAttribute("height", "40");
    expect(svg).toHaveAttribute("viewBox", "0 0 120 40");
  });

  it("is marked aria-hidden for decorative use", () => {
    const { container } = render(<Sparkline data={[1, 2]} />);
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });

  it("applies inline-block plus the provided className", () => {
    const { container } = render(
      <Sparkline data={[1, 2]} className="my-spark" />,
    );
    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("class")).toContain("inline-block");
    expect(svg?.getAttribute("class")).toContain("my-spark");
  });

  it("renders the fill polygon when showFill defaults to true", () => {
    const { container } = render(<Sparkline data={[1, 2, 3]} />);
    expect(container.querySelector("polygon")).not.toBeNull();
  });

  it("omits the fill polygon when showFill is false", () => {
    const { container } = render(
      <Sparkline data={[1, 2, 3]} showFill={false} />,
    );
    expect(container.querySelector("polygon")).toBeNull();
  });

  it("always renders the polyline trace", () => {
    const { container } = render(<Sparkline data={[1, 2, 3, 4]} />);
    const polyline = container.querySelector("polyline");
    expect(polyline).not.toBeNull();
    const points = polyline?.getAttribute("points") ?? "";
    // 4 coordinate pairs separated by spaces
    expect(points.split(" ")).toHaveLength(4);
  });

  it("renders an end-dot circle for the last data point", () => {
    const { container } = render(<Sparkline data={[1, 2, 3]} />);
    expect(container.querySelector("circle")).not.toBeNull();
  });

  it("applies the custom color to stroke, fill polygon and end dot", () => {
    const { container } = render(
      <Sparkline data={[1, 2, 3]} color="#ff0000" />,
    );
    expect(container.querySelector("polyline")).toHaveAttribute(
      "stroke",
      "#ff0000",
    );
    expect(container.querySelector("polygon")).toHaveAttribute(
      "fill",
      "#ff0000",
    );
    expect(container.querySelector("circle")).toHaveAttribute(
      "fill",
      "#ff0000",
    );
  });

  it("handles a flat series (all identical values) without crashing", () => {
    const { container } = render(<Sparkline data={[5, 5, 5, 5]} />);
    const polyline = container.querySelector("polyline");
    expect(polyline).not.toBeNull();
    const points = polyline?.getAttribute("points") ?? "";
    // No NaN should appear even when min === max
    expect(points).not.toContain("NaN");
  });
});
