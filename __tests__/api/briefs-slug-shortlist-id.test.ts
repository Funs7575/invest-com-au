import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsAllowed = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => true);
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: vi.fn(() => "test-ip"),
}));

const mockGetUser = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => ({ data: { user: { id: "u1", email: "consumer@test.com" } }, error: null }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

const { mockRemoveFromShortlist, mockUpdateNote, ShortlistErrorClass } = vi.hoisted(() => {
  const mockRemoveFromShortlist = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => {});
  const mockUpdateNote = vi.fn<(...args: unknown[]) => Promise<unknown>>(async () => {});
  class ShortlistErrorClass extends Error {
    code: string;
    constructor(msg: string, code = "error") {
      super(msg);
      this.code = code;
    }
  }
  return { mockRemoveFromShortlist, mockUpdateNote, ShortlistErrorClass };
});

vi.mock("@/lib/brief-shortlist", () => ({
  removeFromShortlist: (...args: unknown[]) => mockRemoveFromShortlist(...args),
  updateNote: (...args: unknown[]) => mockUpdateNote(...args),
  ShortlistError: ShortlistErrorClass,
}));

import { DELETE, PATCH } from "@/app/api/briefs/[slug]/shortlist/[id]/route";

function makeReq(method: string, body?: unknown): NextRequest {
  return new Request("http://localhost/api/briefs/x/shortlist/1", {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } } : {}),
  }) as unknown as NextRequest;
}

function makeCtx(slug = "x", id = "1") {
  return { params: Promise.resolve({ slug, id }) } as { params: Promise<{ slug: string; id: string }> };
}

describe("/api/briefs/[slug]/shortlist/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "consumer@test.com" } }, error: null });
    mockRemoveFromShortlist.mockResolvedValue(undefined);
    mockUpdateNote.mockResolvedValue(undefined);
  });

  // DELETE tests
  it("DELETE returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await DELETE(makeReq("DELETE"), makeCtx());
    expect(res.status).toBe(429);
  });

  it("DELETE returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await DELETE(makeReq("DELETE"), makeCtx());
    expect(res.status).toBe(401);
  });

  it("DELETE returns 200 on success", async () => {
    const res = await DELETE(makeReq("DELETE"), makeCtx());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("DELETE returns 404 when not found", async () => {
    mockRemoveFromShortlist.mockRejectedValue(new ShortlistErrorClass("not found", "not_found"));
    const res = await DELETE(makeReq("DELETE"), makeCtx());
    expect(res.status).toBe(404);
  });

  it("DELETE returns 403 when not owner", async () => {
    mockRemoveFromShortlist.mockRejectedValue(new ShortlistErrorClass("forbidden", "forbidden"));
    const res = await DELETE(makeReq("DELETE"), makeCtx());
    expect(res.status).toBe(403);
  });

  // PATCH tests
  it("PATCH returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await PATCH(makeReq("PATCH", { note: "great" }), makeCtx());
    expect(res.status).toBe(429);
  });

  it("PATCH returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await PATCH(makeReq("PATCH", { note: "great" }), makeCtx());
    expect(res.status).toBe(401);
  });

  it("PATCH returns 400 when body invalid JSON", async () => {
    const req = new Request("http://localhost/api/briefs/x/shortlist/1", { method: "PATCH" }) as unknown as NextRequest;
    const res = await PATCH(req, makeCtx());
    expect(res.status).toBe(400);
  });

  it("PATCH returns 400 when note field too long", async () => {
    const res = await PATCH(makeReq("PATCH", { note: "x".repeat(1001) }), makeCtx());
    expect(res.status).toBe(400);
  });

  it("PATCH returns 200 on success", async () => {
    const res = await PATCH(makeReq("PATCH", { note: "Great option" }), makeCtx());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });
});
