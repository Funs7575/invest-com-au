import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockIsRateLimited = vi.fn();
vi.mock("@/lib/rate-limit", () => ({ isRateLimited: mockIsRateLimited }));

const mockMaybySingle = vi.fn();
const mockSingle = vi.fn();
const mockCreateUser = vi.fn();
const mockDeleteUser = vi.fn();

const mockAdminFrom = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  limit: vi.fn().mockReturnThis(),
  maybeSingle: mockMaybySingle,
  single: mockSingle,
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: mockAdminFrom,
    auth: {
      admin: {
        createUser: mockCreateUser,
        deleteUser: mockDeleteUser,
      },
    },
  }),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { POST } from "@/app/api/startups/signup/route";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeReq(body: unknown, ip = "127.0.0.1"): NextRequest {
  return new NextRequest("http://localhost/api/startups/signup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  email: "founder@acme.com.au",
  password: "securepass123",
  company_name: "Acme Pty Ltd",
  stage: "seed",
  sector: ["FinTech"],
  esic_self_attested: false,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/startups/signup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    // maybeSingle is called for slug-conflict check
    mockMaybySingle.mockResolvedValue({ data: null, error: null });
    mockSingle.mockResolvedValue({
      data: { id: "sp-uuid-1", slug: "acme-pty-ltd" },
      error: null,
    });
    mockCreateUser.mockResolvedValue({
      data: { user: { id: "uid-123" } },
      error: null,
    });
  });

  it("returns 201/200 with success on valid payload", async () => {
    const res = await POST(makeReq(VALID_BODY));
    const json: { success?: boolean } = await res.json();
    expect(res.status).toBeLessThan(400);
    expect(json.success).toBe(true);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(429);
  });

  it("returns 400 on invalid email", async () => {
    const res = await POST(makeReq({ ...VALID_BODY, email: "not-an-email" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 on password too short", async () => {
    const res = await POST(makeReq({ ...VALID_BODY, password: "short" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 on missing company_name", async () => {
    const res = await POST(makeReq({ ...VALID_BODY, company_name: "" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid stage enum", async () => {
    const res = await POST(makeReq({ ...VALID_BODY, stage: "invalid_stage" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when sector is empty", async () => {
    const res = await POST(makeReq({ ...VALID_BODY, sector: [] }));
    expect(res.status).toBe(400);
  });

  it("returns 409 on duplicate email", async () => {
    mockCreateUser.mockResolvedValue({
      data: { user: null },
      error: { message: "User already registered" },
    });
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(409);
  });

  it("rolls back auth user when profile insert fails", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: "Insert failed" } });
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(500);
    expect(mockDeleteUser).toHaveBeenCalledWith("uid-123");
  });
});
