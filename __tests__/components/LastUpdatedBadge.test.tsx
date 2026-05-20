import { describe, it, expect } from "vitest";
import { render, screen } from "./setup";
import LastUpdatedBadge from "@/components/LastUpdatedBadge";

describe("LastUpdatedBadge", () => {
  it("returns null when no dates are supplied", () => {
    const { container } = render(<LastUpdatedBadge />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when both dates are explicitly null", () => {
    const { container } = render(
      <LastUpdatedBadge updatedAt={null} lastReviewedAt={null} />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("returns null when supplied date strings are unparseable", () => {
    const { container } = render(
      <LastUpdatedBadge updatedAt="not-a-date" lastReviewedAt="also-bad" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders 'Updated <date>' when only updatedAt is supplied", () => {
    render(<LastUpdatedBadge updatedAt="2026-03-15" />);
    expect(screen.getByText("Updated")).toBeInTheDocument();
    expect(screen.getByText("15 March 2026")).toBeInTheDocument();
  });

  it("renders 'Reviewed <date>' when only lastReviewedAt is supplied", () => {
    render(<LastUpdatedBadge lastReviewedAt="2026-03-15" />);
    expect(screen.getByText("Reviewed")).toBeInTheDocument();
    expect(screen.getByText("15 March 2026")).toBeInTheDocument();
  });

  it("prefers the reviewed date when it is more recent than updatedAt", () => {
    render(
      <LastUpdatedBadge
        updatedAt="2026-01-01"
        lastReviewedAt="2026-04-01"
      />,
    );
    expect(screen.getByText("Reviewed")).toBeInTheDocument();
    expect(screen.getByText("1 April 2026")).toBeInTheDocument();
  });

  it("prefers the updated date when it is more recent than reviewed", () => {
    render(
      <LastUpdatedBadge
        updatedAt="2026-04-01"
        lastReviewedAt="2026-01-01"
      />,
    );
    expect(screen.getByText("Updated")).toBeInTheDocument();
    expect(screen.getByText("1 April 2026")).toBeInTheDocument();
  });

  it("prefers reviewed when timestamps are equal (tiebreaker)", () => {
    render(
      <LastUpdatedBadge
        updatedAt="2026-04-01"
        lastReviewedAt="2026-04-01"
      />,
    );
    expect(screen.getByText("Reviewed")).toBeInTheDocument();
  });

  it("renders a <time> element with the ISO datetime attribute", () => {
    const { container } = render(
      <LastUpdatedBadge updatedAt="2026-03-15" />,
    );
    const time = container.querySelector("time");
    expect(time).not.toBeNull();
    expect(time).toHaveAttribute("datetime", "2026-03-15");
  });

  it("appends the reviewer's name when reviewing and the name is supplied", () => {
    render(
      <LastUpdatedBadge
        lastReviewedAt="2026-03-15"
        lastReviewedBy="Finn"
      />,
    );
    expect(screen.getByText(/Finn/)).toBeInTheDocument();
  });

  it("does NOT show the reviewer name when the badge falls back to 'Updated'", () => {
    render(
      <LastUpdatedBadge
        updatedAt="2026-04-01"
        lastReviewedAt="2026-01-01"
        lastReviewedBy="Finn"
      />,
    );
    expect(screen.queryByText(/Finn/)).not.toBeInTheDocument();
  });

  it("includes the reviewer in the aria-label for screen readers", () => {
    const { container } = render(
      <LastUpdatedBadge
        lastReviewedAt="2026-03-15"
        lastReviewedBy="Finn"
      />,
    );
    const wrapper = container.firstElementChild;
    expect(wrapper?.getAttribute("aria-label")).toBe(
      "Reviewed 15 March 2026 by Finn",
    );
  });

  it("aria-label omits the reviewer for non-reviewed badges", () => {
    const { container } = render(
      <LastUpdatedBadge updatedAt="2026-03-15" />,
    );
    const wrapper = container.firstElementChild;
    expect(wrapper?.getAttribute("aria-label")).toBe("Updated 15 March 2026");
  });

  it("applies the supplied className alongside the base styling", () => {
    const { container } = render(
      <LastUpdatedBadge
        updatedAt="2026-03-15"
        className="my-extra-class"
      />,
    );
    expect(container.firstElementChild).toHaveClass("my-extra-class");
  });

  it("marks the inline svg icon aria-hidden", () => {
    const { container } = render(
      <LastUpdatedBadge updatedAt="2026-03-15" />,
    );
    const svg = container.querySelector("svg");
    expect(svg).toHaveAttribute("aria-hidden", "true");
  });
});
