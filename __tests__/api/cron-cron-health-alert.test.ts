import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/resend", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/cron-groups", () => ({
  CRON_GROUPS: {
    "hourly-0": ["/api/cron/heartbeat", "/api/cron/cron-health-alert"],
    "daily-1": ["/api/cron/cleanup"],
  },
}));

import { GET } from "@/app/api/cron/cron-health-alert/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";

const mockRequireCronAuth = vi.mocked(requireCronAuth);
const mockCreateAdmin = vi.mocked(createAdminClient);
const mockSendEmail = vi.mocked(sendEmail);

function makeChain(responses: unknown[]) {
  let idx = 0;
  const chain: Record<string, unknown> = {};
  const methods = [
    "from", "select", "insert", "upsert", "update", "eq", "neq",
    "gte", "lte", "in", "order", "limit", "not",
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
  return new NextRequest("http://localhost/api/cron/cron-health-alert", {
    method: "GET",
    headers: { Authorization: "Bearer test-secret" },
  });
}

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireCronAuth.mockReturnValue(undefined as never);
  delete process.env.OPS_ALERT_EMAIL;
  delete process.env.SUPPORT_EMAIL;
});

afterEach(() => {
  delete process.env.OPS_ALERT_EMAIL;
  delete process.env.SUPPORT_EMAIL;
});

describe("GET /api/cron/cron-health-alert", () => {
  it("returns 401 when cron auth fails", async () => {
    mockRequireCronAuth.mockReturnValue(new Response(null, { status: 401 }) as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns ok=true with 0 alerts when all crons are healthy", async () => {
    const now = Date.now();
    // recent successful runs for all 3 endpoints in CRON_GROUPS mock
    mockCreateAdmin.mockReturnValue(
      makeSupabase([
        {
          data: [
            { name: "/api/cron/heartbeat", started_at: new Date(now - 1000).toISOString(), status: "success" },
            { name: "/api/cron/cron-health-alert", started_at: new Date(now - 1000).toISOString(), status: "success" },
            { name: "/api/cron/cleanup", started_at: new Date(now - 1000).toISOString(), status: "success" },
          ],
          error: null,
        },
        { data: [], error: null }, // dedup query (not reached since no problems)
      ]),
    );

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.alerts).toBe(0);
  });

  it("suppresses alerts that were already sent within dedup window", async () => {
    mockCreateAdmin.mockReturnValue(
      makeSupabase([
        {
          data: [], // no recent runs → all are "never-run"
          error: null,
        },
        {
          // all endpoints were alerted recently → dedup skips them
          data: [
            { endpoint: "/api/cron/heartbeat" },
            { endpoint: "/api/cron/cron-health-alert" },
            { endpoint: "/api/cron/cleanup" },
          ],
          error: null,
        },
      ]),
    );

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alerts).toBe(0);
    expect(body.skipped_dedup).toBeGreaterThan(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("sends email and inserts alerts when problems found and OPS_ALERT_EMAIL set", async () => {
    process.env.OPS_ALERT_EMAIL = "ops@invest.com.au";
    mockSendEmail.mockResolvedValue(undefined as never);

    mockCreateAdmin.mockReturnValue(
      makeSupabase([
        { data: [], error: null }, // no recent runs → never-run
        { data: [], error: null }, // no dedup hits → all alert
        { data: null, error: null }, // insert into cron_health_alerts
      ]),
    );

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.alerts).toBeGreaterThan(0);
    expect(mockSendEmail).toHaveBeenCalledOnce();
    const call = mockSendEmail.mock.calls[0]![0];
    expect(call.to).toBe("ops@invest.com.au");
    expect(call.subject).toMatch(/cron health/i);
  });

  it("falls back to SUPPORT_EMAIL when OPS_ALERT_EMAIL is not set", async () => {
    process.env.SUPPORT_EMAIL = "support@invest.com.au";
    mockSendEmail.mockResolvedValue(undefined as never);

    mockCreateAdmin.mockReturnValue(
      makeSupabase([
        { data: [], error: null },
        { data: [], error: null },
        { data: null, error: null },
      ]),
    );

    await GET(makeReq());
    expect(mockSendEmail).toHaveBeenCalledOnce();
    expect(mockSendEmail.mock.calls[0]![0].to).toBe("support@invest.com.au");
  });

  it("skips email silently when no alert email env vars are set", async () => {
    mockCreateAdmin.mockReturnValue(
      makeSupabase([
        { data: [], error: null },
        { data: [], error: null },
        { data: null, error: null },
      ]),
    );

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    expect(mockSendEmail).not.toHaveBeenCalled();
    const body = await res.json();
    expect(body.alerts).toBeGreaterThan(0);
  });

  it("marks stale endpoint as problem when last success exceeds cadence window", async () => {
    process.env.OPS_ALERT_EMAIL = "ops@invest.com.au";
    mockSendEmail.mockResolvedValue(undefined as never);
    const staleMs = 4 * 60 * 60 * 1000; // hourly cadence = stale after 3h; 4h → stale

    mockCreateAdmin.mockReturnValue(
      makeSupabase([
        {
          data: [
            {
              name: "/api/cron/heartbeat",
              started_at: new Date(Date.now() - staleMs).toISOString(),
              status: "success",
            },
          ],
          error: null,
        },
        { data: [], error: null }, // no dedup
        { data: null, error: null }, // insert
      ]),
    );

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.alerts).toBeGreaterThan(0);
  });
});
