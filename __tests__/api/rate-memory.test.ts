import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const { logErrorMock } = vi.hoisted(() => ({
  logErrorMock: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: logErrorMock, info: vi.fn(), warn: vi.fn() })),
}));

const isRateLimitedMock = vi.fn<() => Promise<boolean>>();
vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (..._args: unknown[]) => isRateLimitedMock(),
}));

const mockAuth = { getUser: vi.fn() };
const mockFrom = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => Promise.resolve({ auth: mockAuth, from: mockFrom })),
}));

vi.mock("@/lib/validation/withValidatedBody", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/validation/withValidatedBody")>();
  return actual;
});

import { POST } from "@/app/api/rate-memory/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

const TEST_USER = { id: "user-rate-1", email: "rate@test.com" };

function makeChain(result: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "upsert"]) {
    c[m] = vi.fn(() => c);
  }
  c.maybeSingle = vi.fn(() => Promise.resolve(result));
  return c;
}

function makeRequest(body: unknown, ip = "1.2.3.4") {
  return new NextRequest("http://localhost/api/rate-memory", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  brokerId: 1,
  productKind: "savings_account",
  currentRateBps: 450,
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/rate-memory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    isRateLimitedMock.mockResolvedValue(false);
    mockAuth.getUser.mockResolvedValue({ data: { user: TEST_USER }, error: null });
  });

  it("returns 429 when rate limited", async () => {
    isRateLimitedMock.mockResolvedValue(true);
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(429);
  });

  it("returns 401 when unauthenticated", async () => {
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 400 on invalid body (missing brokerId)", async () => {
    const res = await POST(makeRequest({ productKind: "savings_account", currentRateBps: 450 }));
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid productKind", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, productKind: "invalid_kind" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 on out-of-range currentRateBps", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, currentRateBps: 100000 }));
    expect(res.status).toBe(400);
  });

  it("returns previousRateBps as null when no existing record", async () => {
    const chain = makeChain({ data: null, error: null });
    mockFrom.mockReturnValue(chain);

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.previousRateBps).toBeNull();
    expect(json.currentRateBps).toBe(450);
  });

  it("returns previousRateBps from existing record", async () => {
    const chain = makeChain({ data: { last_seen_rate_bps: 380 }, error: null });
    mockFrom.mockReturnValue(chain);

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.previousRateBps).toBe(380);
    expect(json.currentRateBps).toBe(450);
  });

  it("returns 500 and logs error when upsert fails", async () => {
    const selectChain = makeChain({ data: null, error: null });
    const upsertChain = makeChain({ data: null, error: { message: "DB constraint violation" } });
    upsertChain.upsert = vi.fn(() => Promise.resolve({ error: { message: "DB constraint violation" } }));

    mockFrom
      .mockReturnValueOnce(selectChain)  // .from("user_rate_memory").select(...).eq(...).maybeSingle()
      .mockReturnValueOnce(upsertChain); // .from("user_rate_memory").upsert(...)

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(500);
    expect(logErrorMock).toHaveBeenCalledWith(
      "Rate memory upsert failed",
      expect.objectContaining({ error: "DB constraint violation" }),
    );
  });

  it("upserts with correct fields", async () => {
    const chain = makeChain({ data: null, error: null });
    const upsertSpy = vi.fn(() => Promise.resolve({ error: null }));
    chain.upsert = upsertSpy;
    mockFrom.mockReturnValue(chain);

    await POST(makeRequest({ brokerId: 42, productKind: "term_deposit", currentRateBps: 520 }));

    expect(upsertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: TEST_USER.id,
        broker_id: 42,
        product_kind: "term_deposit",
        last_seen_rate_bps: 520,
      }),
      expect.any(Object),
    );
  });
});
