import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockIsAllowed } = vi.hoisted(() => ({ mockIsAllowed: vi.fn(() => Promise.resolve(true)) }));
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: () => "ip:test",
}));

import { GET } from "@/app/api/adviser-register/search/route";
import { allRegisterAdvisers } from "@/lib/adviser-register";
import { NextRequest } from "next/server";

function req(q: string | null) {
  const url = new URL("http://localhost/api/adviser-register/search");
  if (q !== null) url.searchParams.set("q", q);
  return new NextRequest(url);
}

beforeEach(() => {
  mockIsAllowed.mockClear();
  mockIsAllowed.mockResolvedValue(true);
});

describe("GET /api/adviser-register/search", () => {
  it("returns matching advisers with the public field shape", async () => {
    const first = allRegisterAdvisers()[0]!;
    const res = await GET(req(first.name.slice(0, 5)));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { results: Record<string, unknown>[] };
    expect(body.results.length).toBeGreaterThan(0);
    const row = body.results[0]!;
    expect(Object.keys(row).sort()).toEqual(["licenseeName", "name", "number", "role", "slug"]);
  });

  it("treats short/missing/oversized queries as empty results, not 400", async () => {
    for (const q of ["a", null, "x".repeat(500)]) {
      const res = await GET(req(q));
      expect(res.status).toBe(200);
      expect(((await res.json()) as { results: unknown[] }).results).toEqual([]);
    }
  });

  it("rate-limits", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await GET(req("jane"));
    expect(res.status).toBe(429);
  });

  it("fails open when the limiter backend is unavailable", async () => {
    mockIsAllowed.mockRejectedValueOnce(new Error("supabase down"));
    const first = allRegisterAdvisers()[0]!;
    const res = await GET(req(first.name.slice(0, 5)));
    expect(res.status).toBe(200);
    expect(((await res.json()) as { results: unknown[] }).results.length).toBeGreaterThan(0);
  });

  it("sets a CDN cache header on results", async () => {
    const res = await GET(req("an"));
    expect(res.headers.get("Cache-Control")).toContain("s-maxage");
  });
});
