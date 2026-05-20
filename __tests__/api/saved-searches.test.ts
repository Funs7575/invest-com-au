import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const { mockIsAllowed, mockGetUser, mockListForUser, mockCreate } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(async () => true),
  mockGetUser: vi.fn(async () => ({ data: { user: { id: "u1", email: "user@example.com" } }, error: null })),
  mockListForUser: vi.fn(async () => []),
  mockCreate: vi.fn(async () => ({ id: 1, kind: "advisors", label: "My Search" })),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: vi.fn(() => "127.0.0.1"),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(),
  })),
}));

vi.mock("@/lib/saved-searches", () => ({
  create: mockCreate,
  listForUser: mockListForUser,
  SAVED_SEARCH_KINDS: ["advisors", "teams", "invest"],
  EMAIL_FREQUENCIES: ["off", "daily", "weekly"],
}));

vi.mock("@/lib/validation/withValidatedBody", () => ({
  withValidatedBody: vi.fn(
    (_schema: unknown, handler: (req: NextRequest, body: unknown) => unknown) =>
      async (req: NextRequest) => {
        try {
          const raw = await req.json();
          return handler(req, raw);
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
        }
      },
  ),
}));

import { GET, POST } from "@/app/api/saved-searches/route";

function makeGetReq(): NextRequest {
  return new Request("http://localhost/api/saved-searches", {
    method: "GET",
  }) as unknown as NextRequest;
}

function makePostReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/saved-searches", {
    method: "POST",
    body: JSON.stringify(body ?? {}),
    headers: { "content-type": "application/json" },
  }) as unknown as NextRequest;
}

describe("/api/saved-searches", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "user@example.com" } }, error: null });
    mockListForUser.mockResolvedValue([]);
    mockCreate.mockResolvedValue({ id: 1, kind: "advisors", label: "My Search" });
  });

  describe("GET", () => {
    it("returns 401 when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
      const res = await GET(makeGetReq());
      expect(res.status).toBe(401);
    });

    it("returns 429 when rate limited", async () => {
      mockIsAllowed.mockResolvedValue(false);
      const res = await GET(makeGetReq());
      expect(res.status).toBe(429);
    });

    it("returns 200 with saved_searches array", async () => {
      mockListForUser.mockResolvedValue([{ id: 1, label: "Test" }]);
      const res = await GET(makeGetReq());
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("saved_searches");
      expect(Array.isArray(json.saved_searches)).toBe(true);
    });
  });

  describe("POST", () => {
    it("returns 401 when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
      const res = await POST(makePostReq({ kind: "advisors", label: "My Search" }));
      expect(res.status).toBe(401);
    });

    it("returns 200 with saved_search on success", async () => {
      const res = await POST(makePostReq({ kind: "advisors", label: "My Search" }));
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("saved_search");
    });

    it("returns 500 when create fails", async () => {
      mockCreate.mockResolvedValue(null);
      const res = await POST(makePostReq({ kind: "advisors", label: "My Search" }));
      expect(res.status).toBe(500);
    });
  });
});
