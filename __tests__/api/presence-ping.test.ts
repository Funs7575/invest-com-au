/**
 * Tests for POST /api/presence/ping — "online now" heartbeat.
 *
 * Pipeline: rate-limit → JSON parse → Zod safeParse → auth → ownership
 * verification (service-role) → pingPresence write.
 *
 * Ownership queries and the write helper are mocked; the route's branching
 * (professional vs team, not-found, write-failure) is exercised directly.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockIsAllowed, mockGetUser, mockAdminFrom, mockPingPresence } = vi.hoisted(
  () => ({
    mockIsAllowed: vi.fn(),
    mockGetUser: vi.fn(),
    mockAdminFrom: vi.fn(),
    mockPingPresence: vi.fn(),
  }),
);

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: () => "test-ip",
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/presence", () => ({
  pingPresence: (...args: unknown[]) => mockPingPresence(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { POST } from "@/app/api/presence/ping/route";

const USER = { id: "user-pres-1", email: "pres@test.com" };

function makeReq(body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/presence/ping", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

/** Thenable chain ending in maybeSingle, mirroring the ownership query. */
function makeChain(result: { data: unknown; error?: unknown }) {
  const c: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ["select", "eq", "or", "in"]) c[m] = vi.fn(() => c);
  c.maybeSingle = vi.fn(() => Promise.resolve(result));
  c.then = vi.fn((resolve: (v: unknown) => void) => {
    resolve(result);
    return Promise.resolve(result);
  });
  return c;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockIsAllowed.mockResolvedValue(true);
  mockGetUser.mockResolvedValue({ data: { user: USER } });
});

describe("POST /api/presence/ping", () => {
  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await POST(makeReq({ kind: "professional", id: 1 }));
    expect(res.status).toBe(429);
  });

  it("returns 400 on invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/presence/ping", {
      method: "POST",
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "Invalid JSON body." });
  });

  it("returns 400 when the body fails schema validation", async () => {
    const res = await POST(makeReq({ kind: "robot", id: 1 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when id is not a positive integer", async () => {
    const res = await POST(makeReq({ kind: "professional", id: -5 }));
    expect(res.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(makeReq({ kind: "professional", id: 1 }));
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: "Auth required." });
  });

  it("returns 404 when the professional row is not owned by the caller", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: null }));
    const res = await POST(makeReq({ kind: "professional", id: 99 }));
    expect(res.status).toBe(404);
    expect(await res.json()).toMatchObject({ error: "Not found." });
    expect(mockPingPresence).not.toHaveBeenCalled();
  });

  it("writes the ping and returns ok for an owned professional", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: { id: 7 } }));
    mockPingPresence.mockResolvedValueOnce(undefined);
    const res = await POST(makeReq({ kind: "professional", id: 7 }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockPingPresence).toHaveBeenCalledWith({ kind: "professional", id: 7 });
  });

  it("returns 500 when the presence write throws", async () => {
    mockAdminFrom.mockReturnValue(makeChain({ data: { id: 7 } }));
    mockPingPresence.mockRejectedValueOnce(new Error("upsert exploded"));
    const res = await POST(makeReq({ kind: "professional", id: 7 }));
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: "Write failed." });
  });

  it("returns 404 for a team the caller is not an active member of", async () => {
    // Team path issues two admin queries: the membership lookup (maybeSingle)
    // and a nested professionals lookup (awaited). Both resolve to no rows.
    mockAdminFrom.mockReturnValue(makeChain({ data: null }));
    const res = await POST(makeReq({ kind: "team", id: 3 }));
    expect(res.status).toBe(404);
    expect(mockPingPresence).not.toHaveBeenCalled();
  });
});
