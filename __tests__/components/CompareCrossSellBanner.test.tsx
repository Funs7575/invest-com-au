import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, userEvent } from "./setup";
import CompareCrossSellBanner from "@/components/CompareCrossSellBanner";
import { trackEvent } from "@/lib/tracking";

const VERTICAL_LABELS: Record<string, string> = {
  shares: "Brokerages",
  super: "Super Funds",
  crypto: "Crypto Exchanges",
  savings: "Savings Accounts",
  robo: "Robo-Advisors",
  "term-deposits": "Term Deposits",
  property: "Property",
  cfd: "CFD & Forex",
  research: "Research Tools",
};

describe("CompareCrossSellBanner", () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.clearAllMocks();
  });

  it("renders nothing when vertical is 'all'", () => {
    const { container } = render(
      <CompareCrossSellBanner
        vertical="all"
        selectedCount={3}
        verticalLabels={VERTICAL_LABELS}
      />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing when fewer than 2 brokers are selected", () => {
    const { container } = render(
      <CompareCrossSellBanner
        vertical="shares"
        selectedCount={1}
        verticalLabels={VERTICAL_LABELS}
      />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders nothing for an unmapped vertical", () => {
    const { container } = render(
      <CompareCrossSellBanner
        vertical="not-a-real-vertical"
        selectedCount={3}
        verticalLabels={VERTICAL_LABELS}
      />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders shares→super suggestion when conditions are met", () => {
    render(
      <CompareCrossSellBanner
        vertical="shares"
        selectedCount={3}
        verticalLabels={VERTICAL_LABELS}
      />,
    );
    // CTA is the most stable assertion — copy contains target label.
    const cta = screen.getByRole("link", { name: /compare super funds/i });
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute("href", "/compare?filter=super");
  });

  it("renders crypto→shares suggestion (different mapping branch)", () => {
    render(
      <CompareCrossSellBanner
        vertical="crypto"
        selectedCount={2}
        verticalLabels={VERTICAL_LABELS}
      />,
    );
    const cta = screen.getByRole("link", { name: /compare brokerages/i });
    expect(cta).toHaveAttribute("href", "/compare?filter=shares");
  });

  it("hides itself after dismiss and persists to sessionStorage", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <CompareCrossSellBanner
        vertical="shares"
        selectedCount={3}
        verticalLabels={VERTICAL_LABELS}
      />,
    );

    const dismissBtn = screen.getByRole("button", {
      name: /dismiss suggestion/i,
    });
    await user.click(dismissBtn);

    expect(container.innerHTML).toBe("");
    expect(
      sessionStorage.getItem("compare-crosssell-dismissed-shares"),
    ).toBe("1");
    expect(trackEvent).toHaveBeenCalledWith(
      "compare_crosssell_dismiss",
      expect.objectContaining({ source: "shares", target: "super" }),
      "/compare",
    );
  });

  it("respects existing sessionStorage dismissal on mount", () => {
    sessionStorage.setItem("compare-crosssell-dismissed-shares", "1");
    const { container } = render(
      <CompareCrossSellBanner
        vertical="shares"
        selectedCount={3}
        verticalLabels={VERTICAL_LABELS}
      />,
    );
    expect(container.innerHTML).toBe("");
  });

  it("dismissal is scoped per vertical (super dismissal does not hide shares banner)", () => {
    sessionStorage.setItem("compare-crosssell-dismissed-super", "1");
    render(
      <CompareCrossSellBanner
        vertical="shares"
        selectedCount={3}
        verticalLabels={VERTICAL_LABELS}
      />,
    );
    expect(
      screen.getByRole("link", { name: /compare super funds/i }),
    ).toBeInTheDocument();
  });

  it("fires trackEvent on CTA click", async () => {
    const user = userEvent.setup();
    render(
      <CompareCrossSellBanner
        vertical="shares"
        selectedCount={3}
        verticalLabels={VERTICAL_LABELS}
      />,
    );
    const cta = screen.getByRole("link", { name: /compare super funds/i });
    await user.click(cta);
    expect(trackEvent).toHaveBeenCalledWith(
      "compare_crosssell_click",
      expect.objectContaining({ source: "shares", target: "super" }),
      "/compare",
    );
  });
});
