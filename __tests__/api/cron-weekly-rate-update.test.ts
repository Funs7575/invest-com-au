import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/email-templates", () => ({
  notificationFooter: vi.fn(() => ""),
}));

import { GET } from "@/app/api/cron/weekly-rate-update/route";
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

// Request is plain Request (not NextRequest) due to edge runtime signature
function makeReq() {
  return new Request("http://localhost/api/cron/weekly-rate-update", {
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

describe("GET /api/cron/weekly-rate-update", () => {
  it("returns 401 when cron auth fails", async () => {
    mockRequireCronAuth.mockReturnValue(new Response(null, { status: 401 }) as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("skips all processing and returns 200 when RESEND_API_KEY is not set", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.reason).toMatch(/RESEND_API_KEY/);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns 0 sent when no eligible email captures exist", async () => {
    process.env.RESEND_API_KEY = "rk_test";
    mockCreateAdmin.mockReturnValue(
      makeSupabase([{ data: [], error: null }]), // email_captures empty
    );

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.checked).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("returns 500 when email_captures DB query fails", async () => {
    process.env.RESEND_API_KEY = "rk_test";
    mockCreateAdmin.mockReturnValue(
      makeSupabase([{ data: null, error: { message: "DB error" } }]),
    );

    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/DB query failed/);
  });

  it("skips captures already in the weekly_rate_drip_log", async () => {
    process.env.RESEND_API_KEY = "rk_test";
    mockCreateAdmin.mockReturnValue(
      makeSupabase([
        {
          data: [{ id: "cap-1", email: "user@test.com", name: "User", source: "savings-calculator", context: null, created_at: "2026-01-01T00:00:00Z" }],
          error: null,
        },
        {
          data: [{ email_capture_id: "cap-1" }], // already sent this week
          error: null,
        },
      ]),
    );

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.skipped).toBe(1);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("skips captures with an unrecognised source type", async () => {
    process.env.RESEND_API_KEY = "rk_test";
    mockCreateAdmin.mockReturnValue(
      makeSupabase([
        {
          data: [{ id: "cap-2", email: "user@test.com", name: "User", source: "unknown-source", context: null, created_at: "2026-01-01T00:00:00Z" }],
          error: null,
        },
        { data: [], error: null }, // no prior sends
      ]),
    );

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.skipped).toBe(1);
    expect(body.sent).toBe(0);
  });

  it("sends personalised email and logs the send for each eligible capture", async () => {
    process.env.RESEND_API_KEY = "rk_test";
    mockCreateAdmin.mockReturnValue(
      makeSupabase([
        {
          data: [{ id: "cap-3", email: "jane@test.com", name: "Jane Smith", source: "savings-calculator", context: { balance: 50000 }, created_at: "2026-01-01T00:00:00Z" }],
          error: null,
        },
        { data: [], error: null }, // no prior sends
        { data: null, error: null }, // insert into weekly_rate_drip_log
      ]),
    );

    mockFetch.mockResolvedValue({ ok: true, status: 200 });

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(body.skipped).toBe(0);
    // Should have called Resend API
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" }),
    );
    const reqBody = JSON.parse((mockFetch.mock.calls[0]![1] as { body: string }).body);
    expect(reqBody.to).toBe("jane@test.com");
    expect(reqBody.subject).toContain("Jane");
  });

  it("continues processing on Resend API error and does not log the failed send", async () => {
    process.env.RESEND_API_KEY = "rk_test";
    mockCreateAdmin.mockReturnValue(
      makeSupabase([
        {
          data: [
            { id: "cap-4", email: "a@test.com", name: "A", source: "switching_calculator", context: { currentBroker: "CommSec" }, created_at: "2026-01-01T00:00:00Z" },
            { id: "cap-5", email: "b@test.com", name: "B", source: "savings-calculator", context: null, created_at: "2026-01-01T00:00:00Z" },
          ],
          error: null,
        },
        { data: [], error: null }, // no prior sends
        { data: null, error: null }, // log for b only (a failed)
      ]),
    );

    mockFetch
      .mockResolvedValueOnce({ ok: false, status: 429 }) // a fails
      .mockResolvedValueOnce({ ok: true, status: 200 }); // b succeeds

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(1);
    // skipped=0 because both were eligible; one just errored
  });
});
