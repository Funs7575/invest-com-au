import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createChainableBuilder } from "@/__tests__/helpers";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockIsAllowed = vi.fn();
const mockAdminFrom = vi.fn();
const mockFetch = vi.fn();

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: () => "1.2.3.4",
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

vi.stubGlobal("fetch", mockFetch);

import { POST } from "@/app/api/privacy/request/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePost(body: unknown, ip = "1.2.3.4"): NextRequest {
  return new NextRequest("http://localhost/api/privacy/request", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
    },
  });
}

function setupInsert(error: { message: string } | null = null) {
  const supabaseCalls: Record<string, { method: string; args: unknown[] }[]> = {};
  const chain = createChainableBuilder("privacy_data_requests", supabaseCalls);
  chain.then = vi.fn((cb: (v: { data: null; error: typeof error; count: number }) => void) => {
    cb({ data: null, error, count: 0 });
    return Promise.resolve();
  });
  mockAdminFrom.mockReturnValue(chain);
  return supabaseCalls;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/privacy/request", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockFetch.mockResolvedValue({ ok: true });
    delete process.env.RESEND_API_KEY;
  });

  it("returns 429 when rate limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makePost({ email: "user@example.com", type: "export" }));
    expect(res.status).toBe(429);
  });

  it("returns 400 when email is missing", async () => {
    setupInsert();
    const res = await POST(makePost({ type: "export" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/email|type/i);
  });

  it("returns 400 when email is invalid", async () => {
    setupInsert();
    const res = await POST(makePost({ email: "not-an-email", type: "export" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when type is missing", async () => {
    setupInsert();
    const res = await POST(makePost({ email: "user@example.com" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when type is not export or delete", async () => {
    setupInsert();
    const res = await POST(makePost({ email: "user@example.com", type: "unknown" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 on invalid JSON body", async () => {
    setupInsert();
    const res = await POST(makePost("not-json"));
    expect(res.status).toBe(400);
  });

  it("returns 500 when DB insert fails", async () => {
    setupInsert({ message: "unique constraint violation" });
    const res = await POST(makePost({ email: "user@example.com", type: "export" }));
    expect(res.status).toBe(500);
  });

  it("returns 200 with ok=true for export request", async () => {
    setupInsert();
    const res = await POST(makePost({ email: "user@example.com", type: "export" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
    expect(json.message).toMatch(/email/i);
  });

  it("returns 200 with ok=true for delete request", async () => {
    setupInsert();
    const res = await POST(makePost({ email: "user@example.com", type: "delete" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.ok).toBe(true);
  });

  it("inserts email lowercase-trimmed and request_type in DB", async () => {
    const supabaseCalls = setupInsert();
    await POST(makePost({ email: "  User@EXAMPLE.COM  ", type: "export" }));
    const insertCall = supabaseCalls["privacy_data_requests"]?.find(
      (c) => c.method === "insert",
    );
    const args = insertCall?.args[0] as Record<string, unknown>;
    expect(args.email).toBe("user@example.com");
    expect(args.request_type).toBe("export");
  });

  it("inserts a verification_token in DB", async () => {
    const supabaseCalls = setupInsert();
    await POST(makePost({ email: "user@example.com", type: "delete" }));
    const insertCall = supabaseCalls["privacy_data_requests"]?.find(
      (c) => c.method === "insert",
    );
    const args = insertCall?.args[0] as Record<string, unknown>;
    expect(typeof args.verification_token).toBe("string");
    expect((args.verification_token as string).length).toBeGreaterThan(16);
  });

  it("includes IP in DB insert", async () => {
    const supabaseCalls = setupInsert();
    await POST(makePost({ email: "user@example.com", type: "export" }, "9.9.9.9"));
    const insertCall = supabaseCalls["privacy_data_requests"]?.find(
      (c) => c.method === "insert",
    );
    const args = insertCall?.args[0] as Record<string, unknown>;
    expect(args.requested_by_ip).toBeTruthy();
  });

  it("sends Resend verification email when RESEND_API_KEY is set", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    setupInsert();
    await POST(makePost({ email: "user@example.com", type: "export" }));
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("resend.com"),
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("does not call Resend when RESEND_API_KEY is absent", async () => {
    setupInsert();
    await POST(makePost({ email: "user@example.com", type: "export" }));
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
