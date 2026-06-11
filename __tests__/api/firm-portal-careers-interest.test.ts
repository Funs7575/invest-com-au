import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { makeRequest, createChainableBuilder } from "@/__tests__/helpers";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockIsRateLimited, mockServerFrom, mockAdminFrom } = vi.hoisted(() => ({
  mockIsRateLimited: vi.fn().mockResolvedValue(false),
  mockServerFrom: vi.fn(),
  mockAdminFrom: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...a: unknown[]) => mockIsRateLimited(...a),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: vi.fn(() =>
          Promise.resolve({ data: { user: { id: "user-1", email: "admin@firm.com" } } }),
        ),
      },
      from: mockServerFrom,
    }),
  ),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

import { POST } from "@/app/api/firm-portal/careers/interest/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const VALID_PRO = {
  id: "pro-1",
  firm_id: "firm-1",
  is_firm_admin: true,
  status: "active",
};

const VALID_BODY = { message: "Looking for 2 senior financial planners" };

type FirmAdminData = typeof VALID_PRO | null;
type UpsertError = { message: string } | null;

function setupMocks({
  proData = VALID_PRO as FirmAdminData,
  proError = null,
  upsertError = null as UpsertError,
} = {}) {
  mockAdminFrom.mockImplementation((table: string) => {
    const b = createChainableBuilder(table);

    if (table === "professionals") {
      b.maybeSingle = vi.fn(() =>
        Promise.resolve({ data: proData, error: proError }),
      );
    }

    if (table === "revenue_opportunities") {
      b.upsert = vi.fn(() =>
        Promise.resolve({ error: upsertError }),
      );
    }

    return b;
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/firm-portal/careers/interest", () => {
  function makePost(body: Record<string, unknown>): NextRequest {
    return makeRequest("/api/firm-portal/careers/interest", body);
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    setupMocks();
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValueOnce(true);
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(429);
  });

  it("returns 401 when user not authenticated", async () => {
    const { createClient } = await import("@/lib/supabase/server");
    vi.mocked(createClient).mockResolvedValueOnce({
      auth: {
        getUser: vi.fn(() =>
          Promise.resolve({ data: { user: null } }),
        ),
      },
      from: mockServerFrom,
    } as unknown as Awaited<ReturnType<typeof createClient>>);

    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(401);
  });

  it("returns 403 when user is not a firm admin", async () => {
    setupMocks({ proData: null });
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(403);
  });

  it("returns 403 when professional has no firm_id", async () => {
    setupMocks({
      proData: { ...VALID_PRO, firm_id: null as unknown as string },
    });
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(403);
  });

  it("returns 200 { ok: true } on valid submission", async () => {
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json() as { ok?: boolean };
    expect(body.ok).toBe(true);
  });

  it("returns 200 with empty message (optional)", async () => {
    const res = await POST(makePost({}));
    expect(res.status).toBe(200);
  });

  it("returns 400 when message exceeds 1000 chars", async () => {
    const res = await POST(makePost({ message: "a".repeat(1001) }));
    expect(res.status).toBe(400);
  });

  it("returns 500 when revenue_opportunities upsert fails", async () => {
    setupMocks({ upsertError: { message: "DB error" } });
    const res = await POST(makePost(VALID_BODY));
    expect(res.status).toBe(500);
  });

  it("writes to revenue_opportunities table", async () => {
    await POST(makePost(VALID_BODY));
    expect(mockAdminFrom).toHaveBeenCalledWith("revenue_opportunities");
  });
});
