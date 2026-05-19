import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const { mockGetUser, mockEq } = vi.hoisted(() => ({
  mockGetUser: vi.fn<() => Promise<{ data: { user: { id: string } | null } }>>(),
  mockEq: vi.fn<() => Promise<{ error: { message: string } | null }>>(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: vi.fn(() => ({ delete: vi.fn(() => ({ eq: mockEq })) })),
  })),
}));

import { DELETE } from "@/app/api/account/sharesight/disconnect/route";

function makeReq() {
  return new NextRequest("http://localhost/api/account/sharesight/disconnect", {
    method: "DELETE",
  });
}

describe("DELETE /api/account/sharesight/disconnect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await DELETE(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns { ok: true } on successful delete", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockEq.mockResolvedValue({ error: null });
    const res = await DELETE(makeReq());
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("500s on supabase error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockEq.mockResolvedValue({ error: { message: "boom" } });
    const res = await DELETE(makeReq());
    expect(res.status).toBe(500);
  });
});
