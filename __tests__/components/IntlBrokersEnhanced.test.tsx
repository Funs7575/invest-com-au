import { describe, it, expect, vi } from "vitest";
import { render, screen } from "./setup";
import type { Broker } from "@/lib/types";

// Stub the four heavy child components so this test focuses on the
// composition wrapper: the disclosure block + which children render
// + the topPick conditional.
vi.mock("@/components/BrokerComparisonTable", () => ({
  default: ({ brokers }: { brokers: Broker[] }) => (
    <div data-testid="comparison-table" data-count={brokers.length} />
  ),
}));
vi.mock("@/components/EmbeddedFxCalc", () => ({
  default: ({ brokers }: { brokers: Broker[] }) => (
    <div data-testid="fx-calc" data-count={brokers.length} />
  ),
}));
vi.mock("@/components/FeeBarChart", () => ({
  default: ({ tradeAmount }: { tradeAmount?: number }) => (
    <div data-testid="fee-bar-chart" data-amount={String(tradeAmount ?? "")} />
  ),
}));
vi.mock("@/components/MobileFloatingCTA", () => ({
  default: ({ broker }: { broker: Broker }) => (
    <div data-testid="mobile-cta" data-slug={broker.slug} />
  ),
}));

import IntlBrokersEnhanced from "@/components/IntlBrokersEnhanced";

function makeBroker(slug: string): Broker {
  return { slug, name: slug } as Broker;
}

const brokers = [makeBroker("a"), makeBroker("b"), makeBroker("c")];

describe("IntlBrokersEnhanced", () => {
  it("renders the affiliate disclosure block with the how-we-earn link", () => {
    render(
      <IntlBrokersEnhanced
        brokers={brokers}
        topPick={null}
        pagePath="/x"
      />,
    );
    expect(screen.getByText("Disclosure:")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "How we earn money" }),
    ).toHaveAttribute("href", "/how-we-earn");
  });

  it("renders the comparison table with all brokers", () => {
    render(
      <IntlBrokersEnhanced
        brokers={brokers}
        topPick={null}
        pagePath="/x"
      />,
    );
    expect(screen.getByTestId("comparison-table")).toHaveAttribute(
      "data-count",
      "3",
    );
  });

  it("renders the fee bar chart with a $10,000 trade amount", () => {
    render(
      <IntlBrokersEnhanced
        brokers={brokers}
        topPick={null}
        pagePath="/x"
      />,
    );
    expect(screen.getByTestId("fee-bar-chart")).toHaveAttribute(
      "data-amount",
      "10000",
    );
  });

  it("renders the embedded FX calculator with the brokers", () => {
    render(
      <IntlBrokersEnhanced
        brokers={brokers}
        topPick={null}
        pagePath="/x"
      />,
    );
    expect(screen.getByTestId("fx-calc")).toHaveAttribute("data-count", "3");
  });

  it("does NOT render the mobile floating CTA when topPick is null", () => {
    render(
      <IntlBrokersEnhanced
        brokers={brokers}
        topPick={null}
        pagePath="/x"
      />,
    );
    expect(screen.queryByTestId("mobile-cta")).not.toBeInTheDocument();
  });

  it("renders the mobile floating CTA for the topPick when supplied", () => {
    render(
      <IntlBrokersEnhanced
        brokers={brokers}
        topPick={makeBroker("top")}
        pagePath="/x"
      />,
    );
    expect(screen.getByTestId("mobile-cta")).toHaveAttribute(
      "data-slug",
      "top",
    );
  });
});
