import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mock refs ─────────────────────────────────────────────────────────

const { mockIsAllowed, mockGetUser, mockFrom } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn<(...args: unknown[]) => Promise<boolean>>(async () => true),
  mockGetUser: vi.fn<() => Promise<{ data: { user: { id: string } | null } }>>(
    async () => ({ data: { user: { id: "user-uuid-1" } } }),
  ),
  mockFrom: vi.fn(),
}));

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: () => "ip:test",
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

// ── Route under test ──────────────────────────────────────────────────────────

import { POST, GET } from "@/app/api/clubs/[clubId]/messages/route";

// ── Chain builder ─────────────────────────────────────────────────────────────

function makeChain(
  res: { data?: unknown; error?: unknown; count?: number | null } = {},
) {
  const chain: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "delete", "upsert",
    "eq", "neq", "lt", "lte", "gte", "is", "in", "not", "or",
    "order", "limit", "like", "filter",
  ]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.single = vi.fn(async () => ({ data: res.data ?? null, error: res.error ?? null }));
  chain.maybeSingle = vi.fn(async () => ({ data: res.data ?? null, error: res.error ?? null }));
  chain.then = (resolve: (v: unknown) => unknown) =>
    Promise.resolve(
      resolve({ data: res.data ?? null, error: res.error ?? null, count: res.count ?? null }),
    );
  chain.catch = () => chain;
  return chain;
}

// ── Fixtures / helpers ──────────────────────────────────────────────────────────

const CLUB_ID = "club-abc-123";
const PARAMS = { params: Promise.resolve({ clubId: CLUB_ID }) };
const MEMBERSHIP = { id: "member-1", role: "member", display_name: "Ada" };

function postReq(body: unknown = { body: "Hello club" }): NextRequest {
  return new NextRequest(`http://localhost/api/clubs/${CLUB_ID}/messages`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: JSON.stringify(body),
  });
}

function getReq(before?: string): NextRequest {
  const url = new URL(`http://localhost/api/clubs/${CLUB_ID}/messages`);
  if (before) url.searchParams.set("before", before);
  return new NextRequest(url.toString(), {
    method: "GET",
    headers: { "x-forwarded-for": "1.2.3.4" },
  });
}

/** Route default supabase mock: members → membership row, messages → ok. */
function wireSupabase(opts: { membership?: unknown; insertError?: unknown; messages?: unknown } = {}) {
  const membership = "membership" in opts ? opts.membership : MEMBERSHIP;
  mockFrom.mockImplementation((table: string) => {
    if (table === "club_members") return makeChain({ data: membership });
    if (table === "club_messages") {
      return makeChain({ data: opts.messages ?? [], error: opts.insertError ?? null });
    }
    return makeChain();
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockIsAllowed.mockResolvedValue(true);
  mockGetUser.mockResolvedValue({ data: { user: { id: "user-uuid-1" } } });
});

// ── POST tests (the regression: ctx/params must be forwarded by withValidatedBody) ──

describe("POST /api/clubs/[clubId]/messages", () => {
  it("sends a message (200) — reads clubId from the forwarded route context", async () => {
    wireSupabase();
    const res = await POST(postReq(), PARAMS);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("429 when rate-limited", async () => {
    wireSupabase();
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(postReq(), PARAMS);
    expect(res.status).toBe(429);
  });

  it("401 when unauthenticated", async () => {
    wireSupabase();
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(postReq(), PARAMS);
    expect(res.status).toBe(401);
  });

  it("403 when not a club member", async () => {
    wireSupabase({ membership: null });
    const res = await POST(postReq(), PARAMS);
    expect(res.status).toBe(403);
  });

  it("400 on an empty body (Zod min(1))", async () => {
    wireSupabase();
    const res = await POST(postReq({ body: "" }), PARAMS);
    expect(res.status).toBe(400);
  });

  it("400 on invalid JSON", async () => {
    wireSupabase();
    const bad = new NextRequest(`http://localhost/api/clubs/${CLUB_ID}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": "1.2.3.4" },
      body: "{not json",
    });
    const res = await POST(bad, PARAMS);
    expect(res.status).toBe(400);
  });

  it("500 when the insert fails", async () => {
    wireSupabase({ insertError: { message: "db down" } });
    const res = await POST(postReq(), PARAMS);
    expect(res.status).toBe(500);
  });
});

// ── GET tests ───────────────────────────────────────────────────────────────────

describe("GET /api/clubs/[clubId]/messages", () => {
  it("401 when unauthenticated", async () => {
    wireSupabase();
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await GET(getReq(), PARAMS);
    expect(res.status).toBe(401);
  });

  it("403 when not a member", async () => {
    wireSupabase({ membership: null });
    const res = await GET(getReq(), PARAMS);
    expect(res.status).toBe(403);
  });

  it("400 on an invalid before cursor", async () => {
    wireSupabase();
    const res = await GET(getReq("not-a-date"), PARAMS);
    expect(res.status).toBe(400);
  });

  it("200 returns messages for a member", async () => {
    wireSupabase({
      messages: [
        { id: 1, body: "hi", created_at: new Date().toISOString(), club_members: { display_name: "Ada", role: "member" } },
      ],
    });
    const res = await GET(getReq(), PARAMS);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(Array.isArray(json.messages)).toBe(true);
  });
});
