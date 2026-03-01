import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "./setup";
import BrokerCard from "@/components/BrokerCard";
import type { Broker } from "@/lib/types";

/**
 * Factory for creating test broker data with sensible defaults.
 * Override any field by passing a partial Broker.
 */
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
    rating: 4.5,
    asx_fee: "$5",
    asx_fee_value: 5,
    us_fee: "$0",
    us_fee_value: 0,
    fx_rate: 0.6,
    created_at: "2025-01-01T00:00:00Z",
    updated_at: "2025-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("BrokerCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders broker name and rating", () => {
    const broker = makeBroker({ name: "CommSec", slug: "commsec", rating: 4.2 });
    render(<BrokerCard broker={broker} />);

    expect(screen.getByText("CommSec")).toBeInTheDocument();
    expect(screen.getByText("4.2/5")).toBeInTheDocument();
  });

  it("renders ASX fee, US fee, FX rate, and CHESS status in metrics grid", () => {
    const broker = makeBroker({
      asx_fee: "$5.00",
      us_fee: "US$2",
      fx_rate: 0.7,
      chess_sponsored: true,
    });
    render(<BrokerCard broker={broker} />);

    expect(screen.getByText("$5.00")).toBeInTheDocument();
    expect(screen.getByText("US$2")).toBeInTheDocument();
    expect(screen.getByText("0.7%")).toBeInTheDocument();
    // CHESS sponsored shows checkmark
    expect(screen.getByText("\u2713")).toBeInTheDocument();
  });

  it("renders N/A for missing optional fee fields", () => {
    const broker = makeBroker({
      asx_fee: undefined,
      us_fee: undefined,
      fx_rate: undefined,
    });
    render(<BrokerCard broker={broker} />);

    // Should show N/A for each missing field (ASX, US, FX)
    const naElements = screen.getAllByText("N/A");
    expect(naElements.length).toBeGreaterThanOrEqual(3);
  });

  it("renders CHESS not sponsored indicator when chess_sponsored is false", () => {
    const broker = makeBroker({ chess_sponsored: false });
    render(<BrokerCard broker={broker} />);

    expect(screen.getByText("\u2717")).toBeInTheDocument();
  });

  it("renders deal badge when broker has an active deal", () => {
    const broker = makeBroker({
      deal: true,
      deal_text: "Free trades for 30 days",
    });
    render(<BrokerCard broker={broker} />);

    expect(screen.getByText("Free trades for 30 days")).toBeInTheDocument();
  });

  it("renders deal expiry countdown when deal_expiry is set and in the future", () => {
    // Set expiry to 3 days from now
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);

    const broker = makeBroker({
      deal: true,
      deal_text: "Limited offer",
      deal_expiry: futureDate.toISOString(),
    });
    render(<BrokerCard broker={broker} />);

    expect(screen.getByText("Limited offer")).toBeInTheDocument();
    expect(screen.getByText("3d left")).toBeInTheDocument();
  });

  it("renders 'Ends tomorrow' when deal expires in 1 day", () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);

    const broker = makeBroker({
      deal: true,
      deal_text: "Hot deal",
      deal_expiry: tomorrow.toISOString(),
    });
    render(<BrokerCard broker={broker} />);

    expect(screen.getByText("Ends tomorrow")).toBeInTheDocument();
  });

  it("does not render deal badge when deal is false", () => {
    const broker = makeBroker({ deal: false, deal_text: undefined });
    render(<BrokerCard broker={broker} />);

    // No deal text should be present
    expect(screen.queryByText(/deal/i)).not.toBeInTheDocument();
  });

  it("renders badge text when badge prop is provided and broker is not sponsored", () => {
    const broker = makeBroker({ sponsorship_tier: null });
    render(<BrokerCard broker={broker} badge="Editor's Pick" />);

    expect(screen.getByText("Editor's Pick")).toBeInTheDocument();
  });

  it("renders sponsor badge for sponsored broker instead of text badge", () => {
    const broker = makeBroker({ sponsorship_tier: "featured_partner" });
    render(<BrokerCard broker={broker} badge="Editor's Pick" />);

    // SponsorBadge should be rendered for featured_partner
    expect(screen.getByText(/Featured Partner/)).toBeInTheDocument();
    // The text badge should NOT appear because sponsor badge takes precedence
    expect(screen.queryByText("Editor's Pick")).not.toBeInTheDocument();
  });

  it("renders fee verified date when fee_last_checked is provided", () => {
    const broker = makeBroker({ fee_last_checked: "2025-06-15T00:00:00Z" });
    render(<BrokerCard broker={broker} />);

    expect(screen.getByText(/Fees verified/)).toBeInTheDocument();
  });

  it("does not render fee verified date when fee_last_checked is absent", () => {
    const broker = makeBroker({ fee_last_checked: undefined });
    render(<BrokerCard broker={broker} />);

    expect(screen.queryByText(/Fees verified/)).not.toBeInTheDocument();
  });

  it("renders CTA button with correct text from getBenefitCta", () => {
    // getBenefitCta for a broker with no benefit_cta/cta_text and no deal,
    // in 'compare' context with asx_fee_value=5 returns "Trade from $5 ->"
    const broker = makeBroker({
      benefit_cta: undefined,
      cta_text: undefined,
      deal: false,
      asx_fee_value: 5,
      asx_fee: "$5",
    });
    render(<BrokerCard broker={broker} context="compare" />);

    expect(screen.getByText(/Trade from \$5/)).toBeInTheDocument();
  });

  it("renders custom CTA when benefit_cta is set", () => {
    const broker = makeBroker({ benefit_cta: "Start Trading Now" });
    render(<BrokerCard broker={broker} />);

    expect(screen.getByText("Start Trading Now")).toBeInTheDocument();
  });

  it("renders review link pointing to broker page", () => {
    const broker = makeBroker({ slug: "selfwealth" });
    render(<BrokerCard broker={broker} />);

    const reviewLink = screen.getByText("Review");
    expect(reviewLink).toBeInTheDocument();
    expect(reviewLink.closest("a")).toHaveAttribute("href", "/broker/selfwealth");
  });

  it("renders selection checkbox when onToggleSelect is provided", () => {
    const onToggle = vi.fn();
    const broker = makeBroker({ name: "SelectBroker" });
    render(
      <BrokerCard
        broker={broker}
        onToggleSelect={onToggle}
        isSelected={false}
      />
    );

    const selectButton = screen.getByLabelText(
      "Select SelectBroker for comparison"
    );
    expect(selectButton).toBeInTheDocument();
  });

  it("renders deselect label when isSelected is true", () => {
    const onToggle = vi.fn();
    const broker = makeBroker({ name: "PickedBroker" });
    render(
      <BrokerCard broker={broker} onToggleSelect={onToggle} isSelected={true} />
    );

    expect(
      screen.getByLabelText("Deselect PickedBroker")
    ).toBeInTheDocument();
  });

  it("does not render selection checkbox when onToggleSelect is undefined", () => {
    const broker = makeBroker({ name: "NoSelect" });
    render(<BrokerCard broker={broker} />);

    expect(
      screen.queryByLabelText(/Select NoSelect/)
    ).not.toBeInTheDocument();
  });

  it("renders broker initial when icon is not set", () => {
    const broker = makeBroker({ name: "eToro", icon: undefined });
    render(<BrokerCard broker={broker} />);

    // First character of name is used as fallback icon
    expect(screen.getByText("e")).toBeInTheDocument();
  });

  it("renders broker icon when icon is set", () => {
    const broker = makeBroker({ icon: "ET" });
    render(<BrokerCard broker={broker} />);

    expect(screen.getByText("ET")).toBeInTheDocument();
  });

  it("renders the CTA link with the correct affiliate href", () => {
    const broker = makeBroker({
      slug: "interactive-brokers",
      affiliate_url: "https://example.com/ib",
      benefit_cta: "Go to IB",
    });
    render(<BrokerCard broker={broker} />);

    const ctaLink = screen.getByText("Go to IB").closest("a");
    // getAffiliateLink returns /go/{slug} when affiliate_url is set
    expect(ctaLink).toHaveAttribute("href", "/go/interactive-brokers");
  });
});
