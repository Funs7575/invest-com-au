import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockGetStat } = vi.hoisted(() => ({
  mockGetStat: vi.fn(),
}));

vi.mock("@/lib/social-proof", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    getSocialProofStat: (...args: unknown[]) => mockGetStat(...args),
  };
});

// lib/social-proof's module init wraps with cached() — identity it so
// importing the route never needs a Next cache context.
vi.mock("@/lib/cache", () => ({
  cached: <T>(fn: T) => fn,
  CacheTTL: { STATIC: 86400, MODERATE: 3600, DYNAMIC: 300 },
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

import { GET } from "@/app/api/social-proof/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeGet(metric?: string): NextRequest {
  const qs = metric === undefined ? "" : `?metric=${encodeURIComponent(metric)}`;
  return new NextRequest(`http://localhost/api/social-proof${qs}`, { method: "GET" });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetStat.mockResolvedValue({ show: false });
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("GET /api/social-proof", () => {
  it("returns 400 for a missing metric", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("invalid_metric");
    expect(mockGetStat).not.toHaveBeenCalled();
  });

  it("returns 400 for an unknown metric", async () => {
    const res = await GET(makeGet("visitors-right-now"));
    expect(res.status).toBe(400);
    expect(mockGetStat).not.toHaveBeenCalled();
  });

  it("returns the real aggregate above the threshold, with CDN cache headers", async () => {
    mockGetStat.mockResolvedValue({
      show: true,
      count: 1240,
      label: "1,240 platforms compared on invest.com.au in the past 30 days",
    });

    const res = await GET(makeGet("compare"));
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("public");
    expect(res.headers.get("Cache-Control")).toContain("max-age=3600");

    const json = await res.json();
    expect(json).toEqual({
      metric: "compare",
      show: true,
      count: 1240,
      label: "1,240 platforms compared on invest.com.au in the past 30 days",
      windowDays: 30,
    });
    expect(mockGetStat).toHaveBeenCalledWith("compare");
  });

  it("hides below the threshold and does not leak the small count", async () => {
    mockGetStat.mockResolvedValue({ show: false });

    const res = await GET(makeGet("quiz"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toEqual({ metric: "quiz", show: false });
    expect(json).not.toHaveProperty("count");
    expect(json).not.toHaveProperty("label");
  });

  it("fails closed (show:false, 200) when the aggregate lookup throws", async () => {
    mockGetStat.mockRejectedValue(new Error("db down"));

    const res = await GET(makeGet("calculator"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ metric: "calculator", show: false });
  });

  it("accepts all three real metrics", async () => {
    for (const metric of ["quiz", "compare", "calculator"]) {
      const res = await GET(makeGet(metric));
      expect(res.status).toBe(200);
    }
    expect(mockGetStat).toHaveBeenCalledTimes(3);
  });
});
