import { describe, it, expect, vi, beforeEach } from "vitest";

// run-migration inspects live schema, so it must require a logged-in ADMIN
// (audit §5 #12) — not CRON_SECRET. Tests assert the route delegates auth to
// requireAdmin() and only touches the DB when the guard passes.
const mockRequireAdmin = vi.fn();
vi.mock("@/lib/require-admin", () => ({
  requireAdmin: (...args: unknown[]) => mockRequireAdmin(...args),
}));

const fromMock = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: fromMock })),
}));

import { GET, POST } from "@/app/api/admin/run-migration/route";

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

  it("GET returns the requireAdmin denial when not an admin", async () => {
    const denial = new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    mockRequireAdmin.mockResolvedValueOnce({ ok: false, response: denial });
    const res = await GET();
    expect(res).toBe(denial);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("POST returns the requireAdmin denial when not an admin", async () => {
    const denial = new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    mockRequireAdmin.mockResolvedValueOnce({ ok: false, response: denial });
    const res = await POST();
    expect(res).toBe(denial);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("GET proceeds to DB checks when requireAdmin passes", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ ok: true, email: "finn@invest.com.au", userId: "u1" });
    const res = await GET();
    expect(res.status).toBe(200);
    expect(fromMock).toHaveBeenCalled();
  });

  it("POST proceeds to DB checks when requireAdmin passes", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ ok: true, email: "finn@invest.com.au", userId: "u1" });
    const res = await POST();
    expect(res.status).toBe(200);
    expect(fromMock).toHaveBeenCalled();
  });

  it("does not rely on CRON_SECRET / requireCronAuth (schema-inspection is admin-only)", async () => {
    const src = await import("node:fs").then((fs) =>
      fs.readFileSync("app/api/admin/run-migration/route.ts", "utf8"),
    );
    expect(src).not.toMatch(/requireCronAuth/);
    expect(src).not.toMatch(/CRON_SECRET/);
    expect(src).not.toMatch(/INTERNAL_API_KEY/);
  });
});
