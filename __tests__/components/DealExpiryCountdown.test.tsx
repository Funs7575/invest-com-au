import { describe, it, expect } from "vitest";
import { render, screen } from "./setup";
import DealExpiryCountdown from "@/components/DealExpiryCountdown";

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString();
}

describe("DealExpiryCountdown", () => {
  it("renders nothing when dealExpiry is null", () => {
    const { container } = render(<DealExpiryCountdown dealExpiry={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when dealExpiry is undefined", () => {
    const { container } = render(<DealExpiryCountdown dealExpiry={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the expiry date is in the past", () => {
    const { container } = render(
      <DealExpiryCountdown dealExpiry={daysFromNow(-1)} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when the expiry is exactly now (0 days ceil)", () => {
    // ceil(0 / 86400000) = 0 → no render
    const { container } = render(
      <DealExpiryCountdown dealExpiry={new Date().toISOString()} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  // ── compact variant (default) ─────────────────────────────────────────────

  it("renders compact 'Xd left' for a future date", () => {
    render(<DealExpiryCountdown dealExpiry={daysFromNow(5)} />);
    expect(screen.getByText("5d left")).toBeInTheDocument();
  });

  it("renders compact '1d left' for tomorrow", () => {
    render(<DealExpiryCountdown dealExpiry={daysFromNow(1)} />);
    expect(screen.getByText("1d left")).toBeInTheDocument();
  });

  it("renders compact '30d left' for exactly 30 days", () => {
    render(<DealExpiryCountdown dealExpiry={daysFromNow(30)} />);
    expect(screen.getByText("30d left")).toBeInTheDocument();
  });

  // ── urgency colours ───────────────────────────────────────────────────────

  it("applies red colour classes when 7 or fewer days remain", () => {
    const { container } = render(
      <DealExpiryCountdown dealExpiry={daysFromNow(3)} />
    );
    expect(container.querySelector("span")?.className).toContain("red");
  });

  it("applies red colour classes at the 7-day boundary", () => {
    const { container } = render(
      <DealExpiryCountdown dealExpiry={daysFromNow(7)} />
    );
    expect(container.querySelector("span")?.className).toContain("red");
  });

  it("applies amber colour classes when between 8 and 30 days remain", () => {
    const { container } = render(
      <DealExpiryCountdown dealExpiry={daysFromNow(15)} />
    );
    expect(container.querySelector("span")?.className).toContain("amber");
  });

  it("applies amber colour classes at the 30-day boundary", () => {
    const { container } = render(
      <DealExpiryCountdown dealExpiry={daysFromNow(30)} />
    );
    expect(container.querySelector("span")?.className).toContain("amber");
  });

  it("applies emerald colour classes when more than 30 days remain", () => {
    const { container } = render(
      <DealExpiryCountdown dealExpiry={daysFromNow(60)} />
    );
    expect(container.querySelector("span")?.className).toContain("emerald");
  });

  // ── standard variant ──────────────────────────────────────────────────────

  it("standard variant renders 'Ends in X days' for urgent dates", () => {
    render(
      <DealExpiryCountdown dealExpiry={daysFromNow(2)} variant="standard" />
    );
    expect(screen.getByText("Ends in 2 days")).toBeInTheDocument();
  });

  it("standard variant renders 'Ends in 1 day' (singular) for 1 day", () => {
    render(
      <DealExpiryCountdown dealExpiry={daysFromNow(1)} variant="standard" />
    );
    expect(screen.getByText("Ends in 1 day")).toBeInTheDocument();
  });

  it("standard variant renders 'Ends in 7 days' at the urgency boundary", () => {
    render(
      <DealExpiryCountdown dealExpiry={daysFromNow(7)} variant="standard" />
    );
    expect(screen.getByText("Ends in 7 days")).toBeInTheDocument();
  });

  it("standard variant renders 'X days left' for non-urgent dates", () => {
    render(
      <DealExpiryCountdown dealExpiry={daysFromNow(20)} variant="standard" />
    );
    expect(screen.getByText("20 days left")).toBeInTheDocument();
  });

  it("standard variant still renders nothing for a past date", () => {
    const { container } = render(
      <DealExpiryCountdown dealExpiry={daysFromNow(-5)} variant="standard" />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
