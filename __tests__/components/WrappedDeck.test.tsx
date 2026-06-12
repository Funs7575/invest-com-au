import { describe, it, expect, vi } from "vitest";
import { render, screen, userEvent } from "./setup";

import WrappedDeck from "@/app/wrapped/WrappedDeck";
import type { WrappedCard } from "@/lib/wrapped";

const CARDS: WrappedCard[] = [
  {
    key: "intro",
    kicker: "Your year in money",
    headline: "FY26, nearly wrapped.",
    body: "Intro body.",
    tone: "violet",
  },
  {
    key: "balances",
    kicker: "What you're tracking",
    headline: "$42,240",
    body: "Balances body.",
    tone: "emerald",
    cta: { href: "/account/net-worth", label: "See the live view" },
  },
  {
    key: "finale",
    kicker: "Before June 30",
    headline: "Finish strong.",
    body: "FY26 — $42,240 tracked",
    tone: "slate",
  },
];

function renderDeck(overrides: Partial<React.ComponentProps<typeof WrappedDeck>> = {}) {
  return render(
    <WrappedDeck
      cards={CARDS}
      fyLabel="FY26"
      shareUrl="https://invest.com.au/wrapped"
      shareSummary="FY26 — $42,240 tracked"
      canShare
      {...overrides}
    />,
  );
}

describe("WrappedDeck", () => {
  it("shows one card at a time, starting at the intro", () => {
    renderDeck();
    expect(screen.getByText("FY26, nearly wrapped.")).toBeInTheDocument();
    expect(screen.queryByText("$42,240")).not.toBeInTheDocument();
    expect(screen.getByText("1 / 3")).toBeInTheDocument();
  });

  it("disables Previous on the first card and Next on the last", async () => {
    const user = userEvent.setup();
    renderDeck();
    const prev = screen.getByRole("button", { name: "Previous card" });
    const next = screen.getByRole("button", { name: "Next card" });
    expect(prev).toBeDisabled();
    await user.click(next);
    await user.click(next);
    expect(screen.getByText("Finish strong.")).toBeInTheDocument();
    expect(next).toBeDisabled();
    expect(prev).toBeEnabled();
  });

  it("advances with the next button and renders the card CTA", async () => {
    const user = userEvent.setup();
    renderDeck();
    await user.click(screen.getByRole("button", { name: "Next card" }));
    expect(screen.getByText("$42,240")).toBeInTheDocument();
    const cta = screen.getByRole("link", { name: /See the live view/ });
    expect(cta).toHaveAttribute("href", "/account/net-worth");
  });

  it("navigates with arrow keys on the carousel region", async () => {
    const user = userEvent.setup();
    renderDeck();
    const region = screen.getByRole("region", { name: "FY26 Money Wrapped" });
    region.focus();
    await user.keyboard("{ArrowRight}");
    expect(screen.getByText("$42,240")).toBeInTheDocument();
    await user.keyboard("{ArrowLeft}");
    expect(screen.getByText("FY26, nearly wrapped.")).toBeInTheDocument();
    await user.keyboard("{End}");
    expect(screen.getByText("Finish strong.")).toBeInTheDocument();
    await user.keyboard("{Home}");
    expect(screen.getByText("FY26, nearly wrapped.")).toBeInTheDocument();
  });

  it("shows share, download and FY-setup actions on the finale", async () => {
    const user = userEvent.setup();
    renderDeck();
    const region = screen.getByRole("region", { name: "FY26 Money Wrapped" });
    region.focus();
    await user.keyboard("{End}");

    expect(screen.getByRole("button", { name: "Share my Wrapped" })).toBeInTheDocument();
    const download = screen.getByRole("link", { name: "Download my card" });
    expect(download).toHaveAttribute("href", "/api/account/wrapped-card");
    expect(download).toHaveAttribute("download", "fy26-money-wrapped.png");

    expect(screen.getByRole("link", { name: /Set a goal/ })).toHaveAttribute(
      "href",
      "/account/goals",
    );
    expect(screen.getByRole("link", { name: /Run your health check/ })).toHaveAttribute(
      "href",
      "/account/health",
    );
    expect(screen.getByRole("link", { name: /Find an adviser/ })).toHaveAttribute(
      "href",
      "/find-advisor",
    );
  });

  it("hides share and download when there is nothing to share yet", async () => {
    const user = userEvent.setup();
    renderDeck({ canShare: false });
    const region = screen.getByRole("region", { name: "FY26 Money Wrapped" });
    region.focus();
    await user.keyboard("{End}");
    expect(screen.queryByRole("button", { name: "Share my Wrapped" })).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Download my card" })).not.toBeInTheDocument();
    // FY-setup CTAs still present.
    expect(screen.getByRole("link", { name: /Set a goal/ })).toBeInTheDocument();
  });

  it("falls back to the clipboard when navigator.share is unavailable", async () => {
    const user = userEvent.setup();
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, "clipboard", {
      value: { writeText },
      configurable: true,
    });

    renderDeck();
    const region = screen.getByRole("region", { name: "FY26 Money Wrapped" });
    region.focus();
    await user.keyboard("{End}");
    await user.click(screen.getByRole("button", { name: "Share my Wrapped" }));

    expect(writeText).toHaveBeenCalledWith(
      "My FY26 Money Wrapped: FY26 — $42,240 tracked — https://invest.com.au/wrapped",
    );
    expect(screen.getByRole("status")).toHaveTextContent("Copied to clipboard");
  });

  it("announces card changes politely for screen readers", async () => {
    const user = userEvent.setup();
    renderDeck();
    await user.click(screen.getByRole("button", { name: "Next card" }));
    const liveRegion = document.querySelector('[aria-live="polite"]');
    expect(liveRegion?.textContent).toContain("Card 2 of 3");
    expect(liveRegion?.textContent).toContain("$42,240");
  });
});
