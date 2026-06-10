import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

// Per-table results, settable per test.
const { tableData } = vi.hoisted(() => ({
  tableData: new Map<string, unknown>(),
}));

function makeBuilder(table: string) {
  const builder: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "not", "or",
    "order", "limit", "range", "single", "maybeSingle", "filter",
  ]) {
    builder[m] = vi.fn(() => builder);
  }
  builder.then = (cb: (v: unknown) => unknown) =>
    Promise.resolve(cb(tableData.get(table) ?? { data: [], error: null }));
  return builder;
}

const mockFrom = vi.fn((table: string) => makeBuilder(table));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/autopilot", () => ({
  checkAutopilotGate: vi.fn().mockResolvedValue(null),
}));

// Pass-through: the run-log wrapper is covered by its own unit tests.
vi.mock("@/lib/cron-run-log", () => ({
  withCronRunLog: vi.fn(
    async (_name: string, handler: () => Promise<{ response: unknown }>) =>
      (await handler()).response,
  ),
}));

import { GET, runtime, maxDuration } from "@/app/api/cron/premium-digest/route";

const SECRET = "test-cron-secret-1234567890";
function req(headers: Record<string, string> = {}): NextRequest {
  return new Request("http://localhost/api/cron/premium-digest", { headers }) as unknown as NextRequest;
}
const authed = () => req({ authorization: `Bearer ${SECRET}` });

const REPORT = {
  slug: "etf-fee-war-2026",
  title: "The ETF fee war: who actually wins",
  kicker: "Funds",
  summary: "Fee compression across the majors, mapped.",
  reading_time_minutes: 12,
};

function seedHappyPath() {
  tableData.set("pro_research_reports", { data: [REPORT], error: null });
  tableData.set("subscriptions", { data: [{ user_id: "u1" }, { user_id: "u2" }], error: null });
  tableData.set("profiles", {
    data: [
      { id: "u1", email: "pro1@example.com" },
      { id: "u2", email: "pro2@example.com" },
    ],
    error: null,
  });
  tableData.set("investor_profiles", { data: [], error: null });
  tableData.set("newsletter_sends", { data: [], error: null });
}

describe("GET /api/cron/premium-digest", () => {
  const realFetch = global.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
    tableData.clear();
    process.env.CRON_SECRET = SECRET;
    process.env.RESEND_API_KEY = "test-resend-key";
    global.fetch = vi.fn(async () => new Response("{}", { status: 200 })) as unknown as typeof fetch;
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.RESEND_API_KEY;
    global.fetch = realFetch;
  });

  it("exports config", () => {
    expect(runtime).toBe("nodejs");
    expect(maxDuration).toBe(120);
  });

  it("returns 401 on wrong bearer", async () => {
    const res = await GET(req({ authorization: "Bearer wrong" }));
    expect(res.status).toBe(401);
  });

  it("returns 500 when RESEND_API_KEY is not configured", async () => {
    delete process.env.RESEND_API_KEY;
    const res = await GET(authed());
    expect(res.status).toBe(500);
  });

  it("skips the send entirely when no research published this week", async () => {
    tableData.set("pro_research_reports", { data: [], error: null });
    const res = await GET(authed());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(body.message).toMatch(/no new research/i);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("returns sent:0 when there are no active Pro subscribers", async () => {
    seedHappyPath();
    tableData.set("subscriptions", { data: [], error: null });
    const res = await GET(authed());
    const body = await res.json();
    expect(body.sent).toBe(0);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("sends the digest to active Pro subscribers", async () => {
    seedHappyPath();
    const res = await GET(authed());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.sent).toBe(2);
    expect(body.reports).toBe(1);
    expect(global.fetch).toHaveBeenCalledTimes(2);
    const firstCall = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(firstCall[0]).toBe("https://api.resend.com/emails");
    const payload = JSON.parse(firstCall[1].body as string);
    expect(payload.subject).toContain("Pro research");
    expect(payload.html).toContain("/pro/research/etf-fee-war-2026");
    // Summary only — the gated body never goes out by email.
    expect(payload.html).not.toContain("body_html");
  });

  it("respects a research_digest opt-out", async () => {
    seedHappyPath();
    tableData.set("investor_profiles", {
      data: [{ auth_user_id: "u2", meta: { research_digest: false } }],
      error: null,
    });
    const res = await GET(authed());
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    const call = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(call[1].body as string).to).toEqual(["pro1@example.com"]);
  });

  it("dedupes against emails already sent this edition", async () => {
    seedHappyPath();
    tableData.set("newsletter_sends", { data: [{ email: "pro1@example.com" }], error: null });
    const res = await GET(authed());
    const body = await res.json();
    expect(body.sent).toBe(1);
    expect(body.skippedAlreadySent).toBe(1);
  });

  it("namespaces the edition key away from the free newsletter", async () => {
    seedHappyPath();
    const res = await GET(authed());
    const body = await res.json();
    expect(body.editionKey).toMatch(/^premium-\d{4}-\d{2}-\d{2}$/);
  });
});
