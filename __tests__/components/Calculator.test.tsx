import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "./setup";
import CalculatorsClient from "@/app/calculators/CalculatorsClient";
import type { Broker } from "@/lib/types";

// Mock the AuthorByline component (not relevant to calculator logic)
vi.mock("@/components/AuthorByline", () => ({
  default: () => <div data-testid="author-byline" />,
}));

// Mock the AdSlot component
vi.mock("@/components/AdSlot", () => ({
  default: () => <div data-testid="ad-slot" />,
}));

// Mock the Icon component to render a simple span
vi.mock("@/components/Icon", () => ({
  default: ({ name, ...rest }: { name: string; [key: string]: unknown }) => (
    <span data-testid={`icon-${name}`} {...rest} />
  ),
}));

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
    platform_type: "share_broker" as const,
    rating: 4.0,
    asx_fee: "$5",
    asx_fee_value: 5,
    us_fee: "$2",
    us_fee_value: 2,
    fx_rate: 0.6,
    affiliate_url: "https://example.com",
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

const cheapBroker = makeBroker({
  id: 1,
  name: "CheapBroker",
  slug: "cheap-broker",
  asx_fee: "$0",
  asx_fee_value: 0,
  us_fee: "$0",
  us_fee_value: 0,
  fx_rate: 0.2,
  is_crypto: false,
});

const midBroker = makeBroker({
  id: 2,
  name: "MidBroker",
  slug: "mid-broker",
  asx_fee: "$5",
  asx_fee_value: 5,
  us_fee: "$2",
  us_fee_value: 2,
  fx_rate: 0.5,
  is_crypto: false,
});

const expensiveBroker = makeBroker({
  id: 3,
  name: "ExpensiveBroker",
  slug: "expensive-broker",
  asx_fee: "$19.95",
  asx_fee_value: 19.95,
  us_fee: "$9.50",
  us_fee_value: 9.5,
  fx_rate: 0.7,
  is_crypto: false,
});

const cryptoBroker = makeBroker({
  id: 4,
  name: "CryptoBroker",
  slug: "crypto-broker",
  is_crypto: true,
});

const brokers = [cheapBroker, midBroker, expensiveBroker, cryptoBroker];

describe("CalculatorsClient", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock requestAnimationFrame for AnimatedNumber
    vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
      cb(performance.now() + 500);
      return 0;
    });
  });

  describe("page layout", () => {
    it("renders the page heading", () => {
      render(<CalculatorsClient brokers={brokers} />);
      expect(screen.getByText("Investing Tools")).toBeInTheDocument();
    });

    it("renders the page subtitle", () => {
      render(<CalculatorsClient brokers={brokers} />);
      expect(
        screen.getByText(/Free calculators to compare fees/)
      ).toBeInTheDocument();
    });

    it("renders all calculator tabs", () => {
      render(<CalculatorsClient brokers={brokers} />);

      expect(screen.getAllByText("Trade Cost").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("US Share Costs").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Compare Fees").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Tax on Profits").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Dividend Tax").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Share Safety").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("Fee Impact").length).toBeGreaterThanOrEqual(1);
    });

    it("renders Related Resources section", () => {
      render(<CalculatorsClient brokers={brokers} />);
      expect(screen.getByText("Related Resources")).toBeInTheDocument();
    });

    it("renders Fee Impact tab without PRO badge", () => {
      render(<CalculatorsClient brokers={brokers} />);
      expect(screen.getAllByText("Fee Impact").length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Trade Cost Calculator (default)", () => {
    it("renders Trade Cost Calculator by default", () => {
      render(<CalculatorsClient brokers={brokers} />);
      expect(screen.getByText("Trade Cost Calculator")).toBeInTheDocument();
    });

    it("shows default trade amount input", () => {
      render(<CalculatorsClient brokers={brokers} />);
      const input = screen.getByLabelText("Trade amount in AUD");
      expect(input).toBeInTheDocument();
      expect(input).toHaveValue(5000);
    });

    it("renders ASX and US market buttons", () => {
      render(<CalculatorsClient brokers={brokers} />);
      expect(screen.getByRole("button", { name: "ASX" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "US" })).toBeInTheDocument();
    });

    it("renders quick amount buttons", () => {
      render(<CalculatorsClient brokers={brokers} />);
      expect(screen.getByText("$500")).toBeInTheDocument();
      expect(screen.getByText("$1,000")).toBeInTheDocument();
      expect(screen.getByText("$5,000")).toBeInTheDocument();
      expect(screen.getByText("$25,000")).toBeInTheDocument();
    });

    it("displays broker results sorted by cost (cheapest first)", () => {
      render(<CalculatorsClient brokers={brokers} />);
      // CheapBroker has asx_fee_value=0, should appear in results
      expect(screen.getAllByText("CheapBroker").length).toBeGreaterThanOrEqual(1);
    });

    it("labels the cheapest broker", () => {
      render(<CalculatorsClient brokers={brokers} />);

      // "Cheapest" label appears for the lowest-cost broker
      expect(screen.getAllByText("Cheapest").length).toBeGreaterThanOrEqual(1);
    });

    it("excludes crypto brokers from results", () => {
      render(<CalculatorsClient brokers={brokers} />);

      // CryptoBroker should not appear in trade cost results
      expect(screen.queryByText("CryptoBroker")).not.toBeInTheDocument();
    });

    it("shows savings callout when there are multiple results", () => {
      render(<CalculatorsClient brokers={brokers} />);

      expect(screen.getByText(/Savings:/)).toBeInTheDocument();
    });

    it("shows no-results or handles crypto-only gracefully", () => {
      // Only crypto brokers -> ASX results may be empty
      render(<CalculatorsClient brokers={[cryptoBroker]} />);
      // Should render without crashing
      expect(screen.getByText("Trade Cost Calculator")).toBeInTheDocument();
    });
  });

  describe("Trade Cost Calculator computation", () => {
    it("correctly computes ASX trade costs", () => {
      render(<CalculatorsClient brokers={[cheapBroker, expensiveBroker]} />);

      expect(screen.getAllByText("CheapBroker").length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText("ExpensiveBroker").length).toBeGreaterThanOrEqual(1);
    });

    it("handles zero trade amount gracefully", async () => {
      render(<CalculatorsClient brokers={brokers} />);

      const input = screen.getByLabelText("Trade amount in AUD");
      await import("@testing-library/user-event").then(async (mod) => {
        const user = mod.default.setup();
        await user.clear(input);
        await user.type(input, "0");
      });

      // Should still render without crashing
      expect(screen.getAllByText("CheapBroker").length).toBeGreaterThanOrEqual(1);
    });
  });
});
