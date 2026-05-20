import { describe, it, expect } from "vitest";
import { render, screen } from "./setup";
import SponsorBadge from "@/components/SponsorBadge";
import type { Broker } from "@/lib/types";

/**
 * Sponsor disclosure pin — the visible "Sponsored / Promoted"
 * surface on every broker card. Regressions here = ASIC compliance
 * exposure (the disclosure suffix has to render alongside the tier
 * label).
 */

function makeBroker(tier: Broker["sponsorship_tier"]): Broker {
  // Cast to Broker — we only exercise the sponsorship_tier branch
  // in this file. Rest of Broker isn't read by SponsorBadge.
  return { sponsorship_tier: tier } as unknown as Broker;
}

describe("SponsorBadge", () => {
  it("renders nothing when sponsorship_tier is null/undefined", () => {
    const { container: nullC } = render(
      <SponsorBadge broker={makeBroker(null)} />,
    );
    expect(nullC).toBeEmptyDOMElement();
    const { container: undefC } = render(
      <SponsorBadge broker={makeBroker(undefined)} />,
    );
    expect(undefC).toBeEmptyDOMElement();
  });

  it("renders Featured Partner + Sponsored disclosure for featured_partner tier", () => {
    render(<SponsorBadge broker={makeBroker("featured_partner")} />);
    expect(screen.getByText("Featured Partner")).toBeInTheDocument();
    expect(screen.getByText(/Sponsored/)).toBeInTheDocument();
  });

  it("renders Editor's Pick + Promoted disclosure for editors_pick tier", () => {
    render(<SponsorBadge broker={makeBroker("editors_pick")} />);
    expect(screen.getByText(/Editor.s Pick/)).toBeInTheDocument();
    expect(screen.getByText(/Promoted/)).toBeInTheDocument();
  });

  it("renders Deal of the Month + Sponsored disclosure for deal_of_month tier", () => {
    render(<SponsorBadge broker={makeBroker("deal_of_month")} />);
    expect(screen.getByText("Deal of the Month")).toBeInTheDocument();
    expect(screen.getByText(/Sponsored/)).toBeInTheDocument();
  });

  it("renders nothing for an unknown tier (defensive — TS would reject this at compile time)", () => {
    const { container } = render(
      <SponsorBadge
        broker={
          { sponsorship_tier: "made_up_tier" } as unknown as Broker
        }
      />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("always renders the disclosure suffix alongside the label (ASIC compliance contract)", () => {
    // Every tier must surface a "Sponsored" or "Promoted" disclosure
    // immediately next to its label. Regressing this is a compliance
    // exposure — the user has to know the placement is paid.
    for (const tier of ["featured_partner", "editors_pick", "deal_of_month"] as const) {
      const { container } = render(<SponsorBadge broker={makeBroker(tier)} />);
      const text = container.textContent ?? "";
      expect(text).toMatch(/Sponsored|Promoted/);
    }
  });
});
