import { describe, it, expect } from "vitest";
import { render, screen } from "./setup";
import VerifiedBadge from "@/components/VerifiedBadge";

describe("VerifiedBadge — visibility", () => {
  it("renders nothing when method is null", () => {
    const { container } = render(<VerifiedBadge method={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when method is undefined", () => {
    const { container } = render(<VerifiedBadge method={undefined} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing for seeded_data when showSeeded is false (default)", () => {
    const { container } = render(<VerifiedBadge method="seeded_data" />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders Seeded pill for seeded_data when showSeeded is true (admin)", () => {
    render(<VerifiedBadge method="seeded_data" showSeeded />);
    expect(screen.getByText("Seeded")).toBeInTheDocument();
  });

  it("renders nothing for an unknown method token", () => {
    const { container } = render(<VerifiedBadge method="unknown_method" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("VerifiedBadge — pill content", () => {
  it("renders ABN Verified pill when method contains 'abn'", () => {
    render(<VerifiedBadge method="abn" />);
    expect(screen.getByText("ABN Verified")).toBeInTheDocument();
  });

  it("renders AFSL Current pill when method contains 'afsl'", () => {
    render(<VerifiedBadge method="afsl" />);
    expect(screen.getByText("AFSL Current")).toBeInTheDocument();
  });

  it("renders BOTH pills for method='abn+afsl'", () => {
    render(<VerifiedBadge method="abn+afsl" />);
    expect(screen.getByText("ABN Verified")).toBeInTheDocument();
    expect(screen.getByText("AFSL Current")).toBeInTheDocument();
  });

  it("renders BOTH pills for space-separated method='abn afsl'", () => {
    render(<VerifiedBadge method="abn afsl" />);
    expect(screen.getByText("ABN Verified")).toBeInTheDocument();
    expect(screen.getByText("AFSL Current")).toBeInTheDocument();
  });

  it("renders BOTH pills for comma-separated method='abn,afsl'", () => {
    render(<VerifiedBadge method="abn,afsl" />);
    expect(screen.getByText("ABN Verified")).toBeInTheDocument();
    expect(screen.getByText("AFSL Current")).toBeInTheDocument();
  });

  it("ignores case in the method string", () => {
    render(<VerifiedBadge method="ABN+AFSL" />);
    expect(screen.getByText("ABN Verified")).toBeInTheDocument();
    expect(screen.getByText("AFSL Current")).toBeInTheDocument();
  });
});

describe("VerifiedBadge — freshness label", () => {
  it("renders 'Re-verified today' for a same-day lastVerifiedAt", () => {
    render(<VerifiedBadge method="abn" lastVerifiedAt={new Date().toISOString()} />);
    expect(screen.getByText(/Re-verified today/)).toBeInTheDocument();
  });

  it("renders 'N days ago' label for recent dates", () => {
    const fiveDaysAgo = new Date(Date.now() - 5 * 86_400_000).toISOString();
    render(<VerifiedBadge method="abn" lastVerifiedAt={fiveDaysAgo} />);
    expect(screen.getByText(/Re-verified 5 days ago/)).toBeInTheDocument();
  });

  it("renders 'N months ago' label for dates 30+ days old", () => {
    const sixtyDaysAgo = new Date(Date.now() - 60 * 86_400_000).toISOString();
    render(<VerifiedBadge method="abn" lastVerifiedAt={sixtyDaysAgo} />);
    expect(screen.getByText(/Re-verified 2 months ago/)).toBeInTheDocument();
  });

  it("does NOT render the freshness label when compact is true", () => {
    render(
      <VerifiedBadge
        method="abn"
        lastVerifiedAt={new Date().toISOString()}
        compact
      />,
    );
    // The pill itself still renders, but the freshness <span> below it
    // is suppressed in compact mode.
    expect(screen.queryByText(/Re-verified today/)).not.toBeInTheDocument();
    expect(screen.getByText("ABN Verified")).toBeInTheDocument();
  });

  it("ignores a future lastVerifiedAt (returns null) — no freshness label", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    render(<VerifiedBadge method="abn" lastVerifiedAt={future} />);
    expect(screen.queryByText(/Re-verified/)).not.toBeInTheDocument();
  });

  it("ignores an invalid lastVerifiedAt string", () => {
    render(<VerifiedBadge method="abn" lastVerifiedAt="not-a-date" />);
    expect(screen.queryByText(/Re-verified/)).not.toBeInTheDocument();
  });
});

describe("VerifiedBadge — ABN/AFSL number splicing into the tooltip", () => {
  it("includes the ABN number in the tooltip when supplied", () => {
    render(<VerifiedBadge method="abn" abn="123 456 789" />);
    const pill = screen.getByText("ABN Verified").closest("span");
    expect(pill?.getAttribute("title")).toContain("ABN 123 456 789");
  });

  it("includes the AFSL number in the tooltip when supplied", () => {
    render(<VerifiedBadge method="afsl" afsl="987654" />);
    const pill = screen.getByText("AFSL Current").closest("span");
    expect(pill?.getAttribute("title")).toContain("AFSL 987654");
  });
});
