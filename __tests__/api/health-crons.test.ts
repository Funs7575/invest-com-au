import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const { mockResult } = vi.hoisted(() => ({
  mockResult: {
    data: null as { started_at: string } | null,
    error: null as { message: string } | null,
  },
}));

vi.mock("@/lib/supabase/admin", () => {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "order", "limit"]) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }
  builder.maybeSingle = vi.fn(async () => mockResult);
  return { createAdminClient: () => ({ from: vi.fn().mockReturnValue(builder) }) };
});

import { GET } from "@/app/api/health/crons/route";

describe("GET /api/health/crons (cron-fleet dead-man probe)", () => {
  beforeEach(() => {
    mockResult.data = null;
    mockResult.error = null;
  });

  it("reports fresh when the newest run is recent", async () => {
    mockResult.data = { started_at: new Date(Date.now() - 10 * 60_000).toISOString() };
    const res = await GET();
    const body = await res.json();
    expect(body.status).toBe("fresh");
    expect(body.ok).toBe(true);
    expect(body.ageMinutes).toBeLessThanOrEqual(11);
  });

  it("reports stale between 2h and 26h", async () => {
    mockResult.data = { started_at: new Date(Date.now() - 10 * 3_600_000).toISOString() };
    const res = await GET();
    const body = await res.json();
    expect(body.status).toBe("stale");
    expect(body.ok).toBe(false);
  });

  it("reports dark beyond 26h — the 2026-05-23 incident shape", async () => {
    mockResult.data = { started_at: new Date(Date.now() - 19 * 86_400_000).toISOString() };
    const res = await GET();
    const body = await res.json();
    expect(body.status).toBe("dark");
    expect(body.ok).toBe(false);
  });

  it("reports dark when the log is empty", async () => {
    const res = await GET();
    const body = await res.json();
    expect(body.status).toBe("dark");
    expect(body.ageMinutes).toBeNull();
  });

  it("500s with status unknown on a read error", async () => {
    mockResult.error = { message: "boom" };
    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.status).toBe("unknown");
  });
});
