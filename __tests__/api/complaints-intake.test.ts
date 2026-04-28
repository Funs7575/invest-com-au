import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockAdminFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

vi.mock("@/lib/html-escape", () => ({
  escapeHtml: vi.fn((s: string) => s),
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: vi.fn(() => "https://invest.com.au"),
}));

const mockEnqueueJob = vi.fn();
vi.mock("@/lib/job-queue", () => ({
  enqueueJob: (...args: unknown[]) => mockEnqueueJob(...args),
}));

const mockIsAllowed = vi.fn();
const mockIpKey = vi.fn((req: NextRequest) => req.headers.get("x-forwarded-for") || "unknown");
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: (req: NextRequest) => mockIpKey(req),
}));

const mockIsValidEmail = vi.fn((email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
vi.mock("@/lib/validate-email", () => ({
  isValidEmail: (email: string) => mockIsValidEmail(email),
}));

import { POST } from "@/app/api/complaints/intake/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeRequest(body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/complaints/intake", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

function makeValidBody(overrides = {}) {
  return {
    complainant_email: "user@example.com",
    complainant_name: "Jane Smith",
    subject: "Incorrect fee information",
    body: "The broker fee shown on your site is outdated by at least 12 months.",
    category: "platform",
    ...overrides,
  };
}

function makeInsertBuilder(data: unknown = { id: 1, reference_id: "IVST-202604-ABC123" }, error: unknown = null) {
  return {
    insert: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn(() => Promise.resolve({ data, error })),
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/complaints/intake", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true); // not rate-limited
    mockEnqueueJob.mockResolvedValue(undefined);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeRequest(makeValidBody()));
    expect(res.status).toBe(429);
  });

  it("returns 400 when email is missing", async () => {
    const res = await POST(makeRequest({ subject: "Test", body: "x".repeat(20), category: "platform" }));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/email/i);
  });

  it("returns 400 when email is invalid", async () => {
    mockIsValidEmail.mockReturnValueOnce(false);
    const res = await POST(makeRequest(makeValidBody({ complainant_email: "not-an-email" })));
    expect(res.status).toBe(400);
  });

  it("returns 400 when subject is too short", async () => {
    const res = await POST(makeRequest(makeValidBody({ subject: "Hi" })));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/subject/i);
  });

  it("returns 400 when body is too short", async () => {
    const res = await POST(makeRequest(makeValidBody({ body: "short" })));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/20/);
  });

  it("returns 400 when category is invalid", async () => {
    const res = await POST(makeRequest(makeValidBody({ category: "invalid_category" })));
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(data.error).toMatch(/category/i);
  });

  it("records complaint and returns reference_id on success", async () => {
    mockAdminFrom.mockReturnValue(makeInsertBuilder({ id: 1, reference_id: "IVST-202604-ABC123" }));
    const res = await POST(makeRequest(makeValidBody()));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.ok).toBe(true);
    expect(data.reference_id).toBe("IVST-202604-ABC123");
  });

  it("enqueues acknowledgement and admin notification emails on success", async () => {
    mockAdminFrom.mockReturnValue(makeInsertBuilder({ id: 1, reference_id: "IVST-202604-ABC123" }));
    await POST(makeRequest(makeValidBody()));
    expect(mockEnqueueJob).toHaveBeenCalledTimes(2);
    expect(mockEnqueueJob).toHaveBeenCalledWith("send_email", expect.objectContaining({ to: "user@example.com" }));
  });

  it("defaults severity to standard when not provided", async () => {
    mockAdminFrom.mockReturnValue(makeInsertBuilder({ id: 1, reference_id: "IVST-202604-DEF456" }));
    const res = await POST(makeRequest(makeValidBody()));
    expect(res.status).toBe(200);
    // severity defaults silently — just confirm it doesn't 400
  });

  it("accepts valid severity value", async () => {
    mockAdminFrom.mockReturnValue(makeInsertBuilder({ id: 1, reference_id: "IVST-202604-XYZ789" }));
    const res = await POST(makeRequest(makeValidBody({ severity: "critical" })));
    expect(res.status).toBe(200);
  });

  it("returns 500 when DB insert fails", async () => {
    mockAdminFrom.mockReturnValue(makeInsertBuilder(null, { message: "insert failed" }));
    const res = await POST(makeRequest(makeValidBody()));
    expect(res.status).toBe(500);
    const data = await res.json();
    expect(data.error).toMatch(/record/i);
  });
});
