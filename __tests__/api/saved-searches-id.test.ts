import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockGetUser, mockIsAllowed, mockIpKey, mockUpdate, mockRemove } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockIsAllowed: vi.fn(),
  mockIpKey: vi.fn(() => "ip:1.2.3.4"),
  mockUpdate: vi.fn(),
  mockRemove: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: mockIpKey,
}));

vi.mock("@/lib/saved-searches", () => ({
  update: mockUpdate,
  remove: mockRemove,
  EMAIL_FREQUENCIES: ["off", "daily", "weekly"] as const,
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { PATCH, DELETE } from "@/app/api/saved-searches/[id]/route";

const USER = { id: "user-uuid-1", email: "alice@example.com" };

function makeReq(method: string, body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/saved-searches/1", {
    method,
    headers: { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

describe("PATCH /api/saved-searches/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await PATCH(makeReq("PATCH", { label: "x" }), ctx("1"));
    expect(res.status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await PATCH(makeReq("PATCH", { label: "x" }), ctx("1"));
    expect(res.status).toBe(401);
  });

  it("returns 400 for an invalid id", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const res = await PATCH(makeReq("PATCH", { label: "x" }), ctx("abc"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid id" });
  });

  it("returns 400 for invalid JSON", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const req = new NextRequest("http://localhost/api/saved-searches/1", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: "{not json",
    });
    const res = await PATCH(req, ctx("1"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid JSON body" });
  });

  it("returns 400 with validation_error for a bad body", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const res = await PATCH(makeReq("PATCH", { email_frequency: "hourly" }), ctx("1"));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "validation_error" });
  });

  it("returns 404 when the row is missing or not owned", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockUpdate.mockResolvedValueOnce(null);
    const res = await PATCH(makeReq("PATCH", { label: "Renamed" }), ctx("1"));
    expect(res.status).toBe(404);
  });

  it("updates and returns the saved search", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const row = { id: 1, label: "Renamed" };
    mockUpdate.mockResolvedValueOnce(row);
    const res = await PATCH(makeReq("PATCH", { label: "Renamed" }), ctx("1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ saved_search: row });
    expect(mockUpdate).toHaveBeenCalledWith(1, USER.id, { label: "Renamed" });
  });
});

describe("DELETE /api/saved-searches/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await DELETE(makeReq("DELETE"), ctx("1"));
    expect(res.status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await DELETE(makeReq("DELETE"), ctx("1"));
    expect(res.status).toBe(401);
  });

  it("returns 400 for an invalid id", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const res = await DELETE(makeReq("DELETE"), ctx("0"));
    expect(res.status).toBe(400);
  });

  it("returns 500 when remove fails", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockRemove.mockResolvedValueOnce(false);
    const res = await DELETE(makeReq("DELETE"), ctx("3"));
    expect(res.status).toBe(500);
  });

  it("deletes and returns success", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockRemove.mockResolvedValueOnce(true);
    const res = await DELETE(makeReq("DELETE"), ctx("3"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ success: true });
    expect(mockRemove).toHaveBeenCalledWith(3, USER.id);
  });
});
