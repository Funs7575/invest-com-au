import { describe, it, expect } from "vitest";
import { render, screen } from "./setup";
import { FeesFreshnessIndicator } from "@/components/FeesFreshnessIndicator";

describe("FeesFreshnessIndicator", () => {
  it("renders nothing when lastChecked is null", () => {
    const { container } = render(<FeesFreshnessIndicator lastChecked={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders 'N min ago' label for recent times", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    render(<FeesFreshnessIndicator lastChecked={fiveMinAgo} />);
    expect(screen.getByText(/Fees checked 5 min ago/)).toBeInTheDocument();
  });

  it("renders 'N hours ago' for sub-day times", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    render(<FeesFreshnessIndicator lastChecked={threeHoursAgo} />);
    expect(screen.getByText(/Fees checked 3 hours ago/)).toBeInTheDocument();
  });

  it("renders 'yesterday' for exactly 1 day", () => {
    const oneDayAgo = new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString();
    render(<FeesFreshnessIndicator lastChecked={oneDayAgo} />);
    expect(screen.getByText(/Fees checked yesterday/)).toBeInTheDocument();
  });

  it("renders 'N days ago' for 2+ days", () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    render(<FeesFreshnessIndicator lastChecked={fiveDaysAgo} />);
    expect(screen.getByText(/Fees checked 5 days ago/)).toBeInTheDocument();
  });

  it("uses emerald dot for <24h", () => {
    const recent = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { container } = render(<FeesFreshnessIndicator lastChecked={recent} />);
    expect(container.querySelector(".bg-emerald-500")).not.toBeNull();
  });

  it("uses amber dot for 24h–72h", () => {
    const thirtyHoursAgo = new Date(Date.now() - 30 * 60 * 60 * 1000).toISOString();
    const { container } = render(<FeesFreshnessIndicator lastChecked={thirtyHoursAgo} />);
    expect(container.querySelector(".bg-amber-500")).not.toBeNull();
  });

  it("uses red dot for 72h+ (stale)", () => {
    const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
    const { container } = render(<FeesFreshnessIndicator lastChecked={fourDaysAgo} />);
    expect(container.querySelector(".bg-red-500")).not.toBeNull();
  });

  it("renders inline variant without the pill background", () => {
    const recent = new Date().toISOString();
    const { container } = render(
      <FeesFreshnessIndicator lastChecked={recent} variant="inline" />,
    );
    // The badge variant wraps in a rounded-full pill with border; inline doesn't.
    expect(container.querySelector(".rounded-full.border")).toBeNull();
  });
});
