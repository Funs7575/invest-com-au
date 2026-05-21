import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockIsAllowed, mockGetUser, mockAddToShortlist } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(),
  mockGetUser: vi.fn(),
  mockAddToShortlist: vi.fn(),
}));

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: vi.fn(() => "1.2.3.4"),
}));

vi.mock("@/lib/brief-shortlist", async () => {
  const actual = await vi.importActual<typeof import("@/lib/brief-shortlist")>(
    "@/lib/brief-shortlist",
  );
  return { ...actual, addToShortlist: mockAddToShortlist };
});

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { POST } from "@/app/api/briefs/[slug]/shortlist/route";
import { ShortlistError } from "@/lib/brief-shortlist";

const USER = { id: "user-1", email: "owner@example.com" };
const VALID = { provider_kind: "professional", provider_id: 7, note: "great" };

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/briefs/b1/shortlist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}
const ctx = { params: Promise.resolve({ slug: "b1" }) };

function makeBriefChain(result: { data: unknown }) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "maybeSingle"]) chain[m] = vi.fn(() => chain);
  (chain as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
    resolve(result);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockIsAllowed.mockResolvedValue(true);
  mockGetUser.mockResolvedValue({ data: { user: USER } });
});

describe("POST /api/briefs/[slug]/shortlist", () => {
  it("429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq(VALID), ctx);
    expect(res.status).toBe(429);
  });

  it("400 on invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/briefs/b1/shortlist", {
      method: "POST",
      body: "not-json",
    });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
  });

  it("400 on schema rejection", async () => {
    const res = await POST(makeReq({ provider_kind: "alien", provider_id: -1 }), ctx);
    expect(res.status).toBe(400);
  });

  it("401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makeReq(VALID), ctx);
    expect(res.status).toBe(401);
  });

  it("404 when brief not found", async () => {
    mockFrom.mockReturnValue(makeBriefChain({ data: null }));
    const res = await POST(makeReq(VALID), ctx);
    expect(res.status).toBe(404);
  });

  it("403 when caller does not own the brief", async () => {
    mockFrom.mockReturnValue(
      makeBriefChain({ data: { id: 1, contact_email: "other@example.com" } }),
    );
    const res = await POST(makeReq(VALID), ctx);
    expect(res.status).toBe(403);
  });

  it("happy path adds to shortlist", async () => {
    mockFrom.mockReturnValue(
      makeBriefChain({ data: { id: 1, contact_email: USER.email } }),
    );
    mockAddToShortlist.mockResolvedValue({ id: 99 });
    const res = await POST(makeReq(VALID), ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.shortlist).toEqual({ id: 99 });
  });

  it("422 on limit_reached ShortlistError", async () => {
    mockFrom.mockReturnValue(
      makeBriefChain({ data: { id: 1, contact_email: USER.email } }),
    );
    mockAddToShortlist.mockRejectedValue(new ShortlistError("limit_reached"));
    const res = await POST(makeReq(VALID), ctx);
    expect(res.status).toBe(422);
  });

  it("409 on duplicate ShortlistError", async () => {
    mockFrom.mockReturnValue(
      makeBriefChain({ data: { id: 1, contact_email: USER.email } }),
    );
    mockAddToShortlist.mockRejectedValue(new ShortlistError("duplicate"));
    const res = await POST(makeReq(VALID), ctx);
    expect(res.status).toBe(409);
  });

  it("500 on unexpected error", async () => {
    mockFrom.mockReturnValue(
      makeBriefChain({ data: { id: 1, contact_email: USER.email } }),
    );
    mockAddToShortlist.mockRejectedValue(new Error("kaboom"));
    const res = await POST(makeReq(VALID), ctx);
    expect(res.status).toBe(500);
  });
});
