import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

const isRateLimitedMock = vi.hoisted(() => vi.fn<() => Promise<boolean>>(() => Promise.resolve(false)));
vi.mock("@/lib/rate-limit", () => ({ isRateLimited: isRateLimitedMock }));

const isValidEmailMock = vi.hoisted(() => vi.fn<(e: string) => boolean>(() => true));
vi.mock("@/lib/validate-email", () => ({ isValidEmail: (e: string) => isValidEmailMock(e) }));

const createUserMock = vi.fn();
const adminFromMock = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: adminFromMock,
    auth: { admin: { createUser: createUserMock } },
  })),
}));

import { POST } from "@/app/api/advisor-signup/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function chain(result: unknown) {
  const b: Record<string, unknown> = {};
  for (const m of ["select", "eq", "insert", "update", "limit"]) b[m] = vi.fn(() => b);
  b.maybeSingle = vi.fn(() => Promise.resolve(result));
  b.single = vi.fn(() => Promise.resolve(result));
  b.then = (cb: (v: unknown) => void) => { cb(result); return Promise.resolve(); };
  return b;
}

function makeReq(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/advisor-signup", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
  });
}

const VALID = {
  name: "Jane Smith",
  email: "jane@example.com",
  phone: "0412345678",
  type: "financial-planner",
  location_state: "NSW",
  location_suburb: "Sydney",
};

function setupHappyPath() {
  adminFromMock.mockReturnValueOnce(chain({ data: null })); // email check
  createUserMock.mockResolvedValueOnce({ data: { user: { id: "auth-123" } }, error: null });
  adminFromMock.mockReturnValueOnce(chain({ data: null })); // slug check
  adminFromMock.mockReturnValueOnce(chain({ data: { id: 1, slug: "jane-smith-sydney" }, error: null }));
  adminFromMock.mockReturnValue(chain({ error: null })); // side-effects
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/advisor-signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isRateLimitedMock.mockResolvedValue(false);
    isValidEmailMock.mockReturnValue(true);
  });

  it("returns 429 when rate-limited", async () => {
    isRateLimitedMock.mockResolvedValueOnce(true);
    expect((await POST(makeReq(VALID))).status).toBe(429);
  });

  it("returns 400 when name is missing", async () => {
    expect((await POST(makeReq({ ...VALID, name: "" }))).status).toBe(400);
  });

  it("returns 400 when email is invalid", async () => {
    isValidEmailMock.mockReturnValueOnce(false);
    expect((await POST(makeReq({ ...VALID, email: "bad" }))).status).toBe(400);
  });

  it("returns 400 when email is absent", async () => {
    expect((await POST(makeReq({ ...VALID, email: "" }))).status).toBe(400);
  });

  it("returns 400 when phone is missing", async () => {
    expect((await POST(makeReq({ ...VALID, phone: "" }))).status).toBe(400);
  });

  it("returns 400 when type is missing", async () => {
    expect((await POST(makeReq({ ...VALID, type: "" }))).status).toBe(400);
  });

  it("returns 400 when location_state is missing", async () => {
    expect((await POST(makeReq({ ...VALID, location_state: "" }))).status).toBe(400);
  });

  it("returns 400 when location_suburb is missing", async () => {
    expect((await POST(makeReq({ ...VALID, location_suburb: "" }))).status).toBe(400);
  });

  it("returns 409 when email already exists in professionals", async () => {
    adminFromMock.mockReturnValueOnce(chain({ data: { id: 99 } }));
    expect((await POST(makeReq(VALID))).status).toBe(409);
  });

  it("returns 500 on auth user creation failure (non-registration error)", async () => {
    adminFromMock.mockReturnValueOnce(chain({ data: null }));
    createUserMock.mockResolvedValueOnce({ data: null, error: { message: "internal db error" } });
    expect((await POST(makeReq(VALID))).status).toBe(500);
  });

  it("continues when auth error is 'already been registered'", async () => {
    adminFromMock.mockReturnValueOnce(chain({ data: null }));
    createUserMock.mockResolvedValueOnce({ data: null, error: { message: "User already been registered" } });
    adminFromMock.mockReturnValueOnce(chain({ data: null })); // slug check
    adminFromMock.mockReturnValueOnce(chain({ data: { id: 1, slug: "jane-smith-sydney" }, error: null }));
    adminFromMock.mockReturnValue(chain({ error: null }));
    expect((await POST(makeReq(VALID))).status).toBe(200);
  });

  it("returns 500 when professional insert fails", async () => {
    adminFromMock.mockReturnValueOnce(chain({ data: null }));
    createUserMock.mockResolvedValueOnce({ data: { user: { id: "auth-123" } }, error: null });
    adminFromMock.mockReturnValueOnce(chain({ data: null })); // slug check
    adminFromMock.mockReturnValueOnce(chain({ data: null, error: { message: "insert failed" } }));
    expect((await POST(makeReq(VALID))).status).toBe(500);
  });

  it("appends timestamp suffix when slug conflicts", async () => {
    adminFromMock.mockReturnValueOnce(chain({ data: null }));
    createUserMock.mockResolvedValueOnce({ data: { user: { id: "auth-123" } }, error: null });
    adminFromMock.mockReturnValueOnce(chain({ data: { id: 5 } })); // slug taken
    adminFromMock.mockReturnValueOnce(chain({ data: { id: 1, slug: "jane-smith-sydney-xyz" }, error: null }));
    adminFromMock.mockReturnValue(chain({ error: null }));
    const res = await POST(makeReq(VALID));
    expect(res.status).toBe(200);
    expect((await res.json()).slug).toContain("jane-smith-sydney");
  });

  it("returns 200 on success with slug in response", async () => {
    setupHappyPath();
    const res = await POST(makeReq(VALID));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.slug).toBe("jane-smith-sydney");
  });

  it("includes optional fields (firm_name, specialties, bio, languages)", async () => {
    setupHappyPath();
    const res = await POST(makeReq({ ...VALID, firm_name: "ACME Financial", specialties: ["super"], bio: "Bio", languages: "English,Mandarin" }));
    expect(res.status).toBe(200);
  });

  it("returns 200 even when agreement recording throws (non-blocking try/catch)", async () => {
    adminFromMock.mockReturnValueOnce(chain({ data: null }));
    createUserMock.mockResolvedValueOnce({ data: { user: { id: "auth-123" } }, error: null });
    adminFromMock.mockReturnValueOnce(chain({ data: null }));
    adminFromMock.mockReturnValueOnce(chain({ data: { id: 1, slug: "jane-smith-sydney" }, error: null }));
    adminFromMock.mockImplementationOnce(() => { throw new Error("agreement db error"); });
    const res = await POST(makeReq(VALID));
    expect(res.status).toBe(200);
  });
});
