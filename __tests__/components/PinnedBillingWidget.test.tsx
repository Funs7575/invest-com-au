/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import PinnedBillingWidget from "@/app/advisor-portal/billing/PinnedBillingWidget";
import type { BillingSummary } from "@/app/advisor-portal/billing/types";

function summary(overrides: Partial<BillingSummary> = {}): BillingSummary {
  return {
    balance_cents: 50000,
    lifetime_credit_cents: 50000,
    lifetime_spend_cents: 12000,
    expiring_soon_cents: 0,
    free_leads_used: 3,
    free_leads_remaining: 0,
    lead_price_cents: 4900,
    advisor_tier: "free",
    pending_tier: null,
    pending_tier_effective_at: null,
    has_payment_method: true,
    has_stripe_customer: true,
    ledger_first_page: [],
    ledger_total: 0,
    ...overrides,
  };
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("PinnedBillingWidget", () => {
  it("shows the Healthy pill when there's plenty of credit", () => {
    render(<PinnedBillingWidget summary={summary()} />);
    expect(screen.getByText("Healthy")).toBeTruthy();
  });

  it("shows the Low credit pill when fewer than 3 leads' worth remain", () => {
    render(
      <PinnedBillingWidget summary={summary({ balance_cents: 9000, lead_price_cents: 4900 })} />,
    );
    expect(screen.getByText("Low credit")).toBeTruthy();
  });

  it("shows the Top up pill when balance is empty", () => {
    render(<PinnedBillingWidget summary={summary({ balance_cents: 0 })} />);
    expect(screen.getByText("Top up")).toBeTruthy();
  });

  it("shows the Downgrade scheduled pill when a pending_tier is set", () => {
    render(
      <PinnedBillingWidget
        summary={summary({
          pending_tier: "free",
          pending_tier_effective_at: new Date(Date.now() + 7 * 86400_000).toISOString(),
        })}
      />,
    );
    expect(screen.getByText("Downgrade scheduled")).toBeTruthy();
  });

  it("renders the credit balance in dollars and the leads-remaining estimate", () => {
    render(
      <PinnedBillingWidget summary={summary({ balance_cents: 49000, lead_price_cents: 4900 })} />,
    );
    expect(screen.getByText(/\$490/)).toBeTruthy();
    expect(screen.getByText(/10 leads/)).toBeTruthy();
  });
});
