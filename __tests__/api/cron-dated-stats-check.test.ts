import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })),
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: vi.fn(() => null),
}));

const mockSendEmail = vi.fn(() => Promise.resolve({ ok: true }));
vi.mock("@/lib/resend", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

vi.mock("@/lib/admin", () => ({
  ADMIN_EMAIL: "admin@invest.com.au",
}));

const mockGetStaleStats = vi.fn(() => []);
const mockGetUpcomingStaleStats = vi.fn(() => []);
vi.mock("@/lib/dated-stats", () => ({
  getStaleStats: (...args: unknown[]) => mockGetStaleStats(...args),
  getUpcomingStaleStats: (...args: unknown[]) => mockGetUpcomingStaleStats(...args),
}));

import { GET } from "@/app/api/cron/dated-stats-check/route";
import { requireCronAuth } from "@/lib/cron-auth";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/dated-stats-check") as unknown as NextRequest;
}

const fakeStat = (id: string) => ({
  id,
  label: "Test Stat",
  value: "$1B",
  stalesAt: new Date("2026-01-01"),
  page: "/test",
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/cron/dated-stats-check", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetStaleStats.mockReturnValue([]);
    mockGetUpcomingStaleStats.mockReturnValue([]);
    delete process.env.ADMIN_NOTIFICATION_EMAIL;
    delete process.env.OPS_ALERT_EMAIL;
  });

  it("returns 401 when requireCronAuth rejects", async () => {
    vi.mocked(requireCronAuth).mockReturnValueOnce(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }) as never,
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns ok with zero counts when no stale or upcoming stats", async () => {
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json() as { ok: boolean; stale: number; upcoming: number };
    expect(json.ok).toBe(true);
    expect(json.stale).toBe(0);
    expect(json.upcoming).toBe(0);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("sends email when there are stale stats", async () => {
    mockGetStaleStats.mockReturnValue([fakeStat("stat-1"), fakeStat("stat-2")]);
    const res = await GET(makeReq());
    const json = await res.json() as { ok: boolean; stale: number };
    expect(json.ok).toBe(true);
    expect(json.stale).toBe(2);
    expect(mockSendEmail).toHaveBeenCalledOnce();
    const call = mockSendEmail.mock.calls[0]![0] as { subject: string; html: string };
    expect(call.subject).toMatch(/2 stale/);
    expect(call.html).toMatch(/stat-1/);
  });

  it("sends email when there are upcoming stats", async () => {
    mockGetUpcomingStaleStats.mockReturnValue([fakeStat("upcoming-1")]);
    const res = await GET(makeReq());
    const json = await res.json() as { ok: boolean; upcoming: number };
    expect(json.ok).toBe(true);
    expect(json.upcoming).toBe(1);
    expect(mockSendEmail).toHaveBeenCalledOnce();
    const call = mockSendEmail.mock.calls[0]![0] as { html: string };
    expect(call.html).toMatch(/upcoming-1/);
  });

  it("sends to ADMIN_NOTIFICATION_EMAIL when set", async () => {
    process.env.ADMIN_NOTIFICATION_EMAIL = "notify@example.com";
    mockGetStaleStats.mockReturnValue([fakeStat("s1")]);
    await GET(makeReq());
    const call = mockSendEmail.mock.calls[0]![0] as { to: string };
    expect(call.to).toBe("notify@example.com");
  });

  it("falls back to OPS_ALERT_EMAIL when ADMIN_NOTIFICATION_EMAIL absent", async () => {
    process.env.OPS_ALERT_EMAIL = "ops@example.com";
    mockGetStaleStats.mockReturnValue([fakeStat("s1")]);
    await GET(makeReq());
    const call = mockSendEmail.mock.calls[0]![0] as { to: string };
    expect(call.to).toBe("ops@example.com");
  });

  it("still returns ok when sendEmail fails", async () => {
    mockGetStaleStats.mockReturnValue([fakeStat("s1")]);
    mockSendEmail.mockResolvedValueOnce({ ok: false, error: "smtp error" });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json() as { ok: boolean };
    expect(json.ok).toBe(true);
  });

  it("includes both stale and upcoming counts in response", async () => {
    mockGetStaleStats.mockReturnValue([fakeStat("s1"), fakeStat("s2"), fakeStat("s3")]);
    mockGetUpcomingStaleStats.mockReturnValue([fakeStat("u1")]);
    const res = await GET(makeReq());
    const json = await res.json() as { stale: number; upcoming: number };
    expect(json.stale).toBe(3);
    expect(json.upcoming).toBe(1);
  });
});
