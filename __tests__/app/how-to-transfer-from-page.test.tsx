/**
 * @vitest-environment jsdom
 *
 * Regression tests for /how-to/transfer-from/[broker_slug]/page.tsx.
 *
 * The page previously returned HTTP 500 for every slug when a Supabase
 * runtime error bubbled out of the unwrapped fetchers. The fetchers now
 * catch (and log) failures and return null, so the existing
 * `if (!guide || !broker) notFound()` path degrades to a 404 instead of
 * throwing an uncaught exception. These tests lock that behaviour in:
 * a fetch error must surface as notFound(), never a render throw.
 */
import * as React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

const { mockFrom, mockNotFound, mockLogError, mockLogWarn } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockNotFound: vi.fn(() => {
    // Mirror Next's notFound(): throw a sentinel so control flow stops,
    // but a recognisable one we can distinguish from a real crash.
    throw new Error("NEXT_NOT_FOUND");
  }),
  mockLogError: vi.fn(),
  mockLogWarn: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({ from: mockFrom }),
}));

vi.mock("next/navigation", () => ({
  notFound: mockNotFound,
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
    [key: string]: unknown;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/Icon", () => ({
  default: () => null,
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: mockLogWarn,
    error: mockLogError,
  }),
}));

vi.mock("@/lib/seo", () => ({
  SITE_URL: "https://invest.com.au",
  CURRENT_YEAR: "2026",
  breadcrumbJsonLd: () => ({}),
}));

const GUIDE = {
  id: 1,
  broker_slug: "commsec",
  transfer_type: "chess",
  steps: [{ title: "Open new account", body: "Sign up elsewhere." }],
  chess_transfer_fee: 0,
  supports_in_specie: true,
  in_specie_notes: "Submit a broker-to-broker transfer form.",
  special_requirements: null,
  estimated_timeline_days: 5,
  exit_fees: null,
  helpful_links: null,
};

const BROKER = {
  slug: "commsec",
  name: "CommSec",
  logo_url: null,
  rating: 4.1,
  tagline: "Australia's biggest broker",
  asx_fee: "$10",
  chess_sponsored: true,
  smsf_support: true,
};

// Resolved (.maybeSingle) chain for guide/broker fetches.
function singleChain(result: { data: unknown; error: unknown }) {
  const maybeSingle = vi.fn().mockResolvedValue(result);
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  return { select };
}

import TransferFromPage from "@/app/how-to/transfer-from/[broker_slug]/page";

describe("TransferFromPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders the guide for a valid broker", async () => {
    // The brokers table is queried twice with different chains: a single
    // fetch (fetchBroker → .eq().maybeSingle()) and a list fetch
    // (fetchTopBrokers → .eq().eq().neq().order().limit()). Return a chain
    // node that supports both continuations.
    function brokerEqNode() {
      return {
        // fetchBroker terminal
        maybeSingle: vi.fn().mockResolvedValue({ data: BROKER, error: null }),
        // fetchTopBrokers continuation
        eq: vi.fn().mockReturnValue({
          neq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            }),
          }),
        }),
      };
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === "broker_transfer_guides") {
        return singleChain({ data: GUIDE, error: null });
      }
      return {
        select: vi.fn().mockReturnValue({ eq: vi.fn(brokerEqNode) }),
      };
    });

    render(
      await TransferFromPage({
        params: Promise.resolve({ broker_slug: "commsec" }),
      })
    );

    expect(mockNotFound).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1 })).toBeDefined();
    expect(screen.getByText(/How to transfer from CommSec/)).toBeDefined();
  });

  it("calls notFound() (not a throw) when the guide fetch errors", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "broker_transfer_guides") {
        return singleChain({
          data: null,
          error: { message: "supabase: connection reset" },
        });
      }
      return singleChain({ data: BROKER, error: null });
    });

    await expect(
      TransferFromPage({ params: Promise.resolve({ broker_slug: "commsec" }) })
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(mockNotFound).toHaveBeenCalledTimes(1);
    // Failure must be observable, not swallowed silently.
    expect(mockLogWarn).toHaveBeenCalled();
  });

  it("calls notFound() when a fetcher throws at runtime", async () => {
    mockFrom.mockImplementation(() => {
      throw new Error("supabase client exploded");
    });

    await expect(
      TransferFromPage({ params: Promise.resolve({ broker_slug: "stake" }) })
    ).rejects.toThrow("NEXT_NOT_FOUND");

    expect(mockNotFound).toHaveBeenCalledTimes(1);
    expect(mockLogError).toHaveBeenCalled();
  });
});
