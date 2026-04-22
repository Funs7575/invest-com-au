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

const mockGetUser = vi.fn<() => Promise<{ data: { user: { id: string } | null } }>>();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

const isAllowedMock = vi.fn<() => Promise<boolean>>();

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: () => isAllowedMock(),
  ipKey: () => "test-ip",
}));

const listBookmarksMock = vi.fn();
const addBookmarkMock = vi.fn();
const removeBookmarkMock = vi.fn();
const addAnonymousSaveMock = vi.fn();

vi.mock("@/lib/bookmarks", () => ({
  listBookmarks: (...a: unknown[]) => listBookmarksMock(...a),
  addBookmark: (...a: unknown[]) => addBookmarkMock(...a),
  removeBookmark: (...a: unknown[]) => removeBookmarkMock(...a),
  addAnonymousSave: (...a: unknown[]) => addAnonymousSaveMock(...a),
}));

import { GET, POST, DELETE } from "@/app/api/account/bookmarks/route";

function jsonRequest(
  method: "GET" | "POST" | "DELETE",
  body?: Record<string, unknown>,
): NextRequest {
  return new NextRequest("http://localhost/api/account/bookmarks", {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
  });
}

describe("/api/account/bookmarks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAllowedMock.mockResolvedValue(true);
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe("GET", () => {
    it("returns 401 when unauthenticated", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });
      const res = await GET();
      expect(res.status).toBe(401);
    });

    it("returns items for the authenticated user", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
      listBookmarksMock.mockResolvedValueOnce([{ id: 1 }, { id: 2 }]);
      const res = await GET();
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.items).toEqual([{ id: 1 }, { id: 2 }]);
      expect(listBookmarksMock).toHaveBeenCalledWith("u1");
    });
  });

  describe("POST", () => {
    it("returns 429 when rate-limited", async () => {
      isAllowedMock.mockResolvedValueOnce(false);
      const res = await POST(
        jsonRequest("POST", { type: "broker", ref: "stake" }),
      );
      expect(res.status).toBe(429);
      expect(addBookmarkMock).not.toHaveBeenCalled();
    });

    it("returns 400 on invalid type", async () => {
      const res = await POST(
        jsonRequest("POST", { type: "random_thing", ref: "stake" }),
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 on missing ref", async () => {
      const res = await POST(jsonRequest("POST", { type: "broker" }));
      expect(res.status).toBe(400);
    });

    it("returns 400 on unparseable body (defaults to empty object then fails validation)", async () => {
      const req = new NextRequest("http://localhost/api/account/bookmarks", {
        method: "POST",
        body: "not json",
        headers: { "Content-Type": "application/json" },
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("writes a bookmark for an authenticated user", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
      addBookmarkMock.mockResolvedValueOnce(true);
      const res = await POST(
        jsonRequest("POST", {
          type: "article",
          ref: "best-brokers-2026",
          label: "Best brokers",
          note: "nice summary",
        }),
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(addBookmarkMock).toHaveBeenCalledWith({
        userId: "u1",
        type: "article",
        ref: "best-brokers-2026",
        label: "Best brokers",
        note: "nice summary",
      });
    });

    it("requires session_id for an anonymous save", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });
      const res = await POST(
        jsonRequest("POST", { type: "broker", ref: "stake" }),
      );
      expect(res.status).toBe(400);
      expect(addAnonymousSaveMock).not.toHaveBeenCalled();
    });

    it("persists an anonymous save when session_id is provided", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });
      addAnonymousSaveMock.mockResolvedValueOnce(true);
      const res = await POST(
        jsonRequest("POST", {
          type: "broker",
          ref: "stake",
          session_id: "anon-abc",
        }),
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toEqual({ ok: true, anonymous: true });
      expect(addAnonymousSaveMock).toHaveBeenCalledWith({
        sessionId: "anon-abc",
        type: "broker",
        ref: "stake",
        label: null,
      });
    });

    it("truncates oversized ref/label/note before forwarding", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
      addBookmarkMock.mockResolvedValueOnce(true);
      await POST(
        jsonRequest("POST", {
          type: "scenario",
          ref: "r".repeat(500),
          label: "l".repeat(500),
          note: "n".repeat(5000),
        }),
      );
      const call = addBookmarkMock.mock.calls[0]?.[0] as {
        ref: string;
        label: string;
        note: string;
      };
      expect(call.ref.length).toBeLessThanOrEqual(200);
      expect(call.label.length).toBeLessThanOrEqual(200);
      expect(call.note.length).toBeLessThanOrEqual(2000);
    });
  });

  describe("DELETE", () => {
    it("returns 401 when unauthenticated", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null } });
      const res = await DELETE(
        jsonRequest("DELETE", { type: "broker", ref: "stake" }),
      );
      expect(res.status).toBe(401);
    });

    it("returns 400 on invalid type", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
      const res = await DELETE(
        jsonRequest("DELETE", { type: "nope", ref: "stake" }),
      );
      expect(res.status).toBe(400);
    });

    it("returns 400 on missing ref", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
      const res = await DELETE(jsonRequest("DELETE", { type: "broker" }));
      expect(res.status).toBe(400);
    });

    it("removes the bookmark for an authenticated user", async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: { id: "u1" } } });
      removeBookmarkMock.mockResolvedValueOnce(true);
      const res = await DELETE(
        jsonRequest("DELETE", { type: "broker", ref: "stake" }),
      );
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.ok).toBe(true);
      expect(removeBookmarkMock).toHaveBeenCalledWith({
        userId: "u1",
        type: "broker",
        ref: "stake",
      });
    });
  });
});
