import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockIsAllowed, mockFrom, mockSendWelcomePro } = vi.hoisted(() => ({
  mockIsAllowed: vi.fn(),
  mockFrom: vi.fn(),
  mockSendWelcomePro: vi.fn(),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: vi.fn(() => "ip:test"),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/pro-onboarding-emails", () => ({
  sendWelcomePro: mockSendWelcomePro,
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { POST } from "@/app/api/pros/join/route";

const VALID_BODY = {
  kind: "individual",
  specialties: ["financial_planner"],
  name: "Jane Pro",
  email: "jane@example.com",
  verification_doc_path: "pending/123-abc.pdf",
  payout_bsb: "062-000",
  payout_account_last4: "1234",
  agreed_to_terms: true,
};

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/pros/join", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// from().select().eq().maybeSingle() — dedupe + slug-clash lookups.
function makeLookupChain(result: { data: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.select = vi.fn(() => chain);
  chain.eq = vi.fn(() => chain);
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  return chain;
}

// from().insert().select().single()
function makeInsertChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.insert = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve(result));
  return chain;
}

describe("POST /api/pros/join", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockSendWelcomePro.mockResolvedValue(true);
  });

  it("returns 400 when zod validation fails (missing terms agreement)", async () => {
    const { agreed_to_terms: _omit, ...bad } = VALID_BODY;
    const res = await POST(makeReq(bad));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ code: "validation_error" });
  });

  it("returns 400 on a malformed BSB", async () => {
    const res = await POST(makeReq({ ...VALID_BODY, payout_bsb: "12" }));
    expect(res.status).toBe(400);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(429);
  });

  it("returns 409 when an application already exists for the email", async () => {
    mockFrom.mockReturnValueOnce(
      makeLookupChain({ data: { id: 1, verification_status: "pending" } }),
    );
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(409);
  });

  it("inserts a pending professional and returns ok", async () => {
    // 1: dedupe lookup (no existing), 2: slug-clash lookup (none), 3: insert.
    mockFrom
      .mockReturnValueOnce(makeLookupChain({ data: null }))
      .mockReturnValueOnce(makeLookupChain({ data: null }))
      .mockReturnValueOnce(makeInsertChain({ data: { id: 99, slug: "jane-pro" }, error: null }));
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toMatchObject({ ok: true, professional_id: 99, slug: "jane-pro" });
    expect(json.starter_credits_granted_on_approval).toBeGreaterThan(0);
    expect(mockSendWelcomePro).toHaveBeenCalledWith("jane@example.com", "Jane Pro");
  });

  it("still returns ok when the welcome email throws", async () => {
    mockFrom
      .mockReturnValueOnce(makeLookupChain({ data: null }))
      .mockReturnValueOnce(makeLookupChain({ data: null }))
      .mockReturnValueOnce(makeInsertChain({ data: { id: 99, slug: "jane-pro" }, error: null }));
    mockSendWelcomePro.mockRejectedValueOnce(new Error("smtp down"));
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(200);
  });

  it("returns 500 when the insert errors", async () => {
    mockFrom
      .mockReturnValueOnce(makeLookupChain({ data: null }))
      .mockReturnValueOnce(makeLookupChain({ data: null }))
      .mockReturnValueOnce(makeInsertChain({ data: null, error: { message: "boom" } }));
    const res = await POST(makeReq(VALID_BODY));
    expect(res.status).toBe(500);
  });
});
