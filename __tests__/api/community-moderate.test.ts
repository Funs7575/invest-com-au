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

const mockIsAllowed = vi.fn();
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: vi.fn(() => "ip:test"),
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

// Dispatches admin .from() for the report path: the target lookup
// (forum_posts/forum_threads) returns `target`; forum_reports.upsert resolves.
function makeReportAdminFrom(opts: {
  target?: { id: number; author_id: string; is_removed: boolean } | null;
  upsertError?: unknown;
}) {
  const target =
    opts.target === undefined
      ? { id: 5, author_id: "someone-else", is_removed: false }
      : opts.target;
  return (table: string) => {
    if (table === "forum_reports") {
      return { upsert: vi.fn(() => Promise.resolve({ error: opts.upsertError ?? null })) };
    }
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn(() => Promise.resolve({ data: target, error: null })),
    };
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/community/moderate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
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

  // ── Report action (P1-4) — any authenticated, non-author user ──
  describe("report action", () => {
    it("records a report from a non-moderator, non-author user (201)", async () => {
      mockGetUser.mockResolvedValue({ data: { user: REGULAR_USER }, error: null });
      mockAdminFrom.mockImplementation(
        makeReportAdminFrom({ target: { id: 5, author_id: "someone-else", is_removed: false } }),
      );
      const res = await POST(makeRequest({ action: "report", target_type: "post", target_id: 5 }));
      expect(res.status).toBe(201);
      const data = await res.json();
      expect(data.ok).toBe(true);
    });

    it("returns 400 when reporting your own content", async () => {
      mockGetUser.mockResolvedValue({ data: { user: REGULAR_USER }, error: null });
      mockAdminFrom.mockImplementation(
        makeReportAdminFrom({ target: { id: 5, author_id: REGULAR_USER.id, is_removed: false } }),
      );
      const res = await POST(makeRequest({ action: "report", target_type: "post", target_id: 5 }));
      expect(res.status).toBe(400);
    });

    it("returns 400 when target_type/target_id are missing", async () => {
      mockGetUser.mockResolvedValue({ data: { user: REGULAR_USER }, error: null });
      const res = await POST(makeRequest({ action: "report" }));
      expect(res.status).toBe(400);
    });

    it("returns 429 when the user is reporting too often", async () => {
      mockGetUser.mockResolvedValue({ data: { user: REGULAR_USER }, error: null });
      mockIsAllowed.mockResolvedValueOnce(false);
      const res = await POST(makeRequest({ action: "report", target_type: "post", target_id: 5 }));
      expect(res.status).toBe(429);
    });

    it("returns 404 when the reported target doesn't exist", async () => {
      mockGetUser.mockResolvedValue({ data: { user: REGULAR_USER }, error: null });
      mockAdminFrom.mockImplementation(makeReportAdminFrom({ target: null }));
      const res = await POST(makeRequest({ action: "report", target_type: "post", target_id: 999 }));
      expect(res.status).toBe(404);
    });
  });
});
