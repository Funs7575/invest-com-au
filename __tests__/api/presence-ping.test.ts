/**
 * Tests for POST /api/presence/ping
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const { mockIsAllowed, mockGetUser, mockPingPresence } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(async () => true),
  mockGetUser: vi.fn(async () => ({ data: { user: { id: "u1", email: "pro@example.com" } }, error: null })),
  mockPingPresence: vi.fn(async () => undefined),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: () => "test-ip",
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/presence", () => ({
  pingPresence: mockPingPresence,
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

import { POST } from "@/app/api/presence/ping/route";

const VALID_BODY = { kind: "professional", id: 1 };

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/presence/ping", {
    method: "POST",
    body: JSON.stringify(body ?? VALID_BODY),
    headers: { "content-type": "application/json" },
  }) as unknown as NextRequest;
}

function makeProChain(proData: unknown) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select","eq","or","in","maybeSingle"]) chain[m] = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(async () => ({ data: proData, error: null }));
  return chain;
}

describe("POST /api/presence/ping", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "pro@example.com" } }, error: null });
    mockPingPresence.mockResolvedValue(undefined);
    // Default: pro ownership verified
    mockAdminFrom.mockReturnValue(makeProChain({ id: 1 }));
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq());
    expect(res.status).toBe(429);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new Request("http://localhost/api/presence/ping", {
      method: "POST",
      body: "not-json",
      headers: { "content-type": "application/json" },
    }) as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 for missing kind", async () => {
    const res = await POST(makeReq({ id: 1 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid id (non-positive)", async () => {
    const res = await POST(makeReq({ kind: "professional", id: 0 }));
    expect(res.status).toBe(400);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 404 when pro not found or not owned", async () => {
    mockAdminFrom.mockReturnValue(makeProChain(null));
    const res = await POST(makeReq());
    expect(res.status).toBe(404);
  });

  it("returns 200 on successful ping for professional", async () => {
    const res = await POST(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
