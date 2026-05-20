import { describe, it, expect } from "vitest";
import { render, screen } from "./setup";
import FeeBarChart from "@/components/FeeBarChart";
import type { Broker } from "@/lib/types";

function makeBroker(over: Partial<Broker>): Broker {
  return {
    name: "X",
    color: "#000",
    fx_rate: 0.5,
    ...over,
  } as unknown as Broker;
}

describe("FeeBarChart", () => {
  it("renders the headline with default trade amount $10,000", () => {
    render(<FeeBarChart brokers={[]} />);
    expect(
      screen.getByText(/FX Cost on a \$10,000 Trade/),
    ).toBeInTheDocument();
  });

  it("renders the headline with a custom tradeAmount", () => {
    render(<FeeBarChart brokers={[]} tradeAmount={50000} />);
    expect(
      screen.getByText(/FX Cost on a \$50,000 Trade/),
    ).toBeInTheDocument();
  });

  it("always renders the CommSec Big 4 baseline row", () => {
    render(<FeeBarChart brokers={[]} />);
    expect(screen.getByText("CommSec (Big 4)")).toBeInTheDocument();
    // 10000 * 0.7% = $70.00
    expect(screen.getByText("$70.00")).toBeInTheDocument();
  });

  it("renders one row per broker with fx_rate > 0", () => {
    render(
      <FeeBarChart
        brokers={[
          makeBroker({ name: "A", fx_rate: 0.4 }),
          makeBroker({ name: "B", fx_rate: 0.2 }),
          makeBroker({ name: "C", fx_rate: 0 }), // filtered out
        ]}
      />,
    );
    expect(screen.getByText("A")).toBeInTheDocument();
    expect(screen.getByText("B")).toBeInTheDocument();
    expect(screen.queryByText("C")).not.toBeInTheDocument();
  });

  it("excludes brokers with null/undefined fx_rate", () => {
    render(
      <FeeBarChart
        brokers={[
          makeBroker({ name: "NoFx", fx_rate: undefined }),
        ]}
      />,
    );
    expect(screen.queryByText("NoFx")).not.toBeInTheDocument();
  });

  it("computes per-broker FX cost as tradeAmount * (fx_rate / 100)", () => {
    render(
      <FeeBarChart
        brokers={[makeBroker({ name: "Broker50bps", fx_rate: 0.5 })]}
        tradeAmount={10000}
      />,
    );
    // 10000 * 0.5/100 = $50.00
    expect(screen.getByText("$50.00")).toBeInTheDocument();
  });

  it("sorts brokers descending by fx_rate (highest cost first)", () => {
    render(
      <FeeBarChart
        brokers={[
          makeBroker({ name: "Cheap", fx_rate: 0.1 }),
          makeBroker({ name: "Expensive", fx_rate: 0.6 }),
          makeBroker({ name: "Mid", fx_rate: 0.3 }),
        ]}
        tradeAmount={10000}
      />,
    );
    const rows = screen.getAllByText(/Cheap|Expensive|Mid|CommSec/);
    const order = rows.map((r) => r.textContent);
    // CommSec first (baseline), then Expensive (0.6), Mid (0.3), Cheap (0.1)
    expect(order[0]).toContain("CommSec");
    expect(order[1]).toBe("Expensive");
    expect(order[2]).toBe("Mid");
    expect(order[3]).toBe("Cheap");
  });

  it("renders the footnote with the Big 4 0.70% reference rate", () => {
    render(<FeeBarChart brokers={[]} />);
    expect(screen.getByText(/Big 4 rate: 0\.70%/)).toBeInTheDocument();
  });
});
