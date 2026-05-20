import { describe, it, expect } from "vitest";
import { render, screen } from "./setup";
import MarketTicker from "@/components/MarketTicker";

/**
 * MarketTicker renders 6 hardcoded market tickers (ASX 200, BTC/AUD,
 * AUD/USD, ETH/AUD, Gold/AUD, S&P 500), duplicated for seamless
 * marquee scroll. The hardcoded values are placeholders (intentionally
 * "Indicative only. Not financial advice." per the compliance
 * footnote) but the structure + compliance label need to render
 * predictably.
 */
describe("MarketTicker", () => {
  it("exposes the ticker as a keyboard-focusable region with aria-label", () => {
    render(<MarketTicker />);
    const region = screen.getByLabelText(/Market ticker/);
    expect(region).toBeInTheDocument();
    expect(region).toHaveAttribute("tabIndex", "0");
  });

  it("renders the compliance footnote 'Indicative only. Not financial advice.'", () => {
    render(<MarketTicker />);
    expect(
      screen.getByText("Indicative only. Not financial advice."),
    ).toBeInTheDocument();
  });

  it("includes all 6 ticker labels (each appearing twice — duplicated for marquee loop)", () => {
    render(<MarketTicker />);
    for (const label of [
      "ASX 200",
      "BTC/AUD",
      "AUD/USD",
      "ETH/AUD",
      "Gold/AUD",
      "S&P 500",
    ]) {
      // Each appears twice (duplicated for seamless loop) — at least one match.
      expect(screen.getAllByText(label).length).toBeGreaterThanOrEqual(2);
    }
  });

  it("uses amber accent for up trends and red for down trends", () => {
    const { container } = render(<MarketTicker />);
    // Up tickers have text-amber-400; down tickers have text-red-400.
    expect(container.querySelectorAll(".text-amber-400").length).toBeGreaterThan(0);
    expect(container.querySelectorAll(".text-red-400").length).toBeGreaterThan(0);
  });

  it("respects prefers-reduced-motion via motion-reduce class", () => {
    const { container } = render(<MarketTicker />);
    expect(container.querySelector(".motion-reduce\\:animate-none")).not.toBeNull();
  });
});
