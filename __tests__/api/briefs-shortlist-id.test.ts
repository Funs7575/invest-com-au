import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockIsAllowed, mockGetUser, mockRemoveFromShortlist, mockUpdateNote } =
  vi.hoisted(() => ({
    mockIsAllowed: vi.fn(),
    mockGetUser: vi.fn(),
    mockRemoveFromShortlist: vi.fn(),
    mockUpdateNote: vi.fn(),
  }));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: vi.fn(() => "1.2.3.4"),
}));

vi.mock("@/lib/brief-shortlist", async () => {
  const actual = await vi.importActual<typeof import("@/lib/brief-shortlist")>(
    "@/lib/brief-shortlist",
  );
  return {
    ...actual,
    removeFromShortlist: mockRemoveFromShortlist,
    updateNote: mockUpdateNote,
  };
});

import { DELETE, PATCH } from "@/app/api/briefs/[slug]/shortlist/[id]/route";
import { ShortlistError } from "@/lib/brief-shortlist";

const USER = { id: "user-1", email: "owner@example.com" };
const ctx = { params: Promise.resolve({ slug: "b1", id: "55" }) };

function makeReq(method: string, body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/briefs/b1/shortlist/55", {
    method,
    headers: body === undefined ? undefined : { "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockIsAllowed.mockResolvedValue(true);
  mockGetUser.mockResolvedValue({ data: { user: USER } });
});

describe("DELETE /api/briefs/[slug]/shortlist/[id]", () => {
  it("429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await DELETE(makeReq("DELETE"), ctx);
    expect(res.status).toBe(429);
  });

  it("401 when no email", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await DELETE(makeReq("DELETE"), ctx);
    expect(res.status).toBe(401);
  });

  it("happy path removes shortlist item", async () => {
    mockRemoveFromShortlist.mockResolvedValue(undefined);
    const res = await DELETE(makeReq("DELETE"), ctx);
    expect(res.status).toBe(200);
    expect(mockRemoveFromShortlist).toHaveBeenCalledWith(55, USER.email);
  });

  it("404 on not_found ShortlistError", async () => {
    mockRemoveFromShortlist.mockRejectedValue(new ShortlistError("not_found"));
    const res = await DELETE(makeReq("DELETE"), ctx);
    expect(res.status).toBe(404);
  });

  it("403 on not_owner ShortlistError", async () => {
    mockRemoveFromShortlist.mockRejectedValue(new ShortlistError("not_owner"));
    const res = await DELETE(makeReq("DELETE"), ctx);
    expect(res.status).toBe(403);
  });

  it("500 on unexpected error", async () => {
    mockRemoveFromShortlist.mockRejectedValue(new Error("boom"));
    const res = await DELETE(makeReq("DELETE"), ctx);
    expect(res.status).toBe(500);
  });
});

describe("PATCH /api/briefs/[slug]/shortlist/[id]", () => {
  it("429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await PATCH(makeReq("PATCH", { note: "hi" }), ctx);
    expect(res.status).toBe(429);
  });

  it("401 when no email", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await PATCH(makeReq("PATCH", { note: "hi" }), ctx);
    expect(res.status).toBe(401);
  });

  it("400 on invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/briefs/b1/shortlist/55", {
      method: "PATCH",
      body: "{bad",
    });
    const res = await PATCH(req, ctx);
    expect(res.status).toBe(400);
  });

  it("400 on schema rejection (note too long)", async () => {
    const res = await PATCH(makeReq("PATCH", { note: "x".repeat(1001) }), ctx);
    expect(res.status).toBe(400);
  });

  it("happy path updates note", async () => {
    mockUpdateNote.mockResolvedValue(undefined);
    const res = await PATCH(makeReq("PATCH", { note: "updated" }), ctx);
    expect(res.status).toBe(200);
    expect(mockUpdateNote).toHaveBeenCalledWith({
      shortlistId: 55,
      note: "updated",
      ownerEmail: USER.email,
    });
  });

  it("accepts null note", async () => {
    mockUpdateNote.mockResolvedValue(undefined);
    const res = await PATCH(makeReq("PATCH", { note: null }), ctx);
    expect(res.status).toBe(200);
  });

  it("404 on not_found ShortlistError", async () => {
    mockUpdateNote.mockRejectedValue(new ShortlistError("not_found"));
    const res = await PATCH(makeReq("PATCH", { note: "x" }), ctx);
    expect(res.status).toBe(404);
  });

  it("500 on unexpected error", async () => {
    mockUpdateNote.mockRejectedValue(new Error("boom"));
    const res = await PATCH(makeReq("PATCH", { note: "x" }), ctx);
    expect(res.status).toBe(500);
  });
});
