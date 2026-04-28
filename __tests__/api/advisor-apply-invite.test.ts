import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsAllowed = vi.fn();
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: (req: NextRequest) => req.headers.get("x-forwarded-for") ?? "unknown",
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { GET } from "@/app/api/advisor-apply/invite/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeGet(token?: string): NextRequest {
  const url = token
    ? `http://localhost/api/advisor-apply/invite?token=${token}`
    : "http://localhost/api/advisor-apply/invite";
  return new NextRequest(url, {
    headers: { "x-forwarded-for": "1.2.3.4" },
  });
}

function makeSelectChain(result: { data: unknown; error: unknown }) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(result),
  };
}

function makeUpdateChain() {
  return {
    update: vi.fn().mockReturnThis(),
    eq: vi.fn().mockResolvedValue({ error: null }),
  };
}

const PENDING_INVITE = {
  id: "inv-1",
  email: "advisor@example.com",
  name: "Jane Smith",
  status: "pending",
  expires_at: new Date(Date.now() + 86_400_000).toISOString(),
  role: "member",
  firm_id: "firm-1",
  advisor_firms: { name: "Smith Capital" },
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/advisor-apply/invite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await GET(makeGet("some-token"));
    expect(res.status).toBe(429);
  });

  it("returns 400 when token param is missing", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/token required/i);
  });

  it("returns 404 when invite is not found", async () => {
    mockFrom.mockReturnValue(makeSelectChain({ data: null, error: null }));
    const res = await GET(makeGet("unknown-token"));
    expect(res.status).toBe(404);
    const json = await res.json();
    expect(json.error).toMatch(/invalid invitation/i);
  });

  it("returns 410 when invite has already been used", async () => {
    mockFrom.mockReturnValue(
      makeSelectChain({
        data: { ...PENDING_INVITE, status: "accepted" },
        error: null,
      }),
    );
    const res = await GET(makeGet("used-token"));
    expect(res.status).toBe(410);
    const json = await res.json();
    expect(json.error).toMatch(/already been used|revoked/i);
  });

  it("returns 410 and marks expired when invite has expired", async () => {
    const expiredAt = new Date(Date.now() - 86_400_000).toISOString();
    mockFrom
      .mockReturnValueOnce(
        makeSelectChain({
          data: { ...PENDING_INVITE, expires_at: expiredAt },
          error: null,
        }),
      )
      .mockReturnValueOnce(makeUpdateChain());

    const res = await GET(makeGet("expired-token"));
    expect(res.status).toBe(410);
    const json = await res.json();
    expect(json.error).toMatch(/expired/i);
  });

  it("returns 200 with invite details on success", async () => {
    mockFrom.mockReturnValue(
      makeSelectChain({ data: PENDING_INVITE, error: null }),
    );
    const res = await GET(makeGet("valid-token"));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.email).toBe("advisor@example.com");
    expect(json.firmName).toBe("Smith Capital");
    expect(json.role).toBe("member");
    expect(json.firmId).toBe("firm-1");
  });

  it("returns null firmName when advisor_firms is null", async () => {
    mockFrom.mockReturnValue(
      makeSelectChain({
        data: { ...PENDING_INVITE, advisor_firms: null },
        error: null,
      }),
    );
    const res = await GET(makeGet("valid-token"));
    const json = await res.json();
    expect(json.firmName).toBeNull();
  });
});
