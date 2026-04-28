import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockServerFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: () => mockGetUser() },
    from: (...args: unknown[]) => mockServerFrom(...args),
  }),
}));

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/admin", () => ({
  ADMIN_EMAILS: ["admin@invest.com.au"],
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { POST } from "@/app/api/community/moderate/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const ADMIN_USER = { id: "admin-1", email: "admin@invest.com.au" };
const REGULAR_USER = { id: "user-1", email: "user@example.com" };

function makeRequest(body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/community/moderate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function makeUpdateBuilder(data: unknown = { id: 1, title: "Test", is_pinned: true, is_locked: false, is_removed: false, updated_at: "now" }, error: unknown = null) {
  return {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn(() => Promise.resolve({ data, error })),
  };
}

function makeModeratorBuilder(isModerator: boolean) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn(() => Promise.resolve({ data: { is_moderator: isModerator }, error: null })),
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/community/moderate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeRequest({ action: "pin", thread_id: 1 }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not a moderator", async () => {
    mockGetUser.mockResolvedValue({ data: { user: REGULAR_USER }, error: null });
    mockAdminFrom.mockReturnValue(makeModeratorBuilder(false));
    const res = await POST(makeRequest({ action: "pin", thread_id: 1 }));
    expect(res.status).toBe(403);
  });

  it("allows admin email user without DB moderator check returning true", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    mockAdminFrom.mockReturnValue(makeUpdateBuilder());
    const res = await POST(makeRequest({ action: "pin", thread_id: 1 }));
    expect(res.status).toBe(200);
  });

  it("returns 400 when action is invalid", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    const res = await POST(makeRequest({ action: "ban", thread_id: 1 }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/action/i);
  });

  it("returns 400 when pin action missing thread_id", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    const res = await POST(makeRequest({ action: "pin" }));
    expect(res.status).toBe(400);
  });

  it("returns 200 with thread on pin success", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    mockAdminFrom.mockReturnValue(makeUpdateBuilder({ id: 1, title: "Thread", is_pinned: true, is_locked: false, is_removed: false, updated_at: "now" }));
    const res = await POST(makeRequest({ action: "pin", thread_id: 1 }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.thread).toBeDefined();
    expect(data.thread.is_pinned).toBe(true);
  });

  it("returns 404 when thread update fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    mockAdminFrom.mockReturnValue(makeUpdateBuilder(null, { message: "not found" }));
    const res = await POST(makeRequest({ action: "lock", thread_id: 999 }));
    expect(res.status).toBe(404);
  });

  it("returns 400 when remove action has no thread_id or post_id", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    const res = await POST(makeRequest({ action: "remove" }));
    expect(res.status).toBe(400);
  });

  it("returns 200 with post on remove post success", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    mockAdminFrom.mockReturnValue(makeUpdateBuilder({ id: 5, is_removed: true, updated_at: "now" }));
    const res = await POST(makeRequest({ action: "remove", post_id: 5 }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.post).toBeDefined();
  });

  it("returns 400 on invalid JSON body", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    const req = new NextRequest("http://localhost/api/community/moderate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
