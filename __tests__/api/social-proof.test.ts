import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

// Pass-through so each test hits the underlying query fn.
vi.mock("next/cache", () => ({
  unstable_cache: <T extends (...args: never[]) => unknown>(fn: T) => fn,
}));

const { mockRows } = vi.hoisted(() => ({
  mockRows: { data: [] as { session_id: string }[] | null, error: null as { message: string } | null },
}));

vi.mock("@/lib/supabase/admin", () => {
  const builder: Record<string, unknown> = {};
  for (const method of ["select", "gte", "not", "limit", "like", "in"]) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }
  builder.then = (resolve: (value: unknown) => unknown) => Promise.resolve(mockRows).then(resolve);
  return { createAdminClient: () => ({ from: vi.fn().mockReturnValue(builder) }) };
});

import { GET } from "@/app/api/social-proof/route";

function makeRequest(surface?: string) {
  const url = surface
    ? `https://invest.com.au/api/social-proof?surface=${surface}`
    : "https://invest.com.au/api/social-proof";
  return new NextRequest(url);
}

describe("GET /api/social-proof", () => {
  beforeEach(() => {
    mockRows.data = [];
    mockRows.error = null;
  });

  it("rejects unknown surfaces", async () => {
    const res = await GET(makeRequest("not-a-surface"));
    expect(res.status).toBe(400);
  });

  it("withholds the count below the show threshold (no fabricated floor)", async () => {
    mockRows.data = Array.from({ length: 5 }, (_, i) => ({ session_id: `s${i}` }));
    const res = await GET(makeRequest("compare"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.show).toBe(false);
    expect(body.count).toBeNull();
  });

  it("returns a distinct-session count at/above threshold", async () => {
    // 30 distinct sessions, each appearing twice — count must dedupe to 30.
    mockRows.data = Array.from({ length: 60 }, (_, i) => ({ session_id: `s${i % 30}` }));
    const res = await GET(makeRequest("compare"));
    const body = await res.json();
    expect(body.show).toBe(true);
    expect(body.count).toBe(30);
    expect(body.periodDays).toBe(7);
  });

  it("fails closed (hidden) when the query errors", async () => {
    mockRows.data = null;
    mockRows.error = { message: "boom" };
    const res = await GET(makeRequest("calculator"));
    const body = await res.json();
    expect(body.show).toBe(false);
    expect(body.count).toBeNull();
  });

  it("sets a CDN cache header", async () => {
    const res = await GET(makeRequest("rates"));
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=3600");
  });
});
