import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

function makeBuilder(result: unknown = { data: [], error: null }) {
  const builder: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "not", "or",
    "order", "limit", "range", "single", "maybeSingle", "filter",
  ]) {
    builder[m] = vi.fn(() => builder);
  }
  builder.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return builder;
}

const mockFrom = vi.fn(() => makeBuilder());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { GET, maxDuration } from "@/app/api/cron/verify-review-clients/route";

const SECRET = "test-cron-secret-1234567890";
function req(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/verify-review-clients", { headers }) as unknown as NextRequest;
}

describe("GET /api/cron/verify-review-clients", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
    // Default: no unverified reviews
    mockFrom.mockImplementation(() => makeBuilder({ data: [], error: null }));
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it("exports maxDuration", () => {
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

  it("returns 200 on success with zero verified when no reviews", async () => {
    const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.broker_verified).toBe(0);
    expect(body.advisor_verified).toBe(0);
    expect(body.total_verified).toBe(0);
  });

  it("verifies a broker review whose email matches a platform lead for that broker_id", async () => {
    // Route call order: 1) user_reviews fetch, 2) leads fetch,
    // 3) user_reviews update, 4) professional_reviews fetch (empty).
    const updateBuilder = makeBuilder({ error: null });
    const leadsBuilder = makeBuilder({
      data: [{ broker_id: 7, user_email: "client@example.com" }],
      error: null,
    });

    let call = 0;
    mockFrom.mockImplementation((table?: string) => {
      call += 1;
      if (call === 1) {
        // unverified broker reviews — review.broker_id 7 matches the lead above
        return makeBuilder({
          data: [{ id: 1, email: "client@example.com", broker_slug: "commsec", broker_id: 7 }],
          error: null,
        });
      }
      if (table === "leads") return leadsBuilder;
      if (call === 3) return updateBuilder; // the user_reviews update
      return makeBuilder({ data: [], error: null }); // advisor block: no reviews
    });

    const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.broker_verified).toBe(1);
    // Matched against the leads table, scoped to platform lead_type.
    expect(mockFrom).toHaveBeenCalledWith("leads");
    expect(leadsBuilder.eq).toHaveBeenCalledWith("lead_type", "platform");
    // And the verification was written with the enquiry-match source.
    expect(updateBuilder.update).toHaveBeenCalledWith(
      expect.objectContaining({ is_verified_client: true, verified_via: "enquiry_match" }),
    );
  });

  it("does not verify a broker review when no platform lead matches the broker_id", async () => {
    let call = 0;
    mockFrom.mockImplementation((table?: string) => {
      call += 1;
      if (call === 1) {
        // review for broker_id 7 …
        return makeBuilder({
          data: [{ id: 1, email: "client@example.com", broker_slug: "commsec", broker_id: 7 }],
          error: null,
        });
      }
      if (table === "leads") {
        // … but the only platform lead is for a different broker_id
        return makeBuilder({
          data: [{ broker_id: 99, user_email: "client@example.com" }],
          error: null,
        });
      }
      return makeBuilder({ data: [], error: null });
    });

    const res = await GET(req({ authorization: `Bearer ${SECRET}` }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.broker_verified).toBe(0);
  });
});
