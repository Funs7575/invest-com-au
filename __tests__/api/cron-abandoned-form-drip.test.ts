import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import type { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@/lib/cron-run-log", () => ({
  wrapCronHandler: (_name: string, h: unknown) => h,
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: vi.fn(() => null),
}));

const mockIsFeatureDisabled = vi.fn(async () => false);
vi.mock("@/lib/admin/classifier-config", () => ({
  isFeatureDisabled: (...args: unknown[]) => mockIsFeatureDisabled(...args),
}));

vi.mock("@/lib/url", () => ({ getSiteUrl: () => "https://invest.com.au" }));
vi.mock("@/lib/html-escape", () => ({ escapeHtml: (s: unknown) => String(s ?? "") }));

vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response("ok", { status: 200 }))));

interface DbResult {
  data?: unknown;
  error?: { message: string } | null;
}

const dbQueue: DbResult[] = [];
let dbIdx = 0;

function makeChain(res: DbResult) {
  const chain: Record<string, unknown> = {};
  for (const m of [
    "select", "update", "insert",
    "eq", "neq", "lt", "lte", "gte", "is", "in", "not", "or", "order", "limit",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  const r = { data: res.data ?? null, error: res.error ?? null };
  chain.then = (resolve: (v: typeof r) => unknown) => Promise.resolve(resolve(r));
  chain.catch = () => chain;
  return chain;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => makeChain(dbQueue[dbIdx++] ?? { error: null })),
  })),
}));

import { GET, runtime, maxDuration } from "@/app/api/cron/abandoned-form-drip/route";
import { requireCronAuth } from "@/lib/cron-auth";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/abandoned-form-drip") as unknown as NextRequest;
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/cron/abandoned-form-drip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbIdx = 0;
    dbQueue.length = 0;
    mockIsFeatureDisabled.mockResolvedValue(false);
    vi.mocked(fetch).mockResolvedValue(new Response("ok", { status: 200 }));
    delete process.env.RESEND_API_KEY;
  });

  afterAll(() => { vi.restoreAllMocks(); });

  it("exports nodejs runtime and maxDuration=120", () => {
    expect(runtime).toBe("nodejs");
    expect(maxDuration).toBe(120);
  });

  it("returns 401 when requireCronAuth rejects, no DB calls", async () => {
    vi.mocked(requireCronAuth).mockReturnValueOnce(
      new Response("Unauthorized", { status: 401 }) as never,
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    expect(dbIdx).toBe(0);
  });

  it("returns skipped when kill switch is on, no DB calls", async () => {
    mockIsFeatureDisabled.mockResolvedValueOnce(true);
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.skipped).toBe("kill_switch_on");
    expect(dbIdx).toBe(0);
  });

  it("returns zero stats when no view events found", async () => {
    dbQueue.push({ data: [], error: null }); // form_events views
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.scanned).toBe(0);
    expect(body.sent).toBe(0);
    // No further DB calls — no candidates
    expect(dbIdx).toBe(1);
  });

  it("happy path — sends recovery email and stamps recovery_sent_at", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    dbQueue.push({ data: [{ session_id: "s1", form_name: "advisor_enquiry" }], error: null }); // views
    dbQueue.push({ data: [], error: null }); // complete events (none)
    dbQueue.push({ data: [{ email: "user@example.com", session_id: "s1", recovery_sent_at: null, status: "active" }], error: null }); // captures
    dbQueue.push({ data: [], error: null }); // suppression list
    dbQueue.push({ error: null }); // update recovery_sent_at
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.sent).toBe(1);
    expect(body.scanned).toBe(1);
    expect(fetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("skips bounced email and increments suppressed", async () => {
    dbQueue.push({ data: [{ session_id: "s2", form_name: "lead_form" }], error: null });
    dbQueue.push({ data: [], error: null }); // completes
    dbQueue.push({ data: [{ email: "bounce@example.com", session_id: "s2", recovery_sent_at: null, status: "bounced" }], error: null });
    dbQueue.push({ data: [], error: null }); // suppression list
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.suppressed).toBe(1);
    expect(body.sent).toBe(0);
    expect(fetch).not.toHaveBeenCalledWith("https://api.resend.com/emails", expect.anything());
  });

  it("skips email in suppression list", async () => {
    dbQueue.push({ data: [{ session_id: "s3", form_name: "broker_apply" }], error: null });
    dbQueue.push({ data: [], error: null }); // completes
    dbQueue.push({ data: [{ email: "bad@example.com", session_id: "s3", recovery_sent_at: null, status: "active" }], error: null });
    dbQueue.push({ data: [{ email: "bad@example.com" }], error: null }); // suppressed
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.suppressed).toBe(1);
    expect(body.sent).toBe(0);
  });

  it("counts no_email when session has no email capture", async () => {
    dbQueue.push({ data: [{ session_id: "s4", form_name: "lead_form" }], error: null });
    dbQueue.push({ data: [], error: null }); // completes
    dbQueue.push({ data: [], error: null }); // captures (none for s4)
    dbQueue.push({ data: [], error: null }); // suppression list
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.no_email).toBe(1);
    expect(body.sent).toBe(0);
  });

  it("removes sessions that completed the form", async () => {
    dbQueue.push({ data: [
      { session_id: "s5", form_name: "advisor_enquiry" },
      { session_id: "s6", form_name: "broker_apply" },
    ], error: null });
    dbQueue.push({ data: [{ session_id: "s5" }], error: null }); // s5 completed
    // Only s6 remains as candidate — no captures for it
    dbQueue.push({ data: [], error: null }); // captures
    dbQueue.push({ data: [], error: null }); // suppression list
    const res = await GET(makeReq());
    const body = await res.json();
    // scanned = candidates after removing completers = 1 (s6)
    expect(body.scanned).toBe(1);
    expect(body.no_email).toBe(1);
  });
});
