/**
 * @vitest-environment jsdom
 *
 * Smoke tests for /broker/[slug]/changelog/page.tsx (CMP-TR-02).
 * Verifies the page renders changelog entries and empty state correctly.
 */
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "../components/setup";

const { mockFrom, mockGetBrokerBySlug } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetBrokerBySlug: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({ from: mockFrom }),
}));

vi.mock("@/lib/request-cache", () => ({
  getBrokerBySlug: mockGetBrokerBySlug,
}));

vi.mock("@/lib/seo", () => ({
  absoluteUrl: (p: string) => `https://invest.com.au${p}`,
  breadcrumbJsonLd: () => ({}),
  CURRENT_YEAR: "2026",
}));

const BROKER = {
  id: 1,
  slug: "stake",
  name: "Stake",
  status: "active",
  rating: 4.2,
};

function makeDatabaseChain(rows: unknown[]) {
  const limit = vi.fn().mockResolvedValue({ data: rows });
  const order = vi.fn().mockReturnValue({ limit });
  const eq = vi.fn().mockReturnValue({ order });
  const select = vi.fn().mockReturnValue({ eq });
  return { select };
}

import BrokerChangelogPage from "@/app/broker/[slug]/changelog/page";

describe("BrokerChangelogPage", () => {
  it("renders page heading with broker name", async () => {
    mockGetBrokerBySlug.mockResolvedValue(BROKER);
    mockFrom.mockImplementation(() => makeDatabaseChain([]));

    render(await BrokerChangelogPage({ params: Promise.resolve({ slug: "stake" }) }));
    expect(screen.getByRole("heading", { level: 1 })).toBeDefined();
    expect(screen.getByText(/Stake — Fee & Data Changelog/)).toBeDefined();
  });

  it("renders empty state when no changes recorded", async () => {
    mockGetBrokerBySlug.mockResolvedValue(BROKER);
    mockFrom.mockImplementation(() => makeDatabaseChain([]));

    render(await BrokerChangelogPage({ params: Promise.resolve({ slug: "stake" }) }));
    expect(screen.getByText(/No recorded changes yet/)).toBeDefined();
  });

  it("renders changelog entries with formatted values", async () => {
    mockGetBrokerBySlug.mockResolvedValue(BROKER);
    mockFrom.mockImplementation(() =>
      makeDatabaseChain([
        {
          id: 1,
          field_name: "asx_fee_value",
          old_value: "9.5",
          new_value: "3",
          change_type: "fee_update",
          changed_at: "2026-03-15T00:00:00Z",
          source: "PDS update",
        },
        {
          id: 2,
          field_name: "rating",
          old_value: "4.0",
          new_value: "4.2",
          change_type: "rating_update",
          changed_at: "2026-04-01T00:00:00Z",
          source: null,
        },
      ])
    );

    render(await BrokerChangelogPage({ params: Promise.resolve({ slug: "stake" }) }));
    expect(screen.getByText("ASX brokerage fee")).toBeDefined();
    expect(screen.getByText("Rating update")).toBeDefined();
    expect(screen.getByText("$9.50")).toBeDefined();
    expect(screen.getByText("$3")).toBeDefined();
    expect(screen.getByText(/PDS update/)).toBeDefined();
  });

  it("renders back link to broker review page", async () => {
    mockGetBrokerBySlug.mockResolvedValue(BROKER);
    mockFrom.mockImplementation(() => makeDatabaseChain([]));

    render(await BrokerChangelogPage({ params: Promise.resolve({ slug: "stake" }) }));
    const backLink = screen.getByRole("link", { name: /Back to Stake review/ });
    expect(backLink).toBeDefined();
  });
});
