import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { GET, POST, PATCH, DELETE } from "@/app/api/admin/content/calendar/route";

function makeReq(method: string, body?: unknown, token = "cron-secret"): NextRequest {
  return new NextRequest("http://localhost/api/admin/content/calendar", {
    method,
    headers: {
      "Content-Type": "application/json",
      authorization: `Bearer ${token}`,
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

function makeGetChain(data: unknown[], error: null | { message: string } = null) {
  const chain: Record<string, unknown> = {};
  const resolve = () => Promise.resolve({ data, error });
  chain.select = vi.fn().mockReturnValue(chain);
  chain.order = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.eq = vi.fn().mockReturnValue(chain);
  chain.then = (onFulfilled: (v: unknown) => unknown) => resolve().then(onFulfilled);
  chain.catch = (onRejected: (e: unknown) => unknown) => resolve().catch(onRejected);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.CRON_SECRET = "cron-secret";
});

describe("GET /api/admin/content/calendar", () => {
  it("returns 401 when bearer token is wrong", async () => {
    const res = await GET(makeReq("GET", undefined, "bad-token"));
    expect(res.status).toBe(401);
  });

  it("returns items list from DB", async () => {
    const items = [{ id: 1, title: "Article A", status: "planned" }];
    mockFrom.mockReturnValue(makeGetChain(items));
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.items).toEqual(items);
  });

  it("returns 500 on DB error", async () => {
    mockFrom.mockReturnValue(makeGetChain([], { message: "db error" }));
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(500);
  });
});

describe("POST /api/admin/content/calendar", () => {
  it("returns 401 when bearer token is wrong", async () => {
    const res = await POST(makeReq("POST", { title: "New Item" }, "bad-token"));
    expect(res.status).toBe(401);
  });

  it("creates item and returns 201", async () => {
    const item = { id: 1, title: "New Article", status: "planned" };
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: item, error: null }),
    });
    const res = await POST(makeReq("POST", { title: "New Article" }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.item).toEqual(item);
  });

  it("returns 500 on DB error", async () => {
    mockFrom.mockReturnValue({
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: { message: "constraint" } }),
    });
    const res = await POST(makeReq("POST", { title: "New Article" }));
    expect(res.status).toBe(500);
  });
});

describe("PATCH /api/admin/content/calendar", () => {
  it("returns 401 when bearer token is wrong", async () => {
    const res = await PATCH(makeReq("PATCH", { id: 1, status: "in_progress" }, "bad-token"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when id is missing", async () => {
    const res = await PATCH(makeReq("PATCH", { status: "in_progress" }));
    expect(res.status).toBe(400);
  });

  it("updates item and returns 200", async () => {
    const item = { id: 1, status: "in_progress" };
    mockFrom.mockReturnValue({
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: item, error: null }),
    });
    const res = await PATCH(makeReq("PATCH", { id: 1, status: "in_progress" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.item).toEqual(item);
  });
});

describe("DELETE /api/admin/content/calendar", () => {
  it("returns 401 when bearer token is wrong", async () => {
    const res = await DELETE(makeReq("DELETE", { id: 1 }, "bad-token"));
    expect(res.status).toBe(401);
  });

  it("returns 400 when id is missing", async () => {
    const res = await DELETE(makeReq("DELETE", {}));
    expect(res.status).toBe(400);
  });

  it("deletes item and returns success", async () => {
    mockFrom.mockReturnValue({
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    const res = await DELETE(makeReq("DELETE", { id: 1 }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });
});
