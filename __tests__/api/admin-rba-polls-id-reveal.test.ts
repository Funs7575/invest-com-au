import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

const mockGetUser = vi.fn(
  async (): Promise<{ data: { user: { id: string; email?: string } | null }; error: unknown }> => ({
    data: { user: { id: "u1", email: "admin@invest.com.au" } },
    error: null,
  }),
);

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

function makeBuilder(data: unknown = null, error: unknown = null) {
  const c: Record<string, unknown> = {
    then: (r: (v: { data: unknown; error: unknown }) => unknown) =>
      Promise.resolve(r({ data, error })),
  };
  for (const m of [
    "select", "insert", "update", "upsert", "delete", "eq", "neq", "gt", "gte",
    "lt", "lte", "in", "is", "not", "or", "order", "limit", "range", "single",
    "maybeSingle", "filter",
  ]) {
    c[m] = vi.fn(() => c);
  }
  return c;
}

const mockFrom = vi.fn((..._a: unknown[]) => makeBuilder());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { POST } from "@/app/api/admin/rba-polls/[id]/reveal/route";

// The route uses withValidatedBody so the exported POST is the wrapper.
// It extracts the poll id from req.url path segments.
function makeReq(pollId: string, body: unknown): NextRequest {
  return new Request(`http://localhost/api/admin/rba-polls/${pollId}/reveal`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  }) as unknown as NextRequest;
}

// The route reads ADMIN_EMAILS from process.env, not from @/lib/admin.
const ORIGINAL_ENV = process.env.ADMIN_EMAILS;

describe("POST /api/admin/rba-polls/[id]/reveal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ADMIN_EMAILS = "admin@invest.com.au";
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", email: "admin@invest.com.au" } },
      error: null,
    });
    mockFrom.mockImplementation((..._a: unknown[]) =>
      makeBuilder({ id: 1, meeting_date: "2026-06-03", outcome: 0, change_bps: null, decided_at: "2026-06-03T00:00:00Z" }, null),
    );
  });

  afterEach(() => {
    if (ORIGINAL_ENV === undefined) {
      delete process.env.ADMIN_EMAILS;
    } else {
      process.env.ADMIN_EMAILS = ORIGINAL_ENV;
    }
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeReq("1", { outcome: 0 }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("unauthorized");
  });

  it("returns 403 when user email is not in ADMIN_EMAILS", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u2", email: "regular@example.com" } },
      error: null,
    });
    const res = await POST(makeReq("1", { outcome: 0 }));
    expect(res.status).toBe(403);
    const json = await res.json();
    expect(json.error).toBe("forbidden");
  });

  it("returns 400 when body is invalid JSON", async () => {
    const req = new Request("http://localhost/api/admin/rba-polls/1/reveal", {
      method: "POST",
      body: "bad-json{",
      headers: { "content-type": "application/json" },
    }) as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when outcome is not -1, 0, or 1", async () => {
    const res = await POST(makeReq("1", { outcome: 2 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when outcome is missing", async () => {
    const res = await POST(makeReq("1", {}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when poll id is not a valid integer", async () => {
    const res = await POST(makeReq("not-a-number", { outcome: 0 }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid_poll_id");
  });

  it("returns 400 when poll id is zero", async () => {
    const res = await POST(makeReq("0", { outcome: 1 }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe("invalid_poll_id");
  });

  it("reveals a hold outcome (0) and returns poll data", async () => {
    const pollData = { id: 5, meeting_date: "2026-06-03", outcome: 0, change_bps: null, decided_at: "2026-06-03T00:00:00Z" };
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(pollData, null));
    const res = await POST(makeReq("5", { outcome: 0 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.poll.outcome).toBe(0);
  });

  it("reveals a hike outcome (1) with change_bps", async () => {
    const pollData = { id: 3, meeting_date: "2026-06-03", outcome: 1, change_bps: 25, decided_at: "2026-06-03T00:00:00Z" };
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(pollData, null));
    const res = await POST(makeReq("3", { outcome: 1, change_bps: 25 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.poll.change_bps).toBe(25);
  });

  it("reveals a cut outcome (-1) with change_bps", async () => {
    const pollData = { id: 4, meeting_date: "2026-06-03", outcome: -1, change_bps: -25, decided_at: "2026-06-03T00:00:00Z" };
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(pollData, null));
    const res = await POST(makeReq("4", { outcome: -1, change_bps: -25 }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.poll.outcome).toBe(-1);
  });

  it("returns 500 when DB update fails", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, { message: "db failure" }));
    const res = await POST(makeReq("1", { outcome: 0 }));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toBe("update_failed");
  });

  it("returns 404 when poll is not found (null data, no error)", async () => {
    mockFrom.mockImplementation((..._a: unknown[]) => makeBuilder(null, null));
    const res = await POST(makeReq("99", { outcome: 0 }));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toBe("poll_not_found");
  });
});
