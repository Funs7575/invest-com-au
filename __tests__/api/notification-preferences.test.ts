import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ warn: vi.fn(), error: vi.fn() })),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { GET, POST } from "@/app/api/notification-preferences/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const USER = { id: "user-abc", email: "alice@example.com" };

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/notification-preferences", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * Chain that supports:
 *  - .select().eq().maybeSingle() → GET read path
 *  - .upsert().select().single()  → POST write path
 */
function makeChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "upsert", "eq"]) {
    c[m] = vi.fn(() => c);
  }
  c.maybeSingle = vi.fn(() => Promise.resolve(result));
  c.single = vi.fn(() => Promise.resolve(result));
  return c;
}

const DEFAULT_PREFS = {
  fee_alerts: true,
  weekly_digest: true,
  deal_alerts: true,
  campaign_updates: true,
  marketing: false,
};

// ── GET tests ─────────────────────────────────────────────────────────────────

describe("GET /api/notification-preferences", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("Session expired") });
  });

  it("returns 500 when DB query errors", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: "DB failure" } }));
    const res = await GET();
    expect(res.status).toBe(500);
  });

  it("returns default preferences when no row exists for the user", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const res = await GET();
    expect(res.status).toBe(200);
    const { preferences } = await res.json();
    expect(preferences).toMatchObject(DEFAULT_PREFS);
  });

  it("returns stored preferences when a row exists", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const stored = {
      fee_alerts: false,
      weekly_digest: true,
      deal_alerts: false,
      campaign_updates: true,
      marketing: true,
    };
    mockFrom.mockReturnValue(makeChain({ data: stored, error: null }));
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).preferences).toMatchObject(stored);
  });
});

// ── POST tests ────────────────────────────────────────────────────────────────

describe("POST /api/notification-preferences", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(makePost({ fee_alerts: true }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for malformed JSON body", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const req = new NextRequest("http://localhost/api/notification-preferences", {
      method: "POST",
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when no recognised preference keys are supplied", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const res = await POST(makePost({ unknown_pref: true, another_unknown: false }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when a known key has a non-boolean value", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    // "yes" is a string, not a boolean — should be rejected
    const res = await POST(makePost({ fee_alerts: "yes" }));
    expect(res.status).toBe(400);
  });

  it("returns 500 on DB upsert error", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValue(makeChain({ data: null, error: { message: "upsert fail" } }));
    const res = await POST(makePost({ fee_alerts: true }));
    expect(res.status).toBe(500);
  });

  it("returns 200 { preferences } with updated values on success", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const updated = {
      fee_alerts: true,
      weekly_digest: false,
      deal_alerts: true,
      campaign_updates: true,
      marketing: false,
    };
    mockFrom.mockReturnValue(makeChain({ data: updated, error: null }));
    const res = await POST(makePost({ fee_alerts: true, weekly_digest: false }));
    expect(res.status).toBe(200);
    expect((await res.json()).preferences).toMatchObject(updated);
  });

  it("scopes the upsert to the authenticated user_id", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const chain = makeChain({ data: { ...DEFAULT_PREFS }, error: null });
    mockFrom.mockReturnValue(chain);
    await POST(makePost({ marketing: true }));
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ user_id: USER.id }),
      expect.anything()
    );
  });
});
