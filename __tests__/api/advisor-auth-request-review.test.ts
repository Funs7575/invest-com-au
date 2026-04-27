import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createChainableBuilder } from "@/__tests__/helpers";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockServerFrom = vi.fn();
const mockAdminFrom = vi.fn();
const mockSendReviewRequest = vi.fn();
const supabaseCalls: Record<string, { method: string; args: unknown[] }[]> = {};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: mockServerFrom,
  })),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

vi.mock("@/lib/advisor-emails", () => ({
  sendReviewRequest: (...args: unknown[]) => mockSendReviewRequest(...args),
}));

import { POST } from "@/app/api/advisor-auth/request-review/route";

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/request-review", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function authedAdvisor(advisorId = 42) {
  mockGetUser.mockResolvedValue({
    data: { user: { id: "u-1", email: "advisor@test.com" } },
  });
  mockAdminFrom.mockImplementation((table: string) => {
    const b = createChainableBuilder(table, supabaseCalls);
    if (table === "professionals") {
      b.maybeSingle = vi.fn(() =>
        Promise.resolve({ data: { id: advisorId }, error: null }),
      );
    }
    return b;
  });
}

function resetCalls() {
  for (const k of Object.keys(supabaseCalls)) delete supabaseCalls[k];
}

describe("POST /api/advisor-auth/request-review", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCalls();
    mockServerFrom.mockReset();
    mockAdminFrom.mockReset();
    mockServerFrom.mockImplementation((table: string) =>
      createChainableBuilder(table, supabaseCalls),
    );
    mockAdminFrom.mockImplementation((table: string) =>
      createChainableBuilder(table, supabaseCalls),
    );
    mockSendReviewRequest.mockResolvedValue(true);
  });

  it("returns 401 when not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    const res = await POST(makePost({ leadId: 1 }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when leadId is missing", async () => {
    authedAdvisor();
    const res = await POST(makePost({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 when leadId is not a number", async () => {
    authedAdvisor();
    const res = await POST(makePost({ leadId: "not-a-number" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when lead is not found", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u-1", email: "advisor@test.com" } },
    });
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professionals") {
        b.maybeSingle = vi.fn(() =>
          Promise.resolve({ data: { id: 42 }, error: null }),
        );
      }
      if (table === "professional_leads") {
        b.single = vi.fn(() =>
          Promise.resolve({ data: null, error: null }),
        );
      }
      return b;
    });
    const res = await POST(makePost({ leadId: 99 }));
    expect(res.status).toBe(404);
  });

  it("returns 400 when lead is not converted", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u-1", email: "advisor@test.com" } },
    });
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professionals") {
        b.maybeSingle = vi.fn(() =>
          Promise.resolve({ data: { id: 42 }, error: null }),
        );
      }
      if (table === "professional_leads") {
        b.single = vi.fn(() =>
          Promise.resolve({
            data: {
              id: 5,
              user_name: "Lead",
              user_email: "lead@test.com",
              status: "new",
              review_requested_at: null,
            },
            error: null,
          }),
        );
      }
      return b;
    });
    const res = await POST(makePost({ leadId: 5 }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/converted/);
  });

  it("returns 409 when review already requested", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u-1", email: "advisor@test.com" } },
    });
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professionals") {
        b.maybeSingle = vi.fn(() =>
          Promise.resolve({ data: { id: 42 }, error: null }),
        );
      }
      if (table === "professional_leads") {
        b.single = vi.fn(() =>
          Promise.resolve({
            data: {
              id: 5,
              user_name: "Lead",
              user_email: "lead@test.com",
              status: "converted",
              review_requested_at: "2026-04-01",
            },
            error: null,
          }),
        );
      }
      return b;
    });
    const res = await POST(makePost({ leadId: 5 }));
    expect(res.status).toBe(409);
  });

  it("sends email and stamps review_requested_at on success", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u-1", email: "advisor@test.com" } },
    });
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professionals") {
        b.maybeSingle = vi.fn(() =>
          Promise.resolve({ data: { id: 42 }, error: null }),
        );
        b.single = vi.fn(() =>
          Promise.resolve({
            data: { name: "Advisor", slug: "advisor" },
            error: null,
          }),
        );
      }
      if (table === "professional_leads") {
        b.single = vi.fn(() =>
          Promise.resolve({
            data: {
              id: 5,
              user_name: "Lead User",
              user_email: "lead@test.com",
              status: "converted",
              review_requested_at: null,
            },
            error: null,
          }),
        );
      }
      return b;
    });

    const res = await POST(makePost({ leadId: 5 }));
    expect(res.status).toBe(200);
    expect(mockSendReviewRequest).toHaveBeenCalledWith(
      "lead@test.com",
      "Lead User",
      "Advisor",
      "advisor",
    );
    const leadCalls = supabaseCalls.professional_leads || [];
    const updateCall = leadCalls.find((c) => c.method === "update");
    expect(updateCall).toBeDefined();
    const updateArgs = updateCall?.args[0] as Record<string, unknown>;
    expect(typeof updateArgs.review_requested_at).toBe("string");
  });

  it("returns 500 when sendReviewRequest fails", async () => {
    mockSendReviewRequest.mockResolvedValue(false);
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u-1", email: "advisor@test.com" } },
    });
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professionals") {
        b.maybeSingle = vi.fn(() =>
          Promise.resolve({ data: { id: 42 }, error: null }),
        );
        b.single = vi.fn(() =>
          Promise.resolve({
            data: { name: "Advisor", slug: "advisor" },
            error: null,
          }),
        );
      }
      if (table === "professional_leads") {
        b.single = vi.fn(() =>
          Promise.resolve({
            data: {
              id: 5,
              user_name: "Lead",
              user_email: "lead@test.com",
              status: "converted",
              review_requested_at: null,
            },
            error: null,
          }),
        );
      }
      return b;
    });

    const res = await POST(makePost({ leadId: 5 }));
    expect(res.status).toBe(500);
  });
});
