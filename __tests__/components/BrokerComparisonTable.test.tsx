import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "./setup";
import BrokerComparisonTable from "@/components/BrokerComparisonTable";
import type { Broker } from "@/lib/types";

function makeBroker(overrides: Partial<Broker> = {}): Broker {
  return {
    id: 1,
    name: "TestBroker",
    slug: "test-broker",
    color: "#3b82f6",
    chess_sponsored: true,
    smsf_support: false,
    is_crypto: false,
    deal: false,
    editors_pick: false,
    status: "active",
    rating: 4.0,
    asx_fee: "$5",
    asx_fee_value: 5,
    us_fee: "$2",
    us_fee_value: 2,
    fx_rate: 0.6,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

const brokerA = makeBroker({
  id: 1,
  name: "BrokerAlpha",
  slug: "broker-alpha",
  fx_rate: 0.2,
  us_fee: "$0",
  us_fee_value: 0,
  rating: 4.5,
  chess_sponsored: true,
});

const brokerB = makeBroker({
  id: 2,
  name: "BrokerBeta",
  slug: "broker-beta",
  fx_rate: 0.7,
  us_fee: "$5",
  us_fee_value: 5,
  rating: 3.8,
  chess_sponsored: false,
});

const brokerC = makeBroker({
  id: 3,
  name: "BrokerGamma",
  slug: "broker-gamma",
  fx_rate: 0.5,
  us_fee: "$3",
  us_fee_value: 3,
  rating: 4.2,
  chess_sponsored: true,
});

describe("BrokerComparisonTable", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the heading", () => {
    render(<BrokerComparisonTable brokers={[brokerA, brokerB]} />);
    expect(
      screen.getByText("International Broker Comparison")
    ).toBeInTheDocument();
  });

  it("renders all broker names", () => {
    render(
      <BrokerComparisonTable brokers={[brokerA, brokerB, brokerC]} />
    );

    expect(screen.getAllByText("BrokerAlpha").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("BrokerBeta").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("BrokerGamma").length).toBeGreaterThanOrEqual(1);
  });

  it("renders sort tabs with FX Fee, US Fee, and Rating", () => {
    render(<BrokerComparisonTable brokers={[brokerA, brokerB]} />);

    expect(screen.getByRole("tab", { name: "FX Fee" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "US Fee" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Rating" })).toBeInTheDocument();
  });

  it("defaults to sorting by FX Fee (lowest first)", () => {
    render(
      <BrokerComparisonTable brokers={[brokerB, brokerA, brokerC]} />
    );

    // Default sort is fx_rate. BrokerAlpha has 0.2%, BrokerGamma 0.5%, BrokerBeta 0.7%
    // In the desktop table, the first row should be BrokerAlpha
    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");
    // rows[0] is thead row, rows[1] is the first data row
    expect(within(rows[1]).getByText("BrokerAlpha")).toBeInTheDocument();
  });

  it("shows LOWEST FX badge on the first broker when sorted by fx_rate", () => {
    render(
      <BrokerComparisonTable brokers={[brokerB, brokerA]} />
    );

    expect(screen.getAllByText("LOWEST FX").length).toBeGreaterThanOrEqual(1);
  });

  it("displays CHESS badge for CHESS sponsored brokers", () => {
    render(
      <BrokerComparisonTable brokers={[brokerA, brokerB]} />
    );

    // BrokerAlpha has chess_sponsored=true, so "CHESS" badge appears
    expect(screen.getAllByText("CHESS").length).toBeGreaterThanOrEqual(1);
  });

  it("displays FX rate percentages using FxBadge", () => {
    render(<BrokerComparisonTable brokers={[brokerA]} />);

    // formatPercent(0.2) => "0.20%"
    expect(screen.getAllByText("0.20%").length).toBeGreaterThanOrEqual(1);
  });

  it("displays N/A when fx_rate is null", () => {
    const noFxBroker = makeBroker({
      id: 10,
      name: "NoFX",
      slug: "nofx",
      fx_rate: undefined,
    });
    render(<BrokerComparisonTable brokers={[noFxBroker]} />);

    expect(screen.getAllByText("N/A").length).toBeGreaterThanOrEqual(1);
  });

  it("displays US fee values", () => {
    render(<BrokerComparisonTable brokers={[brokerA]} />);

    // BrokerAlpha us_fee is "$0"
    expect(screen.getAllByText("$0").length).toBeGreaterThanOrEqual(1);
  });

  it("renders CTA buttons for each broker", () => {
    render(
      <BrokerComparisonTable brokers={[brokerA, brokerB]} />
    );

    // Each broker should have a "Go to Site" CTA — at least in the desktop table
    const ctas = screen.getAllByText(/Go to Site/);
    expect(ctas.length).toBeGreaterThanOrEqual(2);
  });

  it("renders Stars component for each broker", () => {
    render(<BrokerComparisonTable brokers={[brokerA]} />);

    // BrokerAlpha has rating 4.5, which shows "4.5" text
    expect(screen.getAllByText("4.5").length).toBeGreaterThanOrEqual(1);
  });

  it("handles empty broker list gracefully", () => {
    render(<BrokerComparisonTable brokers={[]} />);

    // The heading should still render
    expect(
      screen.getByText("International Broker Comparison")
    ).toBeInTheDocument();

    // Table should exist but have no data rows
    const table = screen.getByRole("table");
    const rows = within(table).getAllByRole("row");
    // Only the header row
    expect(rows).toHaveLength(1);
  });

  it("renders mobile cards for each broker", () => {
    render(
      <BrokerComparisonTable brokers={[brokerA, brokerB]} />
    );

    // Mobile cards show "FX Fee", "US Trade", "CHESS" labels
    expect(screen.getAllByText("FX Fee").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("US Trade").length).toBeGreaterThanOrEqual(1);
  });

  it("shows Yes/No for CHESS in mobile cards", () => {
    render(
      <BrokerComparisonTable brokers={[brokerA, brokerB]} />
    );

    // brokerA chess_sponsored=true -> "Yes", brokerB chess_sponsored=false -> "No"
    expect(screen.getAllByText("Yes").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("No").length).toBeGreaterThanOrEqual(1);
  });
});
