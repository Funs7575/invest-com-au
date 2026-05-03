import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockAdminFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  })),
}));

const mockIsAllowed = vi.fn();
const mockIpKey = vi.fn(
  (req: NextRequest) => req.headers.get("x-forwarded-for") ?? "unknown",
);
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: (req: NextRequest) => mockIpKey(req),
}));

const mockSendEmail = vi.fn();
vi.mock("@/lib/resend", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

import { POST } from "@/app/api/bug-report/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeInsertBuilder(
  result: { id: string; created_at: string } | null = {
    id: "11111111-2222-3333-4444-555555555555",
    created_at: "2026-05-03T10:00:00.000Z",
  },
  error: { message: string } | null = null,
) {
  const single = vi.fn(() => Promise.resolve({ data: result, error }));
  const select = vi.fn(() => ({ single }));
  const insert = vi.fn(() => ({ select }));
  return { insert, select, single };
}

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/bug-report", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": "1.2.3.4",
      "user-agent": "Mozilla/5.0 (TestRunner)",
    },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const VALID_BODY = {
  page_url: "https://invest.com.au/best/share-trading",
  route: "/best/[slug]",
  user_message: "Stars render as zero on the IG card",
  email: "user@example.com",
  user_agent: "Mozilla/5.0 (RealClient)",
  viewport: "1440x900",
  severity_guess: "P2" as const,
};

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("POST /api/bug-report", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockAdminFrom.mockReturnValue(makeInsertBuilder());
    mockSendEmail.mockResolvedValue({ ok: true });
  });

  it("inserts a row and returns 201 with the new id on a valid submission", async () => {
    const builder = makeInsertBuilder();
    mockAdminFrom.mockReturnValue(builder);

    const res = await POST(makeRequest(VALID_BODY));

    expect(res.status).toBe(201);
    expect(mockAdminFrom).toHaveBeenCalledWith("bug_reports");
    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({
        page_url: VALID_BODY.page_url,
        route: VALID_BODY.route,
        user_message: VALID_BODY.user_message,
        email: VALID_BODY.email,
        viewport: VALID_BODY.viewport,
        severity_guess: VALID_BODY.severity_guess,
      }),
    );
    const json = (await res.json()) as { ok: boolean; id: string };
    expect(json.ok).toBe(true);
    expect(json.id).toBe("11111111-2222-3333-4444-555555555555");
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(429);
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it("rejects an empty user_message with 400", async () => {
    const res = await POST(
      makeRequest({ ...VALID_BODY, user_message: "" }),
    );
    expect(res.status).toBe(400);
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it("rejects a non-URL page_url with 400", async () => {
    const res = await POST(
      makeRequest({ ...VALID_BODY, page_url: "not a url" }),
    );
    expect(res.status).toBe(400);
  });

  it("accepts an empty-string email and stores it as null", async () => {
    const builder = makeInsertBuilder();
    mockAdminFrom.mockReturnValue(builder);

    const res = await POST(makeRequest({ ...VALID_BODY, email: "" }));

    expect(res.status).toBe(201);
    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ email: null }),
    );
  });

  it("falls back to the request user-agent header when body omits it", async () => {
    const builder = makeInsertBuilder();
    mockAdminFrom.mockReturnValue(builder);

    const { user_agent: _ua, ...withoutUa } = VALID_BODY;
    const res = await POST(makeRequest(withoutUa));

    expect(res.status).toBe(201);
    expect(builder.insert).toHaveBeenCalledWith(
      expect.objectContaining({ user_agent: "Mozilla/5.0 (TestRunner)" }),
    );
  });

  it("returns 500 when the insert fails", async () => {
    mockAdminFrom.mockReturnValue(
      makeInsertBuilder(null, { message: "boom" }),
    );

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(500);
    const json = (await res.json()) as { error: string };
    expect(json.error).toBe("insert_failed");
  });

  it("still returns 201 when the alert email send fails", async () => {
    mockSendEmail.mockResolvedValue({ ok: false, error: "no api key" });

    const res = await POST(makeRequest(VALID_BODY));
    expect(res.status).toBe(201);
  });

  it("rejects an invalid viewport string", async () => {
    const res = await POST(
      makeRequest({ ...VALID_BODY, viewport: "huge" }),
    );
    expect(res.status).toBe(400);
  });
});
