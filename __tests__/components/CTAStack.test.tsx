import { describe, it, expect, vi } from "vitest";
import { render, screen } from "./setup";
import type { Broker } from "@/lib/types";

vi.mock("@/lib/tracking", () => ({
  getAffiliateLink: (b: Broker) => `https://aff.example.com/${b.slug}`,
  getBenefitCta: () => "Open Account",
  trackClick: vi.fn(),
  AFFILIATE_REL: "noopener noreferrer sponsored",
  renderStars: () => "★★★★★",
}));

import CTAStack from "@/components/CTAStack";

function makeBroker(over: Partial<Broker>): Broker {
  return {
    slug: "vanguard",
    name: "Vanguard",
    asx_fee: "$5",
    asx_fee_value: 5,
    deal_text: undefined,
    ...over,
  } as unknown as Broker;
}

describe("CTAStack", () => {
  it("renders the primary headline with broker name", () => {
    render(<CTAStack broker={makeBroker({})} context="review" />);
    expect(
      screen.getByRole("heading", { name: /Ready to try Vanguard/ }),
    ).toBeInTheDocument();
  });

  it("renders deal_text as the description when broker has an active deal", () => {
    render(
      <CTAStack
        broker={makeBroker({ deal_text: "Get $200 off first year" })}
        context="review"
      />,
    );
    expect(
      screen.getByText("Get $200 off first year"),
    ).toBeInTheDocument();
  });

  it("falls back to the low-fee phrasing when asx_fee_value <= 5 and no deal", () => {
    render(
      <CTAStack
        broker={makeBroker({ asx_fee: "$3", asx_fee_value: 3 })}
        context="review"
      />,
    );
    expect(
      screen.getByText(/Start trading from just \$3 per trade/),
    ).toBeInTheDocument();
  });

  it("falls back to the generic phrasing for higher-fee brokers with no deal", () => {
    render(
      <CTAStack
        broker={makeBroker({ asx_fee_value: 19, asx_fee: "$19" })}
        context="review"
      />,
    );
    expect(
      screen.getByText(/Open an account and start trading/),
    ).toBeInTheDocument();
  });

  it("renders the cross-link row (Compare, Quiz, Find Advisor)", () => {
    render(<CTAStack broker={makeBroker({})} context="review" />);
    expect(
      screen.getByRole("link", { name: "Compare Platforms" }),
    ).toHaveAttribute("href", "/compare");
    expect(
      screen.getByRole("link", { name: "Platform Quiz" }),
    ).toHaveAttribute("href", "/get-matched");
    expect(
      screen.getByRole("link", { name: "Find Advisor" }),
    ).toHaveAttribute("href", "/find-advisor");
  });

  it("renders the 'How we score' methodology link by default", () => {
    render(<CTAStack broker={makeBroker({})} context="review" />);
    expect(
      screen.getByRole("link", { name: "How we score" }),
    ).toHaveAttribute("href", "/methodology");
  });

  it("hides the 'Sources' link when showSources is false (default)", () => {
    render(<CTAStack broker={makeBroker({})} context="review" />);
    expect(
      screen.queryByRole("link", { name: "Sources" }),
    ).not.toBeInTheDocument();
  });

  it("renders the 'Sources' link when showSources=true", () => {
    render(
      <CTAStack broker={makeBroker({})} context="review" showSources />,
    );
    expect(
      screen.getByRole("link", { name: "Sources" }),
    ).toHaveAttribute("href", "/how-we-verify");
  });
});
