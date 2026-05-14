/**
 * Tests for the bell-dropdown notification routes (C1 / mm06):
 *   GET  /api/notifications          → unread_count + recent[]
 *   POST /api/notifications/[id]/read     → idempotent single mark-read
 *   POST /api/notifications/read-all      → mark-all-read
 *
 * The bell polls these every 60s so they need to be cheap and well-
 * scoped (auth + rate-limit + correct column-name mapping).
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetUser, mockIsAllowed, mockMarkRead, mockMarkAllRead, mockAdminFrom } =
  vi.hoisted(() => ({
    mockGetUser: vi.fn(),
    mockIsAllowed: vi.fn(),
    mockMarkRead: vi.fn(),
    mockMarkAllRead: vi.fn(),
    mockAdminFrom: vi.fn(),
  }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: () => "test-ip",
}));

vi.mock("@/lib/notifications", () => ({
  markRead: (...args: unknown[]) => mockMarkRead(...args),
  markAllRead: (...args: unknown[]) => mockMarkAllRead(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { GET } from "@/app/api/notifications/route";
import { POST as ReadOne } from "@/app/api/notifications/[id]/read/route";
import { POST as ReadAll } from "@/app/api/notifications/read-all/route";

const USER = { id: "user-uuid-1", email: "alice@example.com" };

function makeReq(method: "GET" | "POST"): NextRequest {
  return new NextRequest("http://localhost/api/notifications", { method });
}

/**
 * Thenable chain mirroring Supabase's QueryBuilder. Resolves to the
 * staged result on await. Tracks calls so assertions can inspect them.
 */
function makeChain(result: { data?: unknown; count?: number; error: unknown }) {
  const c: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ["select", "eq", "is", "order", "limit"]) {
    c[m] = vi.fn(() => c);
  }
  c.then = vi.fn((resolve: (v: unknown) => void) => {
    resolve(result);
    return Promise.resolve(result);
  });
  return c;
}

beforeEach(() => {
  mockGetUser.mockReset();
  mockIsAllowed.mockReset();
  mockMarkRead.mockReset();
  mockMarkAllRead.mockReset();
  mockAdminFrom.mockReset();
});

describe("GET /api/notifications", () => {
  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    mockIsAllowed.mockResolvedValueOnce(true);
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(401);
  });

  it("returns unread_count + recent[] with spec column names mapped", async () => {
    mockIsAllowed.mockResolvedValueOnce(true);
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });

    const countChain = makeChain({ count: 3, error: null });
    const rowsChain = makeChain({
      data: [
        {
          id: 10,
          type: "brief_accepted",
          title: "Pro accepted",
          body: "Re: foo",
          link_url: "/briefs/foo",
          read_at: null,
          created_at: "2026-05-14T00:00:00Z",
        },
        {
          id: 11,
          type: "topup_succeeded",
          title: "Topped up",
          body: null,
          link_url: null,
          read_at: "2026-05-14T01:00:00Z",
          created_at: "2026-05-14T00:30:00Z",
        },
      ],
      error: null,
    });
    // GET handler issues two .from() calls — first for the count head
    // query, second for the recent rows. Order matters here.
    mockAdminFrom.mockReturnValueOnce(countChain).mockReturnValueOnce(rowsChain);

    const res = await GET(makeReq("GET"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      unread_count: number;
      recent: Array<{ kind: string; href: string | null }>;
    };
    expect(json.unread_count).toBe(3);
    expect(json.recent).toHaveLength(2);
    expect(json.recent[0]?.kind).toBe("brief_accepted");
    expect(json.recent[0]?.href).toBe("/briefs/foo");
    expect(json.recent[1]?.kind).toBe("topup_succeeded");
    expect(json.recent[1]?.href).toBeNull();
  });

  it("requests rows ordered DESC by created_at and limited to 20", async () => {
    mockIsAllowed.mockResolvedValueOnce(true);
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const countChain = makeChain({ count: 0, error: null });
    const rowsChain = makeChain({ data: [], error: null });
    mockAdminFrom.mockReturnValueOnce(countChain).mockReturnValueOnce(rowsChain);
    await GET(makeReq("GET"));
    expect(rowsChain.order).toHaveBeenCalledWith("created_at", {
      ascending: false,
    });
    expect(rowsChain.limit).toHaveBeenCalledWith(20);
    // Both chains scoped to the calling user.
    expect(countChain.eq).toHaveBeenCalledWith("user_id", USER.id);
    expect(rowsChain.eq).toHaveBeenCalledWith("user_id", USER.id);
  });
});

describe("POST /api/notifications/[id]/read", () => {
  it("returns 401 when unauthenticated", async () => {
    mockIsAllowed.mockResolvedValueOnce(true);
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await ReadOne(makeReq("POST"), {
      params: Promise.resolve({ id: "5" }),
    });
    expect(res.status).toBe(401);
  });

  it("rejects non-numeric ids", async () => {
    mockIsAllowed.mockResolvedValueOnce(true);
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const res = await ReadOne(makeReq("POST"), {
      params: Promise.resolve({ id: "not-a-number" }),
    });
    expect(res.status).toBe(400);
  });

  it("delegates to markRead scoped to (user.id, id) and is idempotent", async () => {
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: USER } });
    mockMarkRead.mockResolvedValue(undefined);
    const r1 = await ReadOne(makeReq("POST"), {
      params: Promise.resolve({ id: "5" }),
    });
    const r2 = await ReadOne(makeReq("POST"), {
      params: Promise.resolve({ id: "5" }),
    });
    expect(r1.status).toBe(200);
    expect(r2.status).toBe(200);
    expect(mockMarkRead).toHaveBeenCalledTimes(2);
    expect(mockMarkRead.mock.calls[0]).toEqual([USER.id, 5]);
    expect(mockMarkRead.mock.calls[1]).toEqual([USER.id, 5]);
  });
});

describe("POST /api/notifications/read-all", () => {
  it("delegates to markAllRead for the calling user", async () => {
    mockIsAllowed.mockResolvedValueOnce(true);
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockMarkAllRead.mockResolvedValueOnce(undefined);
    const res = await ReadAll(makeReq("POST"));
    expect(res.status).toBe(200);
    expect(mockMarkAllRead).toHaveBeenCalledWith(USER.id);
  });
});
