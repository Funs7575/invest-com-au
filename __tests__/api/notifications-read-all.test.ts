import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  mockIsAllowed,
  mockIpKey,
  mockGetUser,
  mockMarkAllRead,
} = vi.hoisted(() => ({
  mockIsAllowed: vi.fn().mockResolvedValue(true),
  mockIpKey: vi.fn().mockReturnValue("ip:1.2.3.4"),
  mockGetUser: vi.fn().mockResolvedValue({ data: { user: { id: "user-uuid-1" } } }),
  mockMarkAllRead: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...a: unknown[]) => mockIsAllowed(...a),
  ipKey: (req: NextRequest) => mockIpKey(req),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: () => mockGetUser() },
  })),
}));

vi.mock("@/lib/notifications", () => ({
  markAllRead: (...a: unknown[]) => mockMarkAllRead(...a),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

import { POST } from "@/app/api/notifications/read-all/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePost(): NextRequest {
  return new NextRequest("http://localhost/api/notifications/read-all", {
    method: "POST",
    headers: { "x-forwarded-for": "1.2.3.4" },
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/notifications/read-all", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-uuid-1" } } });
    mockMarkAllRead.mockResolvedValue(undefined);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await POST(makePost());
    expect(res.status).toBe(429);
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(makePost());
    expect(res.status).toBe(401);
  });

  it("marks all notifications as read and returns ok", async () => {
    const res = await POST(makePost());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(mockMarkAllRead).toHaveBeenCalledWith("user-uuid-1");
  });

  it("returns 500 when markAllRead throws", async () => {
    mockMarkAllRead.mockRejectedValueOnce(new Error("DB error"));
    const res = await POST(makePost());
    expect(res.status).toBe(500);
  });
});
