import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/email-templates", () => ({
  weeklyDigestEmail: vi.fn(() => "<html>weekly</html>"),
  notificationFooter: vi.fn(() => ""),
}));

import { GET } from "@/app/api/cron/weekly-newsletter/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";

const mockRequireCronAuth = vi.mocked(requireCronAuth);
const mockCreateAdmin = vi.mocked(createAdminClient);
const mockFetch = vi.fn();

function makeChain(responses: unknown[]) {
  let idx = 0;
  const chain: Record<string, unknown> = {};
  const methods = [
    "from", "select", "insert", "upsert", "update", "delete",
    "eq", "neq", "gte", "lte", "in", "order", "limit", "not",
  ];
  for (const m of methods) chain[m] = vi.fn(() => chain);
  chain.then = vi.fn((resolve: (v: unknown) => void) =>
    Promise.resolve(resolve(responses[idx++] ?? { data: [], error: null })),
  );
  return chain;
}

function makeSupabase(responses: unknown[]) {
  const chain = makeChain(responses);
  return { from: vi.fn(() => chain) } as never;
}

function makeReq() {
  return new NextRequest("http://localhost/api/cron/weekly-newsletter", {
    method: "GET",
    headers: { Authorization: "Bearer test-secret" },
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireCronAuth.mockReturnValue(undefined as never);
  vi.stubGlobal("fetch", mockFetch);
  delete process.env.RESEND_API_KEY;
});

afterEach(() => {
  vi.unstubAllGlobals();
  delete process.env.RESEND_API_KEY;
});

describe("GET /api/cron/weekly-newsletter", () => {
  it("returns 401 when cron auth fails", async () => {
    mockRequireCronAuth.mockReturnValue(new Response(null, { status: 401 }) as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 500 when RESEND_API_KEY is not configured", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/RESEND_API_KEY/);
  });

  it("returns 0 sent when no subscribers are opted in", async () => {
    process.env.RESEND_API_KEY = "rk_test";
    mockCreateAdmin.mockReturnValue(
      makeSupabase([
        { data: [], error: null }, // fee_changes (empty → broker names query is skipped)
        { data: [], error: null }, // new articles
        { data: [], error: null }, // active deals
        { data: null, error: null }, // newsletter_editions upsert
        { data: [], error: null }, // email_captures (no subscribers)
      ]),
    );

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("skips subscribers who already received the current edition", async () => {
    process.env.RESEND_API_KEY = "rk_test";

    mockCreateAdmin.mockReturnValue(
      makeSupabase([
        { data: [], error: null }, // fee_changes (empty → broker names query is skipped)
        { data: [], error: null }, // articles
        { data: [], error: null }, // deals
        { data: null, error: null }, // editions upsert
        { data: [{ email: "a@test.com" }, { email: "b@test.com" }], error: null }, // subscribers
        {
          data: [{ email: "a@test.com" }, { email: "b@test.com" }],
          error: null,
        }, // newsletter_sends (all already sent)
      ]),
    );

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("sends to unsent subscribers and records sends", async () => {
    process.env.RESEND_API_KEY = "rk_test";

    mockCreateAdmin.mockReturnValue(
      makeSupabase([
        { data: [{ broker_slug: "commsec", field_name: "brokerage_fee", old_value: "10", new_value: "9", changed_at: new Date().toISOString() }], error: null },
        { data: [{ slug: "commsec", name: "CommSec" }], error: null },
        { data: [{ title: "New Article", slug: "new-article", category: "investing", read_time: 5 }], error: null },
        { data: [{ name: "Selfwealth", slug: "selfwealth", deal_text: "Get $50", deal_expiry: null }], error: null },
        { data: null, error: null }, // editions upsert
        { data: [{ email: "user@test.com" }], error: null }, // subscribers
        { data: [], error: null }, // no prior sends
        // per-email: insert into newsletter_sends + update email_captures
        { data: null, error: null },
        { data: null, error: null },
        // update subscribers_sent on edition
        { data: null, error: null },
      ]),
    );

    mockFetch.mockResolvedValue({ ok: true, status: 200 });

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(body.editionDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("counts Resend errors and continues processing remaining subscribers", async () => {
    process.env.RESEND_API_KEY = "rk_test";

    mockCreateAdmin.mockReturnValue(
      makeSupabase([
        { data: [], error: null }, // fee_changes (empty → broker names query is skipped)
        { data: [], error: null }, // articles
        { data: [], error: null }, // deals
        { data: null, error: null }, // editions upsert
        { data: [{ email: "a@test.com" }, { email: "b@test.com" }], error: null }, // subscribers
        { data: [], error: null }, // no prior sends
        { data: null, error: null }, // newsletter_sends insert (b succeeds)
        { data: null, error: null }, // email_captures update (b succeeds)
        { data: null, error: null }, // newsletter_editions update subscribers_sent
      ]),
    );

    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 429 })
      .mockResolvedValueOnce({ ok: true, status: 200 });

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(body.errors).toBe(1);
  });
});
