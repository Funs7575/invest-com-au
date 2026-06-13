import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

function makeBuilder(result: unknown = { data: [], error: null }) {
  const builder: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "not", "or", "ilike",
    "order", "limit", "range", "single", "maybeSingle", "filter",
  ]) {
    builder[m] = vi.fn(() => builder);
  }
  builder.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return builder;
}

const mockFrom = vi.fn(() => makeBuilder());
const mockListUsers = vi.fn(async () => ({ data: { users: [] } }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
    auth: { admin: { listUsers: mockListUsers } },
  })),
}));

vi.mock("@/lib/resend", () => ({
  sendEmail: vi.fn(async () => ({ ok: true, id: "e1" })),
}));

vi.mock("@/lib/html-escape", () => ({
  escapeHtml: vi.fn((s: string) => s),
}));

vi.mock("@/lib/saved-searches", () => ({
  computeMatchSignature: vi.fn(() => "sig-abc"),
}));

import { GET, runtime, maxDuration } from "@/app/api/cron/saved-search-alerts/route";

const SECRET = "test-cron-secret-1234567890";
function req(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/saved-search-alerts", { headers }) as unknown as NextRequest;
}

describe("GET /api/cron/saved-search-alerts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
    // Default: empty saved_searches result
    mockFrom.mockImplementation(() => makeBuilder({ data: [], error: null }));
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("exports config", () => {
    expect(runtime).toBe("nodejs");
    expect(maxDuration).toBe(60);
  });

  it("returns 500 when CRON_SECRET is unset", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(500);
  });

  it("returns 401 on wrong bearer", async () => {
    const res = await GET(req({ authorization: "Bearer wrong" }));
    expect(res.status).toBe(401);
  });

  it("returns 200 with processed:0 when no saved searches due", async () => {
    const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.processed).toBe(0);
    expect(body.sent).toBe(0);
  });

  it("returns 500 when saved_searches query errors", async () => {
    mockFrom.mockImplementationOnce(() =>
      makeBuilder({ data: null, error: { message: "DB error" } }),
    );
    const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(500);
  });

  describe("invest kind", () => {
    const investRow = {
      id: 1,
      user_id: "u1",
      kind: "invest",
      label: "NSW farmland",
      filters: { category: "farmland", state: "NSW" },
      email_frequency: "daily",
      last_alerted_at: null,
      last_match_signature: null,
    };
    const listings = [
      {
        id: 11,
        slug: "riverina-aggregation-412ha",
        title: "Riverina Aggregation",
        description: "412ha irrigated",
        vertical: "farmland",
        sub_category: null,
        listing_kind: null,
        location_state: "NSW",
        asking_price_cents: 420_000_000,
        firb_eligible: true,
        key_metrics: {},
      },
      {
        id: 12,
        slug: "uranium-play",
        title: "Uranium Play",
        description: "",
        vertical: "mining",
        sub_category: null,
        listing_kind: null,
        location_state: "NSW",
        asking_price_cents: null,
        firb_eligible: false,
        key_metrics: {},
      },
    ];

    function tableAwareFrom(rows: unknown[], listingRows: unknown[]) {
      mockFrom.mockImplementation(((table: string) => {
        if (table === "saved_searches") return makeBuilder({ data: rows, error: null });
        if (table === "investment_listings") return makeBuilder({ data: listingRows, error: null });
        return makeBuilder();
      }) as never);
    }

    it("emails the matching listings through the invest matcher", async () => {
      tableAwareFrom([investRow], listings);
      mockListUsers.mockResolvedValueOnce({
        data: { users: [{ id: "u1", email: "owner@example.com" }] },
      } as never);

      const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
      const body = await res.json();
      expect(body.errors).toBe(0);
      expect(body.sent).toBe(1);

      const { sendEmail } = await import("@/lib/resend");
      const call = vi.mocked(sendEmail).mock.calls[0]![0];
      expect(call.to).toBe("owner@example.com");
      // The farmland match is linked by canonical lot URL; the mining row
      // (wrong category) must not appear.
      expect(call.html).toContain("/invest/farmland/listings/riverina-aggregation-412ha");
      expect(call.html).not.toContain("Uranium Play");
      expect(call.html).toContain("listing search");
    });

    it("stamps without emailing when nothing matches", async () => {
      tableAwareFrom(
        [{ ...investRow, filters: { category: "water-rights" } }],
        listings,
      );
      const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
      const body = await res.json();
      expect(body.sent).toBe(0);
      expect(body.skipped).toBe(1);
      const { sendEmail } = await import("@/lib/resend");
      expect(vi.mocked(sendEmail)).not.toHaveBeenCalled();
    });
  });

  it("gates weekly rows to a 6.5-day gap without re-matching", async () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400 * 1000).toISOString();
    mockFrom.mockImplementation(((table: string) => {
      if (table === "saved_searches") {
        return makeBuilder({
          data: [
            {
              id: 2,
              user_id: "u1",
              kind: "invest",
              label: "Weekly",
              filters: {},
              email_frequency: "weekly",
              last_alerted_at: twoDaysAgo,
              last_match_signature: null,
            },
          ],
          error: null,
        });
      }
      return makeBuilder();
    }) as never);

    const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
    const body = await res.json();
    expect(body.skipped).toBe(1);
    expect(body.sent).toBe(0);
    // The 6.5-day gate short-circuits before any match query runs.
    expect(mockFrom).not.toHaveBeenCalledWith("investment_listings");
  });
});
