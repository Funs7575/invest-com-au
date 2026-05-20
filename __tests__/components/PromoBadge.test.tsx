import { describe, it, expect } from "vitest";
import { render, screen } from "./setup";
import PromoBadge from "@/components/PromoBadge";
import type { Broker } from "@/lib/types";

/**
 * PromoBadge surfaces a "Promo" pill on every broker card that has an
 * active deal, with hover-revealed tooltip carrying the deal_text +
 * formatted expiry. The pill is invisible (renders nothing) when the
 * broker doesn't have a deal — a regression here either hides every
 * promo or surfaces a tooltip without the offer text.
 */
function makeBroker(over: Partial<Broker>): Broker {
  return {
    deal: false,
    deal_text: undefined,
    deal_expiry: undefined,
    ...over,
  } as unknown as Broker;
}

describe("PromoBadge", () => {
  it("renders nothing when broker.deal is false", () => {
    const { container } = render(
      <PromoBadge
        broker={makeBroker({ deal: false, deal_text: "Some offer" })}
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders nothing when broker.deal_text is empty/null", () => {
    const { container } = render(
      <PromoBadge broker={makeBroker({ deal: true, deal_text: undefined })} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the Promo pill when deal + deal_text are present", () => {
    render(
      <PromoBadge
        broker={makeBroker({
          deal: true,
          deal_text: "Get $200 off first year",
        })}
      />,
    );
    expect(screen.getByText("Promo")).toBeInTheDocument();
    expect(screen.getByText("Get $200 off first year")).toBeInTheDocument();
  });

  it("renders the formatted expiry when deal_expiry is supplied", () => {
    // 15 June 2026 UTC — formatted as "15 Jun" in en-AU short style.
    render(
      <PromoBadge
        broker={makeBroker({
          deal: true,
          deal_text: "Offer",
          deal_expiry: "2026-06-15T00:00:00.000Z",
        })}
      />,
    );
    expect(screen.getByText(/Expires/)).toBeInTheDocument();
    expect(screen.getByText(/15 Jun/)).toBeInTheDocument();
  });

  it("omits the Expires line when deal_expiry is null", () => {
    render(
      <PromoBadge
        broker={makeBroker({
          deal: true,
          deal_text: "Offer",
          deal_expiry: undefined,
        })}
      />,
    );
    expect(screen.queryByText(/Expires/)).not.toBeInTheDocument();
  });
});
