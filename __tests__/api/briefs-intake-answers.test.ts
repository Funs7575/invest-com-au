import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockIsAllowed,
  mockIpKey,
  mockSubmitAnswers,
  mockMaybeSingle,
  IntakeError,
} = vi.hoisted(() => {
  class IntakeError extends Error {
    readonly status: number;
    constructor(message: string, status = 400) {
      super(message);
      this.status = status;
    }
  }
  return {
    mockIsAllowed: vi.fn(),
    mockIpKey: vi.fn(() => "ip:1.2.3.4"),
    mockSubmitAnswers: vi.fn(),
    mockMaybeSingle: vi.fn(),
    IntakeError,
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => {
    const chain: Record<string, unknown> = {};
    chain.from = vi.fn(() => chain);
    chain.select = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.maybeSingle = mockMaybeSingle;
    return chain;
  }),
}));

vi.mock("@/lib/rate-limit-db", () => ({ isAllowed: mockIsAllowed, ipKey: mockIpKey }));

vi.mock("@/lib/pro-intake", () => ({
  submitAnswers: mockSubmitAnswers,
  IntakeError,
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { POST } from "@/app/api/briefs/[slug]/intake-answers/route";

const BRIEF = { id: 42, slug: "abc", contact_email: "owner@example.com" };

const VALID = {
  email: "owner@example.com",
  answers: [{ question_id: 1, answer: "yes" }],
};

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/briefs/abc/intake-answers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const ctx = { params: Promise.resolve({ slug: "abc" }) };

describe("POST /api/briefs/[slug]/intake-answers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockMaybeSingle.mockResolvedValue({ data: BRIEF });
    mockSubmitAnswers.mockResolvedValue([{ id: 1, question_id: 1, answer: "yes" }]);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await POST(makeReq(VALID), ctx);
    expect(res.status).toBe(429);
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/briefs/abc/intake-answers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
  });

  it("returns 400 on schema validation failure", async () => {
    const res = await POST(makeReq({ email: "owner@example.com", answers: [] }), ctx);
    expect(res.status).toBe(400);
  });

  it("returns 404 when brief not found", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null });
    const res = await POST(makeReq(VALID), ctx);
    expect(res.status).toBe(404);
  });

  it("returns 403 when email does not match brief owner", async () => {
    const res = await POST(makeReq({ ...VALID, email: "other@example.com" }), ctx);
    expect(res.status).toBe(403);
  });

  it("saves answers on the happy path", async () => {
    const res = await POST(makeReq(VALID), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ answers: [{ id: 1, question_id: 1, answer: "yes" }] });
    expect(mockSubmitAnswers).toHaveBeenCalledWith(
      expect.objectContaining({ briefId: 42 }),
    );
  });

  it("maps an IntakeError to its status", async () => {
    mockSubmitAnswers.mockRejectedValueOnce(new IntakeError("Unknown question", 422));
    const res = await POST(makeReq(VALID), ctx);
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: "Unknown question" });
  });

  it("returns 500 on unexpected error", async () => {
    mockSubmitAnswers.mockRejectedValueOnce(new Error("boom"));
    const res = await POST(makeReq(VALID), ctx);
    expect(res.status).toBe(500);
  });
});
