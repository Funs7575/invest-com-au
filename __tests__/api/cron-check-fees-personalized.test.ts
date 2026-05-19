import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// FIN_NOTEBOOK #14 — coverage for the new personalized fee-change email
// branch added to app/api/cron/check-fees/route.ts.
//
// Scope: this test isolates the new branch by:
//   1. Forcing one broker through the fee-change pipeline (by stubbing
//      fetch + hash diff).
//   2. Asserting that the holdings-keyed personalised email path
//      resolves the affected user and calls sendEmail() with the
//      heuristic-derived copy.
//
// Earlier branches (admin alert, subscriber alert) are covered by the
// existing __tests__/api/cron-check-fees.test.ts; we DON'T re-test
// them here.

const { mockSendEmail, mockBuildEmailMap, mockNotifyUser, mockFrom, mockGetUserById } = vi.hoisted(() => ({
  mockSendEmail: vi.fn(),
  mockBuildEmailMap: vi.fn(),
  mockNotifyUser: vi.fn(),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mockFrom: vi.fn() as any,
  mockGetUserById: vi.fn(),
}));

vi.mock("@/lib/resend", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

vi.mock("@/lib/notifications", () => ({
  buildEmailToUserIdMap: (...args: unknown[]) => mockBuildEmailMap(...args),
  notifyUser: (...args: unknown[]) => mockNotifyUser(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: mockFrom,
    auth: {
      admin: {
        getUserById: (...args: unknown[]) => mockGetUserById(...args),
      },
    },
  }),
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: () => null,
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

vi.mock("@/lib/admin", () => ({
  getAdminEmail: () => "admin@invest.com.au",
}));

vi.mock("@/lib/email-templates", () => ({
  feeChangeAlertEmail: (rows: Array<{ broker: string }>) => `<p>fee-change-html-for-${rows.map((r) => r.broker).join("-")}</p>`,
}));

import { GET } from "@/app/api/cron/check-fees/route";

// Tiny chainable-query builder that yields `data` when awaited.
function buildableChain(data: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c: any = {};
  c.select = vi.fn(() => c);
  c.eq = vi.fn(() => c);
  c.in = vi.fn(() => c);
  c.update = vi.fn(() => c);
  c.insert = vi.fn(() => Promise.resolve({ data: null, error: null }));
  c.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve({ data, error: null }).then(resolve);
  return c;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("RESEND_API_KEY", "re_test");
  vi.stubEnv("NEXT_PUBLIC_BASE_URL", "https://test.invest.com.au");
  mockBuildEmailMap.mockResolvedValue(new Map());
  mockSendEmail.mockResolvedValue({ ok: true });
});

describe("personalized fee-change email branch", () => {
  it("queries investor_holdings for users on the changed broker and sends one email per (user × broker)", async () => {
    // Seed table data per supabase.from(...) call.
    mockFrom.mockImplementation((table: string) => {
      if (table === "brokers") {
        // Single broker that will be flagged as "changed" because the
        // hash differs. asx_fee_value is irrelevant — what matters is
        // that the route pushes onto changedBrokers.
        return buildableChain([
          {
            id: 1,
            slug: "pearler",
            name: "Pearler",
            fee_source_url: "https://example.invalid/fees",
            fee_page_hash: "old-hash",
            asx_fee: "$6.50",
            us_fee: null,
            fx_rate: null,
            inactivity_fee: null,
          },
        ]);
      }
      if (table === "fee_alert_subscriptions") {
        return buildableChain([]);
      }
      if (table === "investor_holdings") {
        // 3 holdings, all on the same broker, for the same auth_user_id.
        return buildableChain([
          { auth_user_id: "user-1", broker_slug: "pearler", ticker: "VAS", exchange: "ASX", shares: 100 },
          { auth_user_id: "user-1", broker_slug: "pearler", ticker: "VGS", exchange: "ASX", shares: 50 },
          { auth_user_id: "user-1", broker_slug: "pearler", ticker: "MSFT", exchange: "NASDAQ", shares: 5 },
        ]);
      }
      // Fallback for fee_update_queue / fee_classifier_rules / broker UPDATE etc.
      return buildableChain([]);
    });

    mockGetUserById.mockResolvedValue({
      data: { user: { id: "user-1", email: "user1@example.com" } },
      error: null,
    });

    // Force fetch to return content that hashes to a different value
    // than the stored fee_page_hash so the route classifies the broker
    // as "changed".
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async () =>
      new Response("FEE PAGE CONTENT VERSION 2", {
        status: 200,
        headers: { "content-type": "text/html" },
      }),
    ) as unknown as typeof fetch;

    try {
      const req = new NextRequest("http://localhost/api/cron/check-fees", {
        headers: { Authorization: "Bearer test" },
      });
      const res = await GET(req);
      expect(res.status).toBe(200);

      // Personalized email path must have:
      //   a) looked the user up via auth.admin.getUserById
      //   b) called sendEmail() once for the single (user × broker) group
      expect(mockGetUserById).toHaveBeenCalledWith("user-1");
      expect(mockSendEmail).toHaveBeenCalledTimes(1);
      const emailArgs = mockSendEmail.mock.calls[0]?.[0] as {
        to: string;
        subject: string;
        html: string;
      };
      expect(emailArgs.to).toBe("user1@example.com");
      expect(emailArgs.subject).toContain("Pearler");
      // 2 ASX trades/yr per ASX holding + 1 US trade per US holding
      // = (2 ASX × 4) + (1 US × 1) = 9 trades/yr in the copy.
      expect(emailArgs.html).toMatch(/9 trades/);
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  it("does nothing when zero users hold the changed broker", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "brokers") {
        return buildableChain([
          {
            id: 1,
            slug: "pearler",
            name: "Pearler",
            fee_source_url: "https://example.invalid/fees",
            fee_page_hash: "old-hash",
            asx_fee: "$6.50",
            us_fee: null,
            fx_rate: null,
            inactivity_fee: null,
          },
        ]);
      }
      if (table === "fee_alert_subscriptions") return buildableChain([]);
      if (table === "investor_holdings") return buildableChain([]);
      return buildableChain([]);
    });

    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async () =>
      new Response("DIFFERENT CONTENT", { status: 200 }),
    ) as unknown as typeof fetch;

    try {
      const req = new NextRequest("http://localhost/api/cron/check-fees", {
        headers: { Authorization: "Bearer test" },
      });
      await GET(req);
      expect(mockGetUserById).not.toHaveBeenCalled();
      expect(mockSendEmail).not.toHaveBeenCalled();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
