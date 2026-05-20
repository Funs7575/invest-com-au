/* eslint-disable @typescript-eslint/no-explicit-any -- test ctx/param casts */
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const { mockIsAllowed, mockGetUser, mockUpdate, mockRemove } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(async () => true),
  mockGetUser: vi.fn(async () => ({ data: { user: { id: "u1", email: "user@example.com" } }, error: null })),
  mockUpdate: vi.fn(async () => ({ id: 1, label: "Updated" })),
  mockRemove: vi.fn(async () => true),
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
  update: mockUpdate,
  remove: mockRemove,
  EMAIL_FREQUENCIES: ["off", "daily", "weekly"],
}));

import { PATCH, DELETE } from "@/app/api/saved-searches/[id]/route";

function makePatchReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/saved-searches/1", {
    method: "PATCH",
    body: JSON.stringify(body ?? { label: "Updated Label" }),
    headers: { "content-type": "application/json" },
  }) as unknown as NextRequest;
}

function makeDeleteReq(): NextRequest {
  return new Request("http://localhost/api/saved-searches/1", {
    method: "DELETE",
  }) as unknown as NextRequest;
}

function makeCtx(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("/api/saved-searches/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1", email: "user@example.com" } }, error: null });
    mockUpdate.mockResolvedValue({ id: 1, label: "Updated" });
    mockRemove.mockResolvedValue(true);
  });

  describe("PATCH", () => {
    it("returns 401 when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
      const res = await PATCH(makePatchReq(), makeCtx("1") as any);
      expect(res.status).toBe(401);
    });

    it("returns 429 when rate limited", async () => {
      mockIsAllowed.mockResolvedValue(false);
      const res = await PATCH(makePatchReq(), makeCtx("1") as any);
      expect(res.status).toBe(429);
    });

    it("returns 400 for invalid id", async () => {
      const res = await PATCH(makePatchReq(), makeCtx("abc") as any);
      expect(res.status).toBe(400);
    });

    it("returns 200 with updated saved_search", async () => {
      const res = await PATCH(makePatchReq({ label: "New Label" }), makeCtx("1") as any);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json).toHaveProperty("saved_search");
    });

    it("returns 404 when row not found", async () => {
      mockUpdate.mockResolvedValue(null);
      const res = await PATCH(makePatchReq({ label: "New Label" }), makeCtx("1") as any);
      expect(res.status).toBe(404);
    });

    it("returns 400 for invalid email_frequency", async () => {
      const res = await PATCH(
        makePatchReq({ email_frequency: "invalid_value" }),
        makeCtx("1") as any,
      );
      expect(res.status).toBe(400);
    });
  });

  describe("DELETE", () => {
    it("returns 401 when not authenticated", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
      const res = await DELETE(makeDeleteReq(), makeCtx("1") as any);
      expect(res.status).toBe(401);
    });

    it("returns 429 when rate limited", async () => {
      mockIsAllowed.mockResolvedValue(false);
      const res = await DELETE(makeDeleteReq(), makeCtx("1") as any);
      expect(res.status).toBe(429);
    });

    it("returns 400 for invalid id", async () => {
      const res = await DELETE(makeDeleteReq(), makeCtx("0") as any);
      expect(res.status).toBe(400);
    });

    it("returns 200 on success", async () => {
      const res = await DELETE(makeDeleteReq(), makeCtx("1") as any);
      expect(res.status).toBe(200);
      const json = await res.json();
      expect(json.success).toBe(true);
    });

    it("returns 500 when delete fails", async () => {
      mockRemove.mockResolvedValue(false);
      const res = await DELETE(makeDeleteReq(), makeCtx("1") as any);
      expect(res.status).toBe(500);
    });
  });
});