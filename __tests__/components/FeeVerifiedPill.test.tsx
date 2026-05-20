import { describe, it, expect } from "vitest";
import { render, screen } from "./setup";
import FeeVerifiedPill from "@/components/FeeVerifiedPill";

function daysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString();
}

describe("FeeVerifiedPill", () => {
  it("renders 'Fees not yet verified' when verifiedDate is missing", () => {
    render(<FeeVerifiedPill verifiedDate={null} />);
    expect(screen.getByText("Fees not yet verified")).toBeInTheDocument();
  });

  it("renders 'Fees verified today' when verified today", () => {
    render(<FeeVerifiedPill verifiedDate={daysAgo(0)} />);
    expect(screen.getByText("Fees verified today")).toBeInTheDocument();
  });

  it("renders 'X days ago' wording for a recent date", () => {
    render(<FeeVerifiedPill verifiedDate={daysAgo(5)} />);
    expect(screen.getByText("Fees verified 5 days ago")).toBeInTheDocument();
  });

  it("renders months wording for older dates", () => {
    render(<FeeVerifiedPill verifiedDate={daysAgo(120)} />);
    // ~4 months
    expect(screen.getByText(/Fees verified \d+ months ago/)).toBeInTheDocument();
  });

  it("uses emerald (fresh) classes for dates inside 30 days", () => {
    const { container } = render(
      <FeeVerifiedPill verifiedDate={daysAgo(10)} />,
    );
    const pill = container.querySelector("span");
    expect(pill?.className).toContain("emerald");
  });

  it("uses amber (current) classes for dates between 30 and 90 days", () => {
    const { container } = render(
      <FeeVerifiedPill verifiedDate={daysAgo(60)} />,
    );
    const pill = container.querySelector("span");
    expect(pill?.className).toContain("amber");
  });

  it("uses rose (stale) classes for dates beyond 90 days", () => {
    const { container } = render(
      <FeeVerifiedPill verifiedDate={daysAgo(200)} />,
    );
    const pill = container.querySelector("span");
    expect(pill?.className).toContain("rose");
  });

  it("falls back to 'unknown' tier when the date string is unparseable", () => {
    render(<FeeVerifiedPill verifiedDate="not-a-date" />);
    expect(screen.getByText("Fees not yet verified")).toBeInTheDocument();
  });

  it("default variant renders the bordered pill (border + bg + rounded-full)", () => {
    const { container } = render(
      <FeeVerifiedPill verifiedDate={daysAgo(5)} />,
    );
    const pill = container.querySelector("span");
    expect(pill?.className).toContain("rounded-full");
    expect(pill?.className).toContain("border");
  });

  it("inline variant omits the pill chrome", () => {
    const { container } = render(
      <FeeVerifiedPill verifiedDate={daysAgo(5)} variant="inline" />,
    );
    const pill = container.querySelector("span");
    expect(pill?.className).not.toContain("rounded-full");
    expect(pill?.className).not.toContain("px-2.5");
  });

  it("compact variant shows '{days}d' instead of the long label", () => {
    render(<FeeVerifiedPill verifiedDate={daysAgo(7)} variant="compact" />);
    expect(screen.getByText("7d")).toBeInTheDocument();
  });

  it("compact variant shows 'Unverified' when no date is supplied", () => {
    render(<FeeVerifiedPill verifiedDate={null} variant="compact" />);
    expect(screen.getByText("Unverified")).toBeInTheDocument();
  });

  it("compact variant exposes the long label via title attribute", () => {
    const { container } = render(
      <FeeVerifiedPill verifiedDate={daysAgo(5)} variant="compact" />,
    );
    const outer = container.querySelector("span[title]");
    expect(outer?.getAttribute("title")).toBe("Fees verified 5 days ago");
  });

  it("shortLabel swaps 'Fees verified' for 'Verified today' on recent dates", () => {
    render(<FeeVerifiedPill verifiedDate={daysAgo(0)} shortLabel />);
    expect(screen.getByText("Verified today")).toBeInTheDocument();
    expect(screen.queryByText("Fees verified today")).not.toBeInTheDocument();
  });

  it("shortLabel renders 'Verified Xd ago' for sub-30-day ages", () => {
    render(<FeeVerifiedPill verifiedDate={daysAgo(7)} shortLabel />);
    expect(screen.getByText("Verified 7d ago")).toBeInTheDocument();
  });

  it("shortLabel renders 'Verified Xmo ago' for older ages", () => {
    render(<FeeVerifiedPill verifiedDate={daysAgo(120)} shortLabel />);
    expect(screen.getByText(/Verified \d+mo ago/)).toBeInTheDocument();
  });

  it("shortLabel keeps the unknown copy when there is no date", () => {
    render(<FeeVerifiedPill verifiedDate={null} shortLabel />);
    expect(screen.getByText("Fees not yet verified")).toBeInTheDocument();
  });
});
