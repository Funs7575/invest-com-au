import { describe, it, expect, vi } from "vitest";
import { render, screen } from "./setup";

vi.mock("@/components/Icon", () => ({
  default: ({ name }: { name: string }) => (
    <span data-testid={`icon-${name}`} />
  ),
}));

import WatchlistClient from "@/app/account/watchlist/WatchlistClient";
import type { WatchlistItem } from "@/app/account/watchlist/WatchlistClient";

const SAMPLE_ITEMS: WatchlistItem[] = [
  {
    id: 1,
    item_type: "broker",
    item_slug: "stake",
    display_name: "Stake",
    added_at: "2026-01-10T00:00:00Z",
    current_rate_bps: null,
  },
  {
    id: 2,
    item_type: "etf",
    item_slug: "vgs",
    display_name: "VGS",
    added_at: "2026-01-11T00:00:00Z",
    current_rate_bps: null,
  },
];

describe("WatchlistClient", () => {
  describe("empty state", () => {
    it("shows the EmptyState heading when the watchlist is empty", () => {
      render(<WatchlistClient initialItems={[]} />);
      expect(
        screen.getByText("Your watchlist is empty"),
      ).toBeInTheDocument();
    });

    it("renders a 'Browse brokers' CTA pointing to /brokers", () => {
      render(<WatchlistClient initialItems={[]} />);
      const link = screen.getByRole("link", { name: /Browse brokers/i });
      expect(link).toHaveAttribute("href", "/brokers");
    });

    it("renders an 'Explore ETFs' secondary CTA pointing to /etfs", () => {
      render(<WatchlistClient initialItems={[]} />);
      const link = screen.getByRole("link", { name: /Explore ETFs/i });
      expect(link).toHaveAttribute("href", "/etfs");
    });

    it("is labelled as a 'No results' region for screen readers", () => {
      render(<WatchlistClient initialItems={[]} />);
      expect(
        screen.getByRole("region", { name: "No results" }),
      ).toBeInTheDocument();
    });
  });

  describe("with items", () => {
    it("renders item display names as links", () => {
      render(<WatchlistClient initialItems={SAMPLE_ITEMS} />);
      expect(
        screen.getByRole("link", { name: /Stake/i }),
      ).toBeInTheDocument();
    });

    it("groups by type with section headings", () => {
      render(<WatchlistClient initialItems={SAMPLE_ITEMS} />);
      expect(screen.getByText(/Brokers \(1\)/i)).toBeInTheDocument();
      expect(screen.getByText(/ETFs \(1\)/i)).toBeInTheDocument();
    });

    it("does not show the empty-state when items are present", () => {
      render(<WatchlistClient initialItems={SAMPLE_ITEMS} />);
      expect(
        screen.queryByText("Your watchlist is empty"),
      ).not.toBeInTheDocument();
    });
  });
});
