import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const {
  mockIsAllowed,
  mockIpKey,
  mockGetUser,
  mockBookSlot,
  mockGetSlot,
  mockMaybeSingle,
  ConsultationError,
} = vi.hoisted(() => {
  class ConsultationError extends Error {
    readonly code: string;
    readonly status: number;
    constructor(code: string, message: string, status: number) {
      super(message);
      this.code = code;
      this.status = status;
    }
  }
  return {
    mockIsAllowed: vi.fn(),
    mockIpKey: vi.fn(() => "ip:1.2.3.4"),
    mockGetUser: vi.fn(),
    mockBookSlot: vi.fn(),
    mockGetSlot: vi.fn(),
    mockMaybeSingle: vi.fn(),
    ConsultationError,
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

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: mockGetUser } })),
}));

vi.mock("@/lib/rate-limit-db", () => ({ isAllowed: mockIsAllowed, ipKey: mockIpKey }));

vi.mock("@/lib/consultations", () => ({
  bookSlot: mockBookSlot,
  getSlot: mockGetSlot,
  ConsultationError,
}));

vi.mock("@/lib/marketplace-emails", () => ({
  sendProConsultationBooked: vi.fn(async () => undefined),
  sendConsumerConsultationPending: vi.fn(async () => undefined),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { POST } from "@/app/api/briefs/[slug]/book-slot/route";

const BRIEF = {
  id: 42,
  slug: "abc",
  job_title: "Tax help",
  contact_email: "owner@example.com",
  contact_name: "Owner",
  accepted_by_professional_id: 7,
  accepted_by_team_id: null,
};

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/briefs/abc/book-slot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const ctx = { params: Promise.resolve({ slug: "abc" }) };

describe("POST /api/briefs/[slug]/book-slot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockMaybeSingle.mockResolvedValue({ data: BRIEF });
    mockGetSlot.mockResolvedValue({ id: 5, professional_id: 7, start_at: "x", end_at: "y" });
    mockBookSlot.mockResolvedValue({
      booking: { id: 99 },
      slot: { id: 5, professional_id: 7, start_at: "x", end_at: "y" },
    });
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await POST(makeReq({ slot_id: 5 }), ctx);
    expect(res.status).toBe(429);
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/briefs/abc/book-slot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req, ctx);
    expect(res.status).toBe(400);
  });

  it("returns 400 on schema validation failure", async () => {
    const res = await POST(makeReq({ slot_id: -1 }), ctx);
    expect(res.status).toBe(400);
  });

  it("returns 404 when brief not found", async () => {
    mockMaybeSingle.mockResolvedValueOnce({ data: null });
    const res = await POST(makeReq({ slot_id: 5, contact_email: "owner@example.com" }), ctx);
    expect(res.status).toBe(404);
  });

  it("returns 400 when brief not yet accepted", async () => {
    mockMaybeSingle.mockResolvedValueOnce({
      data: { ...BRIEF, accepted_by_professional_id: null },
    });
    const res = await POST(makeReq({ slot_id: 5, contact_email: "owner@example.com" }), ctx);
    expect(res.status).toBe(400);
  });

  it("returns 403 when contact_email does not match owner", async () => {
    const res = await POST(makeReq({ slot_id: 5, contact_email: "other@example.com" }), ctx);
    expect(res.status).toBe(403);
  });

  it("returns 401 when no email and not signed in", async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null } });
    const res = await POST(makeReq({ slot_id: 5 }), ctx);
    expect(res.status).toBe(401);
  });

  it("returns 403 when signed-in user does not own the brief", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "u1", email: "other@example.com" } },
    });
    const res = await POST(makeReq({ slot_id: 5 }), ctx);
    expect(res.status).toBe(403);
  });

  it("returns 404 when slot not found", async () => {
    mockGetSlot.mockResolvedValueOnce(null);
    const res = await POST(makeReq({ slot_id: 5, contact_email: "owner@example.com" }), ctx);
    expect(res.status).toBe(404);
  });

  it("returns 400 when slot belongs to a different pro", async () => {
    mockGetSlot.mockResolvedValueOnce({ id: 5, professional_id: 999, start_at: "x", end_at: "y" });
    const res = await POST(makeReq({ slot_id: 5, contact_email: "owner@example.com" }), ctx);
    expect(res.status).toBe(400);
  });

  it("books via email-as-key on the happy path", async () => {
    const res = await POST(makeReq({ slot_id: 5, contact_email: "owner@example.com" }), ctx);
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ success: true, booking: { id: 99 } });
  });

  it("books via signed-in owner", async () => {
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "u1", email: "owner@example.com" } },
    });
    const res = await POST(makeReq({ slot_id: 5 }), ctx);
    expect(res.status).toBe(200);
    expect(mockBookSlot).toHaveBeenCalledWith(
      expect.objectContaining({ consumerUserId: "u1" }),
    );
  });

  it("maps a ConsultationError to its status/code", async () => {
    mockBookSlot.mockRejectedValueOnce(new ConsultationError("slot_not_open", "Taken", 409));
    const res = await POST(makeReq({ slot_id: 5, contact_email: "owner@example.com" }), ctx);
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({ code: "slot_not_open" });
  });

  it("returns 500 on unexpected error", async () => {
    mockBookSlot.mockRejectedValueOnce(new Error("boom"));
    const res = await POST(makeReq({ slot_id: 5, contact_email: "owner@example.com" }), ctx);
    expect(res.status).toBe(500);
  });
});
