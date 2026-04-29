import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })),
}));

vi.mock("@/lib/cron-run-log", () => ({
  wrapCronHandler: (_name: string, h: unknown) => h,
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: vi.fn(() => null),
}));

const mockEvaluateSlo = vi.fn();
const mockOpenIncident = vi.fn(() => Promise.resolve());
const mockResolveIncident = vi.fn(() => Promise.resolve());
vi.mock("@/lib/slo", () => ({
  evaluateSlo: (...args: unknown[]) => mockEvaluateSlo(...args),
  openIncident: (...args: unknown[]) => mockOpenIncident(...args),
  resolveIncident: (...args: unknown[]) => mockResolveIncident(...args),
}));

// Queue-based DB mock
interface DbResult { data?: unknown; error?: { message: string } | null; count?: number | null }
const dbQueue: DbResult[] = [];
let dbIdx = 0;

function makeChain(res: DbResult) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "gte", "order", "limit"]) {
    c[m] = vi.fn(() => c);
  }
  c.maybeSingle = vi.fn(() =>
    Promise.resolve({ data: res.data ?? null, error: res.error ?? null }),
  );
  c.then = (resolve: (v: { data: unknown; error: unknown; count: number | null }) => unknown) =>
    Promise.resolve(resolve({ data: res.data ?? null, error: res.error ?? null, count: res.count ?? null }));
  return c;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => makeChain(dbQueue[dbIdx++] ?? { data: null })),
  })),
}));

import { GET } from "@/app/api/cron/slo-monitor/route";
import { requireCronAuth } from "@/lib/cron-auth";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/slo-monitor") as unknown as NextRequest;
}

function makeSloDefinition(overrides: Record<string, unknown> = {}) {
  return {
    name: "api_success_rate",
    service: "api",
    metric: "success_rate",
    target: 0.995,
    comparator: "gte",
    window_minutes: 60,
    enabled: true,
    evaluation_source: { type: "cron", name: "job-queue-worker" },
    ...overrides,
  };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/cron/slo-monitor", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbQueue.length = 0;
    dbIdx = 0;
    mockEvaluateSlo.mockReturnValue({ breached: false });
    mockOpenIncident.mockResolvedValue(undefined);
    mockResolveIncident.mockResolvedValue(undefined);
  });

  it("returns 401 when requireCronAuth rejects", async () => {
    vi.mocked(requireCronAuth).mockReturnValueOnce(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }) as never,
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 500 when slo_definitions fetch fails", async () => {
    dbQueue.push({ data: null, error: { message: "fetch_failed" } });
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const json = await res.json() as { ok: boolean; error: string };
    expect(json.ok).toBe(false);
    expect(json.error).toBe("fetch_failed");
  });

  it("returns ok with evaluated=0 when no enabled SLOs", async () => {
    dbQueue.push({ data: [] }); // slo_definitions
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json() as { ok: boolean; evaluated: number; breached: number; resolved: number; failed: number };
    expect(json.ok).toBe(true);
    expect(json.evaluated).toBe(0);
    expect(json.breached).toBe(0);
    expect(json.resolved).toBe(0);
    expect(json.failed).toBe(0);
  });

  it("resolves incident when SLO is not breached", async () => {
    dbQueue.push({ data: [makeSloDefinition()] }); // slo_definitions
    // For cron source: cron_run_log rows
    dbQueue.push({ data: [{ status: "ok" }, { status: "ok" }] });
    mockEvaluateSlo.mockReturnValue({ breached: false });
    const res = await GET(makeReq());
    const json = await res.json() as { resolved: number; breached: number };
    expect(json.resolved).toBe(1);
    expect(json.breached).toBe(0);
    expect(mockResolveIncident).toHaveBeenCalledWith("api_success_rate");
  });

  it("opens incident when SLO is breached", async () => {
    dbQueue.push({ data: [makeSloDefinition()] });
    dbQueue.push({ data: [{ status: "ok" }, { status: "error" }] }); // 50% ok rate
    mockEvaluateSlo.mockReturnValue({ breached: true, value: 0.5 });
    const res = await GET(makeReq());
    const json = await res.json() as { breached: number };
    expect(json.breached).toBe(1);
    expect(mockOpenIncident).toHaveBeenCalled();
  });

  it("increments failed when measureSlo returns null (unknown source type)", async () => {
    dbQueue.push({ data: [makeSloDefinition({ evaluation_source: { type: "unknown_type" } })] });
    const res = await GET(makeReq());
    const json = await res.json() as { failed: number };
    expect(json.failed).toBe(1);
    expect(mockEvaluateSlo).not.toHaveBeenCalled();
  });

  it("measures cron_freshness source type correctly", async () => {
    const def = makeSloDefinition({ evaluation_source: { type: "cron_freshness", name: "job-queue-worker" } });
    dbQueue.push({ data: [def] });
    // maybeSingle returns a recent started_at
    dbQueue.push({ data: { started_at: new Date(Date.now() - 60_000).toISOString() } });
    mockEvaluateSlo.mockReturnValue({ breached: false });
    const res = await GET(makeReq());
    const json = await res.json() as { evaluated: number };
    expect(json.evaluated).toBe(1);
    const call = mockEvaluateSlo.mock.calls[0]!;
    const measurement = call[1] as { value: number };
    expect(measurement.value).toBeGreaterThan(0); // minutes since run
  });

  it("measures queue_age source type correctly", async () => {
    const def = makeSloDefinition({
      evaluation_source: { type: "queue_age", table: "job_queue", column: "scheduled_at", status_column: "status", status_value: "ready" },
    });
    dbQueue.push({ data: [def] });
    // maybeSingle returns an old scheduled_at
    dbQueue.push({ data: { scheduled_at: new Date(Date.now() - 600_000).toISOString() } });
    mockEvaluateSlo.mockReturnValue({ breached: false });
    await GET(makeReq());
    const call = mockEvaluateSlo.mock.calls[0]!;
    const measurement = call[1] as { value: number };
    expect(measurement.value).toBeGreaterThan(5); // ~10 minutes
  });

  it("returns 0 for queue_age when no ready rows", async () => {
    const def = makeSloDefinition({ evaluation_source: { type: "queue_age", table: "job_queue", column: "scheduled_at", status_column: "status", status_value: "ready" } });
    dbQueue.push({ data: [def] });
    dbQueue.push({ data: null }); // maybeSingle: no ready rows
    mockEvaluateSlo.mockReturnValue({ breached: false });
    await GET(makeReq());
    const call = mockEvaluateSlo.mock.calls[0]!;
    const measurement = call[1] as { value: number };
    expect(measurement.value).toBe(0);
  });

  it("measures open_incidents source type correctly", async () => {
    const def = makeSloDefinition({ evaluation_source: { type: "open_incidents" } });
    dbQueue.push({ data: [def] });
    dbQueue.push({ count: 3 }); // 3 open incidents
    mockEvaluateSlo.mockReturnValue({ breached: false });
    await GET(makeReq());
    const measurement = mockEvaluateSlo.mock.calls[0]![1] as { value: number };
    expect(measurement.value).toBe(3);
  });

  it("increments failed when evaluation throws", async () => {
    dbQueue.push({ data: [makeSloDefinition()] });
    dbQueue.push({ data: [] }); // cron_run_log rows
    mockEvaluateSlo.mockImplementationOnce(() => { throw new Error("slo eval error"); });
    const res = await GET(makeReq());
    const json = await res.json() as { failed: number };
    expect(json.failed).toBe(1);
  });
});
