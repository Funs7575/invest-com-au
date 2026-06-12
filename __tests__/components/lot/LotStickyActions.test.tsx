import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, mockUseUser } from "../setup";

vi.mock("@/lib/session", () => ({
  getSessionId: vi.fn().mockReturnValue("sess-123"),
}));

import LotStickyActions from "@/components/invest/lot/LotStickyActions";

const PROPS = {
  sentinelId: "lot-hero-sentinel",
  priceLabel: "Asking",
  priceValue: "$2.5M",
  enquiryCta: "Enquire",
  slug: "riverina-aggregation-412ha",
  title: "Riverina Aggregation",
  vertical: "farmland",
};

describe("LotStickyActions", () => {
  beforeEach(() => {
    mockUseUser.mockReturnValue({ user: null, loading: false });
  });

  it("is aria-hidden AND inert while off-screen so hidden controls leave the tab order", () => {
    // jsdom has no IntersectionObserver — the bar stays in its hidden
    // (pre-scroll) state, which is exactly the state under test.
    const { container } = render(<LotStickyActions {...PROPS} />);
    const bar = container.firstElementChild as HTMLElement;

    expect(bar).toHaveAttribute("aria-hidden", "true");
    // aria-hidden alone leaves Save/Enquire keyboard-focusable; inert is
    // what actually removes the subtree from the tab order.
    expect(bar).toHaveAttribute("inert");
  });

  it("renders the price and the enquiry anchor to the in-page form", () => {
    const { container } = render(<LotStickyActions {...PROPS} />);
    expect(container.textContent).toContain("$2.5M");
    const anchor = container.querySelector('a[href="#enquire"]');
    expect(anchor).not.toBeNull();
    expect(anchor?.textContent).toBe("Enquire");
  });
});
