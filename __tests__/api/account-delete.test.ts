import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

const mockGetUser = vi.fn();

let upsertRow: { id: number; scheduled_purge_at: string } | null = {
  id: 42,
  scheduled_purge_at: "2026-05-23T00:00:00Z",
};
let upsertError: { message: string } | null = null;
let updateError: { message: string } | null = null;

const upsertCalls: Record<string, unknown>[] = [];
const updateCalls: { payload: Record<string, unknown>; filters: { col: string; val: unknown }[] }[] =
  [];

const mockFrom = vi.fn(() => ({
  upsert: (row: Record<string, unknown>) => ({
    select: () => ({
      single: async () => {
        upsertCalls.push(row);
        if (upsertError) return { data: null, error: upsertError };
        return { data: upsertRow, error: null };
      },
    }),
  }),
  update: (payload: Record<string, unknown>) => {
    const chain: Record<string, unknown> & {
      filters: { col: string; val: unknown }[];
    } = { filters: [] };
    chain.eq = (col: string, val: unknown) => {
      (chain.filters as { col: string; val: unknown }[]).push({ col, val });
      return chain;
    };
    chain.then = (cb: (v: { data: null; error: { message: string } | null }) => void) => {
      updateCalls.push({
        payload,
        filters: chain.filters as { col: string; val: unknown }[],
      });
      cb({ data: null, error: updateError });
      return Promise.resolve();
    };
    return chain;
  },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

import { POST, DELETE } from "@/app/api/account/delete/route";

function makeReq(
  method: "POST" | "DELETE",
  body?: Record<string, unknown>,
): NextRequest {
  return new NextRequest("http://localhost/api/account/delete", {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "1.2.3.4, 10.0.0.1",
      "user-agent": "Mozilla/5.0 Test",
    },
  });
}

// ─── Tests ───────────────────────────────────────────────────────────

describe("/api/account/delete", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    upsertRow = { id: 42, scheduled_purge_at: "2026-05-23T00:00:00Z" };
    upsertError = null;
    updateError = null;
    upsertCalls.length = 0;
    updateCalls.length = 0;
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe("POST (schedule deletion)", () => {
    it("returns 401 when unauthenticated", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });
      const res = await POST(makeReq("POST", {}));
      expect(res.status).toBe(401);
      expect(upsertCalls).toHaveLength(0);
    });

    it("schedules deletion for the authenticated user and returns the purge date", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "u1", email: "u@x.com" } },
      });
      const res = await POST(makeReq("POST", { reason: "No longer needed" }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toMatchObject({
        ok: true,
        request_id: 42,
        scheduled_purge_at: "2026-05-23T00:00:00Z",
        grace_period_days: 30,
      });
      // Upsert payload shape
      expect(upsertCalls[0]).toMatchObject({
        user_id: "u1",
        email: "u@x.com",
        reason: "No longer needed",
        status: "scheduled",
        cancelled_at: null,
      });
      // Only the first IP of x-forwarded-for is kept, user-agent captured
      expect(upsertCalls[0]?.ip_address).toBe("1.2.3.4");
      expect(upsertCalls[0]?.user_agent).toBe("Mozilla/5.0 Test");
    });

    it("handles missing email on the user (falls back to empty string)", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "u1" } }, // no email on user
      });
      const res = await POST(makeReq("POST", {}));
      expect(res.status).toBe(200);
      expect(upsertCalls[0]?.email).toBe("");
    });

    it("truncates oversized reason to 1000 chars", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "u1", email: "u@x.com" } },
      });
      const longReason = "x".repeat(5000);
      await POST(makeReq("POST", { reason: longReason }));
      expect((upsertCalls[0]?.reason as string).length).toBeLessThanOrEqual(1000);
    });

    it("ignores non-string reason", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "u1", email: "u@x.com" } },
      });
      await POST(
        makeReq("POST", { reason: { nested: "obj" } as unknown as string }),
      );
      expect(upsertCalls[0]?.reason).toBeNull();
    });

    it("returns 500 if upsert errors", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "u1", email: "u@x.com" } },
      });
      upsertError = { message: "constraint violation" };
      upsertRow = null;
      const res = await POST(makeReq("POST", {}));
      expect(res.status).toBe(500);
    });

    it("tolerates invalid JSON body (treats reason as absent)", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "u1", email: "u@x.com" } },
      });
      const req = new NextRequest("http://localhost/api/account/delete", {
        method: "POST",
        body: "not json",
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);
      expect(res.status).toBe(200);
      expect(upsertCalls[0]?.reason).toBeNull();
    });
  });

  describe("DELETE (cancel scheduled deletion)", () => {
    it("returns 401 when unauthenticated", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });
      const res = await DELETE(makeReq("DELETE"));
      expect(res.status).toBe(401);
      expect(updateCalls).toHaveLength(0);
    });

    it("sets status=cancelled only on user's scheduled row", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "u1", email: "u@x.com" } },
      });
      const res = await DELETE(makeReq("DELETE"));
      expect(res.status).toBe(200);
      expect(updateCalls).toHaveLength(1);
      expect(updateCalls[0]?.payload.status).toBe("cancelled");
      expect(updateCalls[0]?.payload.cancelled_at).toEqual(expect.any(String));
      // Scoped to user + scheduled status (can't cancel someone else's)
      expect(updateCalls[0]?.filters).toContainEqual({
        col: "user_id",
        val: "u1",
      });
      expect(updateCalls[0]?.filters).toContainEqual({
        col: "status",
        val: "scheduled",
      });
    });

    it("returns 500 if the update errors", async () => {
      mockGetUser.mockResolvedValueOnce({
        data: { user: { id: "u1", email: "u@x.com" } },
      });
      updateError = { message: "RLS violation" };
      const res = await DELETE(makeReq("DELETE"));
      expect(res.status).toBe(500);
    });
  });
});
