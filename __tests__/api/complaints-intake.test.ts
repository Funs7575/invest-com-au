import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mocks ──────────────────────────────────────────────────────────────

const {
  mockInsertChain,
  mockAdminFrom,
  mockIsAllowed,
  mockIpKey,
  mockIsValidEmail,
  mockEnqueueJob,
  mockGetSiteUrl,
  mockLog,
} = vi.hoisted(() => {
  const mockInsertChain = {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({
      data: { id: 1, reference_id: "IVST-202604-AB12CD" },
      error: null,
    }),
  };
  const mockAdminFrom = vi.fn().mockReturnValue(mockInsertChain);
  const mockIsAllowed = vi.fn().mockResolvedValue(true);
  const mockIpKey = vi.fn().mockReturnValue("ip:1.2.3.4");
  const mockIsValidEmail = vi.fn().mockReturnValue(true);
  const mockEnqueueJob = vi.fn().mockResolvedValue(undefined);
  const mockGetSiteUrl = vi.fn().mockReturnValue("https://invest.com.au");
  const mockLog = { info: vi.fn(), error: vi.fn(), warn: vi.fn() };
  return {
    mockInsertChain,
    mockAdminFrom,
    mockIsAllowed,
    mockIpKey,
    mockIsValidEmail,
    mockEnqueueJob,
    mockGetSiteUrl,
    mockLog,
  };
});

// ── Module mocks ───────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: mockIpKey,
}));
vi.mock("@/lib/validate-email", () => ({ isValidEmail: mockIsValidEmail }));
vi.mock("@/lib/job-queue", () => ({ enqueueJob: mockEnqueueJob }));
vi.mock("@/lib/url", () => ({ getSiteUrl: mockGetSiteUrl }));
vi.mock("@/lib/html-escape", () => ({ escapeHtml: (s: string) => s }));
vi.mock("@/lib/logger", () => ({ logger: () => mockLog }));

import { POST } from "@/app/api/complaints/intake/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRequest(body: Record<string, unknown>): NextRequest {
  return new NextRequest("http://localhost/api/complaints/intake", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "1.2.3.4",
    },
  });
}

const VALID_BODY = {
  complainant_email: "user@example.com",
  complainant_name: "Jane Smith",
  subject: "My complaint about billing",
  body: "I was charged twice for the same service in March 2026.",
  category: "lead_billing",
};

beforeEach(() => {
  vi.clearAllMocks();
  mockIsAllowed.mockResolvedValue(true);
  mockIsValidEmail.mockReturnValue(true);
  mockInsertChain.insert.mockReturnThis();
  mockInsertChain.select.mockReturnThis();
  mockInsertChain.single.mockResolvedValue({
    data: { id: 1, reference_id: "IVST-202604-AB12CD" },
    error: null,
  });
  mockAdminFrom.mockReturnValue(mockInsertChain);
  mockEnqueueJob.mockResolvedValue(undefined);
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/complaints/intake", () => {
  it("returns 429 when rate-limited (3/IP/day cap)", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(429);
    expect((await res.json()).error).toContain("Too many");
  });

  it("returns 400 for missing email", async () => {
    const { complainant_email: _, ...rest } = VALID_BODY;
    const res = await POST(makeRequest(rest));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("email");
  });

  it("returns 400 for invalid email", async () => {
    mockIsValidEmail.mockReturnValue(false);
    const res = await POST(makeRequest({ ...VALID_BODY, complainant_email: "not-an-email" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("email");
  });

  it("returns 400 when subject is too short (< 5 chars)", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, subject: "Bad" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("Subject");
  });

  it("returns 400 when body is too short (< 20 chars)", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, body: "Too short" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("20 characters");
  });

  it("returns 400 for invalid category", async () => {
    const res = await POST(makeRequest({ ...VALID_BODY, category: "invalid_cat" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("Category");
  });

  it("returns 500 when DB insert fails", async () => {
    mockInsertChain.single.mockResolvedValue({ data: null, error: { message: "DB error" } });
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toContain("Failed to record");
  });

  it("returns 200 with reference_id on success", async () => {
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.reference_id).toBe("IVST-202604-AB12CD");
    expect(body.message).toContain("30 days");
  });

  it("enqueues complainant acknowledgement + internal notification emails", async () => {
    await POST(makeRequest(VALID_BODY));
    expect(mockEnqueueJob).toHaveBeenCalledTimes(2);
    const [firstCall, secondCall] = mockEnqueueJob.mock.calls;
    expect(firstCall[0]).toBe("send_email");
    expect(firstCall[1].to).toBe("user@example.com");
    expect(secondCall[0]).toBe("send_email");
    expect(secondCall[1].subject).toContain("[Complaint]");
  });

  it("uses default severity=standard when invalid severity supplied", async () => {
    await POST(makeRequest({ ...VALID_BODY, severity: "extreme" }));
    expect(mockInsertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({ severity: "standard" }),
    );
  });

  it("accepts valid optional fields (phone, related_advisor_id, related_broker_slug)", async () => {
    await POST(
      makeRequest({
        ...VALID_BODY,
        complainant_phone: "+61 412 345 678",
        related_advisor_id: 42,
        related_broker_slug: "commsec",
        severity: "high",
      }),
    );
    expect(mockInsertChain.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        complainant_phone: "+61 412 345 678",
        related_advisor_id: 42,
        related_broker_slug: "commsec",
        severity: "high",
      }),
    );
  });

  it("sets sla_due_at 30 days in the future", async () => {
    const before = new Date();
    await POST(makeRequest(VALID_BODY));
    const insertArg = (mockInsertChain.insert as ReturnType<typeof vi.fn>).mock
      .calls[0][0] as Record<string, string>;
    const slaDate = new Date(insertArg.sla_due_at);
    const diffDays = (slaDate.getTime() - before.getTime()) / (1000 * 60 * 60 * 24);
    expect(diffDays).toBeGreaterThanOrEqual(29.9);
    expect(diffDays).toBeLessThanOrEqual(30.1);
  });
});
