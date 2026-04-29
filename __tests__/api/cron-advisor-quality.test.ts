import { describe, it, expect, vi, beforeEach } from "vitest";
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

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: vi.fn(() => null),
}));

const fetchMock = vi.fn<() => Promise<Response>>();
vi.stubGlobal("fetch", fetchMock);

// ─── DB queue ────────────────────────────────────────────────────────────────

interface DbResult {
  data?: unknown;
  error?: { message: string } | null;
  count?: number | null;
}

let dbQueue: DbResult[] = [];
let dbIdx = 0;

function makeChain(res: DbResult) {
  const chain: Record<string, unknown> = {};
  const methods = ["select","update","insert","eq","neq","lt","lte","gte","not","in","or","limit","maybeSingle","single"];
  for (const m of methods) chain[m] = vi.fn(() => chain);
  const r = { data: res.data ?? null, error: res.error ?? null, count: res.count ?? null };
  chain.then = (resolve: (v: typeof r) => unknown) => Promise.resolve(resolve(r));
  chain.catch = () => chain;
  return chain;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => makeChain(dbQueue[dbIdx++] ?? { error: null })),
  })),
}));

import { GET } from "@/app/api/cron/advisor-quality/route";
import { requireCronAuth } from "@/lib/cron-auth";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/advisor-quality", {
    headers: { Authorization: "Bearer test-secret" },
  }) as unknown as NextRequest;
}

function fullAdvisor(overrides: Record<string, unknown> = {}) {
  return {
    id: "adv-1",
    name: "Alice Smith",
    email: "alice@example.com",
    bio: "I am a very experienced financial advisor with deep knowledge of SMSF strategies.",
    photo_url: "https://example.com/photo.jpg",
    afsl_number: "123456",
    registration_number: null,
    phone: "0400123456",
    location_display: "Sydney, NSW",
    specialties: ["SMSF", "retirement"],
    fee_description: "Fixed fee $3,500",
    status: "active",
    profile_quality_gate: "failed",
    ...overrides,
  };
}

function activeAdvisorSla(overrides: Record<string, unknown> = {}) {
  return {
    id: "adv-2",
    name: "Bob Jones",
    email: "bob@example.com",
    status: "active",
    pause_warning_sent_at: null,
    auto_paused_at: null,
    ...overrides,
  };
}

beforeEach(() => {
  dbQueue = [];
  dbIdx = 0;
  vi.clearAllMocks();
  fetchMock.mockResolvedValue(new Response(JSON.stringify({ id: "email-1" }), { status: 200 }));
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/cron/advisor-quality", () => {
  it("returns 401 when cron auth fails", async () => {
    vi.mocked(requireCronAuth).mockReturnValueOnce(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }) as never
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns ok with empty results when no advisors found", async () => {
    dbQueue.push({ data: [] }); // profile gate: no advisors
    dbQueue.push({ data: [] }); // SLA: no active advisors
    dbQueue.push({ data: [] }); // ASIC: no to-verify advisors
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; results: unknown[] };
    expect(body.ok).toBe(true);
    expect(body.results).toHaveLength(0);
  });

  it("marks advisor as profile_gate=passed when all fields present", async () => {
    const a = fullAdvisor();
    dbQueue.push({ data: [a] });   // profile gate fetch
    dbQueue.push({ error: null }); // update professionals
    dbQueue.push({ error: null }); // insert advisor_verification_log
    dbQueue.push({ data: [] });    // SLA: no active advisors
    dbQueue.push({ data: [] });    // ASIC: no to-verify

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; results: { check: string; action: string }[] };
    expect(body.ok).toBe(true);
    const gateResult = body.results.find((r) => r.check === "profile_gate");
    expect(gateResult?.action).toBe("passed");
  });

  it("marks advisor as profile_gate=failed when bio is too short", async () => {
    // Route passes if missing.length <= 1; need 2+ missing fields to get gateStatus="failed"
    const a = fullAdvisor({ bio: "Too short", photo_url: null, profile_quality_gate: "passed" });
    dbQueue.push({ data: [a] });
    dbQueue.push({ error: null }); // update
    dbQueue.push({ error: null }); // log
    dbQueue.push({ data: [] });    // SLA
    dbQueue.push({ data: [] });    // ASIC

    const res = await GET(makeReq());
    const body = await res.json() as { results: { check: string; action: string }[] };
    const gateResult = body.results.find((r) => r.check === "profile_gate");
    expect(gateResult?.action).toBe("failed");
  });

  it("sends SLA warning email when advisor has 3+ unresponded leads", async () => {
    dbQueue.push({ data: [] });                              // profile gate: no change
    dbQueue.push({ data: [activeAdvisorSla()] });            // SLA: active advisors
    dbQueue.push({ count: 4, data: null });                  // unresponded leads count
    dbQueue.push({ error: null });                           // update unresponded_leads
    dbQueue.push({ error: null });                           // update pause_warning_sent_at
    dbQueue.push({ error: null });                           // insert verification_log
    dbQueue.push({ data: [] });                              // ASIC: none

    process.env.RESEND_API_KEY = "test-key";
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { results: { check: string; action: string }[] };
    const slaResult = body.results.find((r) => r.check === "response_sla");
    expect(slaResult?.action).toBe("warning_sent");
    expect(fetchMock).toHaveBeenCalled();
  });

  it("auto-pauses advisor with 5+ unresponded leads after warning sent 3+ days ago", async () => {
    const warningSentAt = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString();
    const a = activeAdvisorSla({ pause_warning_sent_at: warningSentAt });

    dbQueue.push({ data: [] });       // profile gate
    dbQueue.push({ data: [a] });      // SLA advisors
    dbQueue.push({ count: 6, data: null }); // 6 unresponded leads
    dbQueue.push({ error: null });    // update unresponded_leads
    dbQueue.push({ error: null });    // update status=paused
    dbQueue.push({ error: null });    // insert log
    dbQueue.push({ data: [] });       // ASIC

    process.env.RESEND_API_KEY = "test-key";
    const res = await GET(makeReq());
    const body = await res.json() as { results: { check: string; action: string }[] };
    const slaResult = body.results.find((r) => r.check === "response_sla");
    expect(slaResult?.action).toBe("auto_paused");
  });

  it("skips ASIC verification for advisors checked within 30 days", async () => {
    dbQueue.push({ data: [] }); // profile gate
    dbQueue.push({ data: [] }); // SLA
    dbQueue.push({ data: [] }); // ASIC: toVerify empty (filtered by date)

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; results: unknown[] };
    expect(body.ok).toBe(true);
  });

  it("handles profile gate DB error gracefully and continues", async () => {
    // Profile gate throws → catch block; SLA + ASIC still run
    dbQueue.push({ error: { message: "db down" } }); // profile gate throws
    dbQueue.push({ data: [] });                       // SLA
    dbQueue.push({ data: [] });                       // ASIC

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean };
    expect(body.ok).toBe(true);
  });
});
