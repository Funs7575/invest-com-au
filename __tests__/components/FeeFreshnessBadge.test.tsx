// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import FeeFreshnessBadge from "@/components/broker/FeeFreshnessBadge";

const NOW = new Date("2026-06-04T12:00:00Z");

/** Build an ISO timestamp `hours` before NOW. */
function hoursBefore(hours: number): string {
  return new Date(NOW.getTime() - hours * 60 * 60 * 1000).toISOString();
}

/** Grab the rendered badge <span> (the outermost element). */
function renderBadge(props: Parameters<typeof FeeFreshnessBadge>[0]) {
  const { container } = render(<FeeFreshnessBadge {...props} />);
  const span = container.querySelector("span");
  if (!span) throw new Error("badge span not found");
  return span;
}

describe("FeeFreshnessBadge", () => {
  it("renders the 'unknown' tier when capturedAt is null", () => {
    const span = renderBadge({ capturedAt: null, now: NOW });
    expect(span).toHaveTextContent("Fees unverified");
    expect(span.className).toContain("slate-100");
    // No snapshot -> no formatted timestamp suffix, bare hint only.
    expect(span.getAttribute("title")).toBe("No snapshot on record");
    expect(span.getAttribute("title")).not.toContain("·");
  });

  it("renders the 'fresh' tier with a timestamp suffix for a 1h-old snapshot", () => {
    const span = renderBadge({ capturedAt: hoursBefore(1), now: NOW });
    expect(span).toHaveTextContent("Fees verified");
    expect(span.className).toContain("emerald-100");
    const title = span.getAttribute("title") ?? "";
    expect(title).toContain("Captured within the last 6 hours");
    // ICU locale strings vary across environments — assert structure not exact text.
    expect(title).toContain("·");
  });

  it("renders the 'recent' tier for a 20h-old snapshot", () => {
    const span = renderBadge({ capturedAt: hoursBefore(20), now: NOW });
    expect(span).toHaveTextContent("Fees recent");
    expect(span.className).toContain("amber-100");
  });

  it("renders the 'stale' tier for a 48h-old snapshot", () => {
    const span = renderBadge({ capturedAt: hoursBefore(48), now: NOW });
    expect(span).toHaveTextContent("Fees stale");
    expect(span.className).toContain("rose-100");
  });

  it("treats an unparseable capturedAt string as 'unknown'", () => {
    const span = renderBadge({ capturedAt: "not-a-date", now: NOW });
    expect(span).toHaveTextContent("Fees unverified");
    expect(span.className).toContain("slate-100");
  });

  it("appends the className prop to the badge classes", () => {
    const span = renderBadge({
      capturedAt: hoursBefore(1),
      now: NOW,
      className: "my-custom-class",
    });
    expect(span.className).toContain("my-custom-class");
  });
});
