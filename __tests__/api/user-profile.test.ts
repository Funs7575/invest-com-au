import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mock state ────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockFrom = vi.fn();

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  })),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { GET, PUT } from "@/app/api/user-profile/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const USER = { id: "user-uuid-1", email: "alice@example.com" };

const PROFILE = {
  id: USER.id,
  email: USER.email,
  display_name: "Alice",
  investing_experience: "beginner",
  onboarding_completed: false,
};

function makePut(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/user-profile", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Fluent chain for .select().eq().single() / .upsert().select().single()
function makeChain(result: { data: unknown; error: unknown }) {
  const c: Record<string, ReturnType<typeof vi.fn>> = {};
  for (const m of ["select", "eq", "upsert"]) c[m] = vi.fn(() => c);
  c.single = vi.fn(() => Promise.resolve(result));
  c.maybeSingle = vi.fn(() => Promise.resolve(result));
  return c;
}

// ── GET tests ─────────────────────────────────────────────────────────────────

describe("GET /api/user-profile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await GET();
    expect(res.status).toBe(401);
    expect(await res.json()).toMatchObject({
      error: expect.stringContaining("sign in"),
    });
  });

  it("returns { profile } when profile row exists", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValue(makeChain({ data: PROFILE, error: null }));
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ profile: PROFILE });
  });

  it("returns { profile: null } when no profile row exists", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockReturnValue(makeChain({ data: null, error: null }));
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ profile: null });
  });

  it("returns 500 when createClient throws", async () => {
    mockGetUser.mockRejectedValueOnce(new Error("crash"));
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

// ── PUT tests ─────────────────────────────────────────────────────────────────

describe("PUT /api/user-profile", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await PUT(makePut({ display_name: "Bob" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when body is malformed JSON", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const req = new NextRequest("http://localhost/api/user-profile", {
      method: "PUT",
      body: "bad-json",
    });
    const res = await PUT(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when no allowed fields are present", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const res = await PUT(makePut({ unknown_field: "value" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({
      error: expect.stringContaining("invalid"),
    });
  });

  it("rejects invalid investing_experience enum value (no allowed fields → 400)", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const res = await PUT(makePut({ investing_experience: "expert" }));
    expect(res.status).toBe(400);
  });

  it("rejects invalid state value (no allowed fields → 400)", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const res = await PUT(makePut({ state: "NZ" }));
    expect(res.status).toBe(400);
  });

  it("accepts valid display_name and upserts", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const chain = makeChain({ data: PROFILE, error: null });
    mockFrom.mockReturnValue(chain);
    const res = await PUT(makePut({ display_name: "Alice" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.profile).toBeDefined();
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: USER.id, display_name: "Alice" }),
      { onConflict: "id" },
    );
  });

  it("accepts valid investing_experience enum value", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const chain = makeChain({ data: PROFILE, error: null });
    mockFrom.mockReturnValue(chain);
    const res = await PUT(makePut({ investing_experience: "advanced" }));
    expect(res.status).toBe(200);
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ investing_experience: "advanced" }),
      expect.anything(),
    );
  });

  it("accepts onboarding completion as a standalone update", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const chain = makeChain({
      data: { ...PROFILE, onboarding_completed: true },
      error: null,
    });
    mockFrom.mockReturnValue(chain);
    const res = await PUT(makePut({ onboarding_completed: true }));
    expect(res.status).toBe(200);
    expect(chain.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ onboarding_completed: true }),
      expect.anything(),
    );
  });

  it("filters interested_in to known values and caps at 8", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const chain = makeChain({ data: PROFILE, error: null });
    mockFrom.mockReturnValue(chain);
    const interests = [
      "shares",
      "etfs",
      "crypto",
      "super",
      "property",
      "savings",
      "insurance",
      "cfd_forex",
      "bogus",
    ];
    await PUT(makePut({ interested_in: interests }));
    const upsertCall = chain.upsert.mock.calls[0][0] as {
      interested_in: string[];
    };
    expect(upsertCall.interested_in).not.toContain("bogus");
    expect(upsertCall.interested_in.length).toBeLessThanOrEqual(8);
  });

  it("trims and truncates display_name to 100 chars", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const chain = makeChain({ data: PROFILE, error: null });
    mockFrom.mockReturnValue(chain);
    const longName = "  " + "A".repeat(150) + "  ";
    await PUT(makePut({ display_name: longName }));
    const upsertCall = chain.upsert.mock.calls[0][0] as {
      display_name: string;
    };
    expect(upsertCall.display_name.length).toBe(100);
    expect(upsertCall.display_name).not.toMatch(/^\s/);
  });

  it("returns 500 when upsert errors", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    const chain = makeChain({ data: null, error: { message: "constraint" } });
    mockFrom.mockReturnValue(chain);
    const res = await PUT(makePut({ display_name: "Alice" }));
    expect(res.status).toBe(500);
  });

  it("returns 503 when createClient throws during PUT", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: USER } });
    mockFrom.mockImplementation(() => {
      throw new Error("connection refused");
    });
    const res = await PUT(makePut({ display_name: "Alice" }));
    expect(res.status).toBe(503);
  });
});
