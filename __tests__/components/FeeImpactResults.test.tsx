/**
 * @vitest-environment jsdom
 *
 * Tests for FeeImpactResults — specifically the Pro gating overlay and
 * the upgrade CTA that replaced the old "Coming Soon" button.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "./setup";
import type { Broker } from "@/lib/types";

// FeeImpactResults imports trackEvent from @/lib/tracking — already mocked in
// setup.tsx.  We also need to stub Icon and csv-export to prevent module errors.

vi.mock("@/lib/csv-export", () => ({
  downloadCSV: vi.fn(),
}));

vi.mock("@/components/Icon", () => ({
  default: ({ name }: { name: string }) => <span data-testid={`icon-${name}`} />,
}));

import FeeImpactResults from "@/app/fee-impact/_components/FeeImpactResults";

// Minimal broker fixture
const makeBroker = (slug: string, name: string): Broker =>
  ({
    slug,
    name,
    color: "#000000",
    icon: null,
    asx_fee_value: 9.5,
    us_fee_value: 0,
    fx_rate: null,
    inactivity_fee: null,
  }) as unknown as Broker;

const makeFeeResult = (slug: string, total: number) => ({
  broker: makeBroker(slug, slug),
  asxFees: total,
  usFees: 0,
  fxFees: 0,
  inactivityFees: 0,
  totalAnnual: total,
});

const FIVE_RESULTS = [1, 2, 3, 4, 5].map((n) =>
  makeFeeResult(`broker-${n}`, n * 100),
);

const SHARED_PROPS = {
  results: FIVE_RESULTS,
  cheapest: FIVE_RESULTS[0],
  mostExpensive: FIVE_RESULTS[4],
  currentBrokerResult: undefined,
  maxSavings: 400,
  maxTotal: 500,
  asxTrades: "4",
  usTrades: "0",
  avgTradeSize: "5000",
  currentBrokerSlug: "",
  AnimatedNumber: ({ value, prefix = "$" }: { value: number; prefix?: string; decimals?: number }) => (
    <span>{prefix}{value}</span>
  ),
  ShareResultsButton: () => <div data-testid="share-btn" />,
};

describe("FeeImpactResults — Pro gating overlay", () => {
  it("renders an active upgrade link (not 'Coming Soon') for non-Pro with hidden brokers", () => {
    render(
      <FeeImpactResults
        {...SHARED_PROPS}
        visibleResults={FIVE_RESULTS.slice(0, 3)}
        hiddenCount={2}
        isPro={false}
      />,
    );

    // The old dead button text should be gone
    expect(screen.queryByText("Coming Soon")).not.toBeInTheDocument();

    // The new active link should point to the upgrade page
    const upgradeLink = screen.getByRole("link", { name: /unlock 2 more brokers/i });
    expect(upgradeLink).toHaveAttribute("href", "/account/upgrade");
  });

  it("renders singular 'broker' when hiddenCount is 1", () => {
    render(
      <FeeImpactResults
        {...SHARED_PROPS}
        results={FIVE_RESULTS.slice(0, 4)}
        visibleResults={FIVE_RESULTS.slice(0, 3)}
        hiddenCount={1}
        isPro={false}
      />,
    );

    const upgradeLink = screen.getByRole("link", { name: /unlock 1 more broker$/i });
    expect(upgradeLink).toBeInTheDocument();
  });

  it("does not render the gating overlay for Pro users", () => {
    render(
      <FeeImpactResults
        {...SHARED_PROPS}
        visibleResults={FIVE_RESULTS}
        hiddenCount={0}
        isPro={true}
      />,
    );
    expect(screen.queryByText(/unlock \d+ more broker/i)).not.toBeInTheDocument();
  });
});

describe("FeeImpactResults — empty state", () => {
  it("renders the empty-state prompt when no results", () => {
    render(
      <FeeImpactResults
        {...SHARED_PROPS}
        results={[]}
        visibleResults={[]}
        hiddenCount={0}
        cheapest={undefined}
        mostExpensive={undefined}
        maxSavings={0}
        maxTotal={1}
        isPro={false}
      />,
    );
    expect(screen.getByText("Enter Your Trading Details")).toBeInTheDocument();
  });
});
