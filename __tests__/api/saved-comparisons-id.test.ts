import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));

const mockGetUser = vi.fn();
const mockFromFn = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFromFn,
  })),
}));

import { GET, PATCH, DELETE } from "@/app/api/saved-comparisons/[id]/route";

function makeChain(res: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "update", "delete", "eq", "single", "order"]) { c[m] = vi.fn(() => c); }
  c.then = (resolve: (v: unknown) => void) => Promise.resolve(resolve(res));
  return c;
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function makeReq(method: string, body?: unknown) {
  return new NextRequest(`http://localhost/api/saved-comparisons/comp-1`, {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body), headers: { "Content-Type": "application/json" } } : {}),
  });
}

const comparison = { id: "comp-1", name: "My Compare", broker_slugs: ["abc"], quiz_results: null, notes: null, created_at: "2026-01-01", updated_at: "2026-01-02" };

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/saved-comparisons/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET(makeReq("GET"), makeParams("comp-1"));
    expect(res.status).toBe(401);
  });

  it("returns 404 when comparison not found", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockFromFn.mockReturnValue(makeChain({ data: null, error: { message: "not found" } }));
    const res = await GET(makeReq("GET"), makeParams("comp-1"));
    expect(res.status).toBe(404);
  });

  it("returns comparison data on success", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockFromFn.mockReturnValue(makeChain({ data: comparison, error: null }));
    const res = await GET(makeReq("GET"), makeParams("comp-1"));
    const body = await res.json();
    expect(body.comparison.name).toBe("My Compare");
  });
});

describe("PATCH /api/saved-comparisons/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await PATCH(makeReq("PATCH", { name: "Updated" }), makeParams("comp-1"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when name is empty string", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    const res = await PATCH(makeReq("PATCH", { name: "   " }), makeParams("comp-1"));
    expect(res.status).toBe(400);
  });

  it("updates name and returns comparison", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockFromFn.mockReturnValue(makeChain({ data: { ...comparison, name: "Updated" }, error: null }));
    const res = await PATCH(makeReq("PATCH", { name: "Updated" }), makeParams("comp-1"));
    const body = await res.json();
    expect(body.comparison.name).toBe("Updated");
  });

  it("sets notes to null when notes is empty string", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockFromFn.mockReturnValue(makeChain({ data: { ...comparison, notes: null }, error: null }));
    const res = await PATCH(makeReq("PATCH", { notes: "" }), makeParams("comp-1"));
    const body = await res.json();
    expect(body.comparison.notes).toBeNull();
  });
});

describe("DELETE /api/saved-comparisons/[id]", () => {
  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await DELETE(makeReq("DELETE"), makeParams("comp-1"));
    expect(res.status).toBe(401);
  });

  it("returns 500 when delete errors", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockFromFn.mockReturnValue(makeChain({ data: null, error: { message: "delete failed" } }));
    const res = await DELETE(makeReq("DELETE"), makeParams("comp-1"));
    expect(res.status).toBe(500);
  });

  it("returns success:true on successful delete", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockFromFn.mockReturnValue(makeChain({ data: null, error: null }));
    const res = await DELETE(makeReq("DELETE"), makeParams("comp-1"));
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
