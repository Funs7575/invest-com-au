import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsAllowed = vi.fn();
const mockIpKey = vi.fn((req: NextRequest) => req.headers.get("x-forwarded-for") ?? "unknown");

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: (req: NextRequest) => mockIpKey(req),
}));

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { POST } from "@/app/api/report-download/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/report-download", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "1.2.3.4",
    },
    body: JSON.stringify(body),
  });
}

function setupUpsertMock(error: unknown = null) {
  mockFrom.mockReturnValue({
    upsert: vi.fn().mockResolvedValue({ error }),
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/report-download", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makePost({ email: "user@example.com" }));
    expect(res.status).toBe(429);
  });

  it("returns 400 when email is missing", async () => {
    const res = await POST(makePost({}));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/valid email/i);
  });

  it("returns 400 for email without @ symbol", async () => {
    const res = await POST(makePost({ email: "notanemail" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for email exceeding 320 chars", async () => {
    const longEmail = "a".repeat(310) + "@x.com";
    const res = await POST(makePost({ email: longEmail }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for malformed email format", async () => {
    const res = await POST(makePost({ email: "bad@" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/invalid email/i);
  });

  it("returns 200 for valid email and upserts to email_captures", async () => {
    setupUpsertMock();
    const res = await POST(makePost({ email: "user@example.com" }));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith("email_captures");
  });

  it("lowercases and trims the email before upsert", async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ upsert: upsertMock });

    await POST(makePost({ email: "  USER@EXAMPLE.COM  " }));

    const [upsertArg] = upsertMock.mock.calls[0];
    expect(upsertArg.email).toBe("user@example.com");
  });

  it("sets source to annual_report", async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ upsert: upsertMock });

    await POST(makePost({ email: "user@example.com" }));

    const [upsertArg] = upsertMock.mock.calls[0];
    expect(upsertArg.source).toBe("annual_report");
  });

  it("returns 200 even when DB upsert errors (good UX over perfect persistence)", async () => {
    setupUpsertMock({ message: "unique constraint" });
    const res = await POST(makePost({ email: "user@example.com" }));
    expect(res.status).toBe(200);
    expect((await res.json()).success).toBe(true);
  });

  it("returns 400 for completely invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/report-download", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
      body: "not-json",
    });
    mockIsAllowed.mockResolvedValue(true);
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("passes correct rate-limit params to isAllowed", async () => {
    setupUpsertMock();
    await POST(makePost({ email: "user@example.com" }));
    expect(mockIsAllowed).toHaveBeenCalledWith(
      "report_download_post",
      expect.any(String),
      expect.objectContaining({ max: 10 }),
    );
  });
});
