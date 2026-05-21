import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { isAllowedMock, ipKeyMock, getUserMock, markReadMock } = vi.hoisted(() => ({
  isAllowedMock: vi.fn(() => Promise.resolve(true)),
  ipKeyMock: vi.fn(() => "ip:1.2.3.4"),
  getUserMock: vi.fn(),
  markReadMock: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));
vi.mock("@/lib/rate-limit-db", () => ({ isAllowed: isAllowedMock, ipKey: ipKeyMock }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: getUserMock } })),
}));
vi.mock("@/lib/notifications", () => ({ markRead: markReadMock }));

import { POST } from "@/app/api/notifications/[id]/read/route";

const USER = { id: "user-uuid-1" };

function req(): NextRequest {
  return new NextRequest("http://localhost/api/notifications/7/read", {
    method: "POST",
    headers: { "x-forwarded-for": "1.2.3.4" },
  });
}
const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

describe("POST /api/notifications/[id]/read", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isAllowedMock.mockResolvedValue(true);
    getUserMock.mockResolvedValue({ data: { user: USER } });
    markReadMock.mockResolvedValue(undefined);
  });

  it("returns 429 when rate-limited", async () => {
    isAllowedMock.mockResolvedValueOnce(false);
    const res = await POST(req(), ctx("7"));
    expect(res.status).toBe(429);
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it("returns 401 when unauthenticated", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(req(), ctx("7"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Unauthorized" });
    expect(markReadMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-numeric id", async () => {
    const res = await POST(req(), ctx("abc"));
    expect(res.status).toBe(400);
    expect(markReadMock).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-positive id", async () => {
    const res = await POST(req(), ctx("0"));
    expect(res.status).toBe(400);
  });

  it("marks the notification read scoped to the user", async () => {
    const res = await POST(req(), ctx("7"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(markReadMock).toHaveBeenCalledWith(USER.id, 7);
  });

  it("returns 500 when markRead throws", async () => {
    markReadMock.mockRejectedValueOnce(new Error("db down"));
    const res = await POST(req(), ctx("7"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "internal" });
  });
});
