import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ─── Hoisted mocks ───────────────────────────────────────────────────────────

const { DisputeError } = vi.hoisted(() => {
  class DisputeError extends Error {
    constructor(
      message: string,
      public readonly status: number,
    ) {
      super(message);
      this.name = "DisputeError";
    }
  }
  return { DisputeError };
});

const mockIsAllowed = vi.fn();
const mockGetUser = vi.fn();
const mockAdminMaybeSingle = vi.fn();
const mockRequireAdvisorSession = vi.fn();
const mockIsProfessionalOnTeam = vi.fn();
const mockAddMessage = vi.fn();

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: vi.fn(() => "ip:1.2.3.4"),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => {
    const chain: Record<string, unknown> = {};
    chain.from = vi.fn(() => chain);
    chain.select = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.maybeSingle = vi.fn(() => mockAdminMaybeSingle());
    return chain;
  }),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (...args: unknown[]) => mockRequireAdvisorSession(...args),
}));

vi.mock("@/lib/expert-teams", () => ({
  isProfessionalOnTeam: (...args: unknown[]) => mockIsProfessionalOnTeam(...args),
}));

vi.mock("@/lib/disputes", () => ({
  DisputeError,
  addMessage: (...args: unknown[]) => mockAddMessage(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { POST } from "@/app/api/disputes/[id]/messages/route";

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/disputes/5/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function makeRawReq(raw: string): NextRequest {
  return new NextRequest("http://localhost/api/disputes/5/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw,
  });
}

const ctx = (id: string) => ({ params: Promise.resolve({ id }) });

const LOOKUP_CONSUMER = {
  id: 5,
  brief_id: 99,
  advisor_auctions: {
    contact_email: "consumer@example.com",
    accepted_by_professional_id: 7,
    accepted_by_team_id: null,
  },
};

describe("POST /api/disputes/[id]/messages", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockRequireAdvisorSession.mockResolvedValue(null);
    mockGetUser.mockResolvedValue({ data: { user: null } });
  });

  it("returns 429 when the IP rate limit is exhausted", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await POST(makeReq({ body: "hi" }), ctx("5"));
    expect(res.status).toBe(429);
    expect(mockAdminMaybeSingle).not.toHaveBeenCalled();
  });

  it("returns 400 for a non-numeric dispute id", async () => {
    const res = await POST(makeReq({ body: "hi" }), ctx("not-a-number"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid dispute id." });
  });

  it("returns 400 for invalid JSON body", async () => {
    const res = await POST(makeRawReq("{not json"), ctx("5"));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Invalid JSON body." });
  });

  it("returns 400 for a zod-invalid body (empty message)", async () => {
    const res = await POST(makeReq({ body: "" }), ctx("5"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when the dispute is not found", async () => {
    mockAdminMaybeSingle.mockResolvedValueOnce({ data: null });
    const res = await POST(makeReq({ body: "hi" }), ctx("5"));
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "Dispute not found." });
  });

  it("returns 401 when the sender cannot be resolved", async () => {
    mockAdminMaybeSingle.mockResolvedValueOnce({ data: LOOKUP_CONSUMER });
    // no advisor session, no matching user
    const res = await POST(makeReq({ body: "hi" }), ctx("5"));
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "Sign in required." });
  });

  it("returns 429 when the per-user rate limit is exhausted", async () => {
    mockAdminMaybeSingle.mockResolvedValueOnce({ data: LOOKUP_CONSUMER });
    mockRequireAdvisorSession.mockResolvedValueOnce(7); // resolves as professional
    // IP limit ok (first call), per-user limit fails (second call)
    mockIsAllowed.mockReset();
    mockIsAllowed.mockResolvedValueOnce(true).mockResolvedValueOnce(false);
    const res = await POST(makeReq({ body: "hi" }), ctx("5"));
    expect(res.status).toBe(429);
  });

  it("happy path — professional sender posts a message", async () => {
    mockAdminMaybeSingle.mockResolvedValueOnce({ data: LOOKUP_CONSUMER });
    mockRequireAdvisorSession.mockResolvedValueOnce(7);
    const row = { id: 1, body: "hi" };
    mockAddMessage.mockResolvedValueOnce(row);
    const res = await POST(makeReq({ body: "hi" }), ctx("5"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ message: row });
    expect(mockAddMessage).toHaveBeenCalledWith(
      expect.objectContaining({ disputeId: 5, senderKind: "professional", body: "hi" }),
    );
  });

  it("happy path — consumer sender (email match) posts a message", async () => {
    mockAdminMaybeSingle.mockResolvedValueOnce({ data: LOOKUP_CONSUMER });
    mockRequireAdvisorSession.mockResolvedValueOnce(null);
    mockGetUser.mockResolvedValueOnce({
      data: { user: { id: "u1", email: "Consumer@Example.com" } },
    });
    const row = { id: 2, body: "thanks" };
    mockAddMessage.mockResolvedValueOnce(row);
    const res = await POST(makeReq({ body: "thanks" }), ctx("5"));
    expect(res.status).toBe(200);
    expect(mockAddMessage).toHaveBeenCalledWith(
      expect.objectContaining({ senderKind: "consumer", senderUserId: "u1" }),
    );
  });

  it("maps DisputeError to its status code", async () => {
    mockAdminMaybeSingle.mockResolvedValueOnce({ data: LOOKUP_CONSUMER });
    mockRequireAdvisorSession.mockResolvedValueOnce(7);
    mockAddMessage.mockRejectedValueOnce(new DisputeError("Dispute is closed.", 409));
    const res = await POST(makeReq({ body: "hi" }), ctx("5"));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "Dispute is closed." });
  });

  it("returns 500 on an unexpected error", async () => {
    mockAdminMaybeSingle.mockResolvedValueOnce({ data: LOOKUP_CONSUMER });
    mockRequireAdvisorSession.mockResolvedValueOnce(7);
    mockAddMessage.mockRejectedValueOnce(new Error("db down"));
    const res = await POST(makeReq({ body: "hi" }), ctx("5"));
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: "Failed to send message." });
  });
});
