import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mock refs ─────────────────────────────────────────────────────────

const { mockIsRateLimited, mockInsert, mockFrom } = vi.hoisted(() => {
  const insert = vi.fn<(row: unknown) => Promise<{ error: { message: string } | null }>>(
    async () => ({ error: null }),
  );
  return {
    mockIsRateLimited: vi.fn<() => Promise<boolean>>(async () => false),
    mockInsert: insert,
    mockFrom: vi.fn(() => ({ insert })),
  };
});

// ── Module mocks ────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

vi.mock("@/lib/rate-limit", () => ({ isRateLimited: mockIsRateLimited }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

// Faithful wrapper: validates with the real schema, returns 400 on failure.
vi.mock("@/lib/validation/withValidatedBody", async () => {
  const { NextResponse } = await import("next/server");
  return {
    withValidatedBody:
      (schema: { safeParse: (v: unknown) => { success: boolean; data?: unknown } },
       handler: (req: NextRequest, body: unknown) => unknown) =>
      async (req: NextRequest) => {
        let raw: unknown;
        try {
          raw = await req.json();
        } catch {
          return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
        }
        const parsed = schema.safeParse(raw);
        if (!parsed.success) {
          return NextResponse.json({ error: "validation", code: "validation_error" }, { status: 400 });
        }
        return handler(req, parsed.data);
      },
  };
});

// ── Helpers ────────────────────────────────────────────────────────────────

function makeReq(body?: unknown, ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/org-apply", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

const validBody = {
  organisation_name: "Acme Training",
  organisation_type: "training_provider",
  website: "https://acme.example.com",
  contact_name: "Jane Doe",
  contact_email: "Jane@Acme.com",
};

// ── Route under test ──────────────────────────────────────────────────────────

import { POST } from "@/app/api/org-apply/route";

describe("POST /api/org-apply", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsRateLimited.mockResolvedValue(false);
    mockInsert.mockResolvedValue({ error: null });
    mockFrom.mockReturnValue({ insert: mockInsert });
  });

  it("returns 429 when rate limited", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(429);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("returns 400 when required fields are missing", async () => {
    const res = await POST(makeReq({ organisation_name: "A" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for an invalid organisation_type enum value", async () => {
    const res = await POST(makeReq({ ...validBody, organisation_type: "not_a_type" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/org-apply", {
      method: "POST",
      body: "not-json",
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 500 when the insert fails", async () => {
    mockInsert.mockResolvedValue({ error: { message: "db error" } });
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/failed to submit/i);
  });

  it("returns 201 and normalises contact_email on success", async () => {
    const res = await POST(makeReq(validBody));
    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json.success).toBe(true);

    expect(mockInsert).toHaveBeenCalledTimes(1);
    const inserted = mockInsert.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(inserted.contact_email).toBe("jane@acme.com");
    expect(inserted.status).toBe("pending");
    expect(inserted.abn).toBeNull();
  });

  it("uses 'unknown' ip when x-forwarded-for header missing", async () => {
    const req = new NextRequest("http://localhost/api/org-apply", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validBody),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    expect(mockIsRateLimited).toHaveBeenCalledWith("org_apply_ip:unknown", 5, 3600);
  });
});
