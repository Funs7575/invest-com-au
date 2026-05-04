import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// requireCronAuth is the ONLY auth gate this route should rely on.
// Tests assert the route delegates auth fully to it (no fallback secret,
// no ad-hoc bearer comparison), then exercises the DB-shape branch.
const mockRequireCronAuth = vi.fn();
vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: (...args: unknown[]) => mockRequireCronAuth(...args),
}));

const fromMock = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: fromMock })),
}));

import { GET, POST } from "@/app/api/admin/run-migration/route";

function makeReq(method: "GET" | "POST"): NextRequest {
  return new Request(`http://localhost/api/admin/run-migration`, { method }) as unknown as NextRequest;
}

function makeChain(result: { data?: unknown; error?: { message: string } | null }) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "limit"]) chain[m] = vi.fn(() => chain);
  chain.then = (resolve: (v: typeof result) => unknown) =>
    Promise.resolve(resolve({ data: result.data ?? null, error: result.error ?? null }));
  return chain;
}

describe("admin/run-migration auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fromMock.mockReturnValue(makeChain({ error: null }));
  });

  it("GET returns whatever requireCronAuth returns when unauthenticated", async () => {
    const unauth = new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    mockRequireCronAuth.mockReturnValueOnce(unauth);
    const res = await GET(makeReq("GET"));
    expect(res).toBe(unauth);
    expect(mockRequireCronAuth).toHaveBeenCalledTimes(1);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("POST returns whatever requireCronAuth returns when unauthenticated", async () => {
    const unauth = new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    mockRequireCronAuth.mockReturnValueOnce(unauth);
    const res = await POST(makeReq("POST"));
    expect(res).toBe(unauth);
    expect(mockRequireCronAuth).toHaveBeenCalledTimes(1);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("GET proceeds to DB checks when requireCronAuth passes", async () => {
    mockRequireCronAuth.mockReturnValueOnce(null);
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(200);
    expect(fromMock).toHaveBeenCalled();
  });

  it("POST proceeds to DB checks when requireCronAuth passes", async () => {
    mockRequireCronAuth.mockReturnValueOnce(null);
    const res = await POST(makeReq("POST"));
    expect(res.status).toBe(200);
    expect(fromMock).toHaveBeenCalled();
  });

  it("does not reference INTERNAL_API_KEY (mixed-secret fallback removed)", async () => {
    // Source-level guard: catches future regressions if a maintainer
    // re-introduces the OR fallback.
    const src = await import("node:fs").then((fs) =>
      fs.readFileSync("app/api/admin/run-migration/route.ts", "utf8"),
    );
    expect(src).not.toMatch(/INTERNAL_API_KEY/);
    expect(src).not.toMatch(/CRON_SECRET\s*\|\|/);
  });
});
