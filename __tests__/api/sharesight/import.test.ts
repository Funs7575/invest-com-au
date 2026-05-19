import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn(async () => false),
}));

const { mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockGetUser: vi.fn<() => Promise<{ data: { user: { id: string } | null } }>>(),
  mockFrom: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

const ORIGINAL_FETCH = globalThis.fetch;

import { POST } from "@/app/api/account/sharesight/import/route";

function makeReq() {
  return new NextRequest("http://localhost/api/account/sharesight/import", { method: "POST" });
}

function mockJsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status < 400,
    status,
    text: async () => JSON.stringify(body),
    json: async () => body,
  } as unknown as Response;
}

describe("POST /api/account/sharesight/import", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("SHARESIGHT_CLIENT_ID", "client");
    vi.stubEnv("SHARESIGHT_CLIENT_SECRET", "secret");
    vi.stubEnv("SHARESIGHT_OAUTH_STATE_SECRET", "state-secret");
    globalThis.fetch = vi.fn();
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    globalThis.fetch = ORIGINAL_FETCH;
  });

  it("401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeReq());
    expect(res.status).toBe(401);
  });

  it("503 when not configured", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    vi.unstubAllEnvs();
    vi.stubEnv("SHARESIGHT_CLIENT_ID", "");
    const res = await POST(makeReq());
    expect(res.status).toBe(503);
  });

  it("404 when the user has no connection row", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockFrom.mockImplementation(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: null, error: null })),
        })),
      })),
    }));
    const res = await POST(makeReq());
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("not_connected");
  });

  it("happy path: fetches portfolios+holdings and inserts new rows", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });

    const nowS = Math.floor(Date.now() / 1000);
    const connRow = {
      access_token: "tok",
      refresh_token: "r",
      expires_at_s: nowS + 3600, // not stale → no refresh call
      api_base_url: "https://api.sharesight.com.au",
    };

    const insertSpy = vi.fn(
      async (_payload: Array<Record<string, unknown>>) => ({ error: null, count: 1 }),
    );
    const updateSpy = vi.fn(() => ({
      eq: vi.fn(async () => ({ error: null })),
    }));

    mockFrom.mockImplementation((table: string) => {
      if (table === "sharesight_connections") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: connRow, error: null })),
            })),
          })),
          update: updateSpy,
        };
      }
      if (table === "investor_holdings") {
        return {
          select: vi.fn(async () => ({ data: [], error: null })),
          insert: insertSpy,
        };
      }
      throw new Error(`unexpected from(${table})`);
    });

    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce(
        mockJsonResponse({ portfolios: [{ id: 1, name: "Main" }] }),
      )
      .mockResolvedValueOnce(
        mockJsonResponse({
          holdings: [
            {
              id: 9,
              instrument_code: "BHP",
              market_code: "ASX",
              quantity: 100,
              cost_basis: 45,
              first_purchase_date: "2025-01-01",
            },
          ],
        }),
      );

    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.inserted).toBe(1);
    expect(insertSpy).toHaveBeenCalledTimes(1);
    const insertPayload = insertSpy.mock.calls[0]![0];
    expect(insertPayload[0]).toMatchObject({
      auth_user_id: "u1",
      ticker: "BHP",
      exchange: "ASX",
      shares: 100,
      cost_basis_per_share_cents: 4500,
      broker_slug: "sharesight",
    });
  });

  it("returns 401 refresh_failed when token refresh throws", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });

    const nowS = Math.floor(Date.now() / 1000);
    const expiredConn = {
      access_token: "tok",
      refresh_token: "r",
      expires_at_s: nowS - 60, // stale → triggers refresh
      api_base_url: "https://api.sharesight.com.au",
    };

    mockFrom.mockImplementation(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn(async () => ({ data: expiredConn, error: null })),
        })),
      })),
    }));

    vi.mocked(globalThis.fetch).mockResolvedValueOnce(mockJsonResponse({}, 400));

    const res = await POST(makeReq());
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe("refresh_failed");
  });
});
