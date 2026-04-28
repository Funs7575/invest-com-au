import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mock state ────────────────────────────────────────────────────────────────

const mockIsAllowed = vi.fn((..._args: unknown[]) => undefined as unknown);
const mockIpKey = vi.fn((..._args: unknown[]) => "127.0.0.1");
const mockIsValidEmail = vi.fn();
const mockIsDisposableEmail = vi.fn();
const mockAdminFrom = vi.fn();
const mockEnqueueJob = vi.fn();
const mockGetSiteUrl = vi.fn(() => "https://invest.com.au");
const mockEscapeHtml = vi.fn((s: string) => s);

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...args: unknown[]) => mockIsAllowed(...args),
  ipKey: (...args: unknown[]) => mockIpKey(...args),
}));

vi.mock("@/lib/validate-email", () => ({
  isValidEmail: (e: string) => mockIsValidEmail(e),
  isDisposableEmail: (e: string) => mockIsDisposableEmail(e),
}));

vi.mock("@/lib/job-queue", () => ({
  enqueueJob: (...args: unknown[]) => mockEnqueueJob(...args),
}));

vi.mock("@/lib/url", () => ({
  getSiteUrl: () => mockGetSiteUrl(),
}));

vi.mock("@/lib/html-escape", () => ({
  escapeHtml: (s: string) => mockEscapeHtml(s),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn() })),
}));

// ── Import after mocks ────────────────────────────────────────────────────────

import { POST } from "@/app/api/newsletter/subscribe/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/newsletter/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// Fluent chain that resolves to { error } when awaited
function makeUpsertChain(error: unknown) {
  const c: Record<string, ReturnType<typeof vi.fn>> = {};
  c.upsert = vi.fn(() => c);
  c.then = vi.fn((resolve: (v: unknown) => void) => {
    resolve({ error });
    return Promise.resolve({ error });
  });
  return c;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/newsletter/subscribe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default happy-path state
    mockIsAllowed.mockResolvedValue(true);
    mockIsValidEmail.mockReturnValue(true);
    mockIsDisposableEmail.mockReturnValue(false);
    mockEnqueueJob.mockResolvedValue(undefined);
  });

  it("returns 429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValueOnce(false);
    const res = await POST(makePost({ email: "alice@example.com" }));
    expect(res.status).toBe(429);
    expect(await res.json()).toMatchObject({ error: "Too many subscriptions" });
  });

  it("returns 400 for invalid email", async () => {
    mockIsValidEmail.mockReturnValueOnce(false);
    const res = await POST(makePost({ email: "not-an-email" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: "Invalid email" });
  });

  it("returns 400 for missing email", async () => {
    mockIsValidEmail.mockReturnValueOnce(false);
    const res = await POST(makePost({}));
    expect(res.status).toBe(400);
  });

  it("returns 400 for disposable email", async () => {
    mockIsDisposableEmail.mockReturnValueOnce(true);
    const res = await POST(makePost({ email: "alice@mailinator.com" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toMatchObject({ error: expect.stringContaining("real email") });
  });

  it("returns { ok: true } on success and calls enqueueJob", async () => {
    mockAdminFrom.mockReturnValue(makeUpsertChain(null));
    const res = await POST(makePost({ email: "alice@example.com" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
    expect(mockEnqueueJob).toHaveBeenCalledWith("send_email", expect.objectContaining({
      to: "alice@example.com",
      subject: expect.stringContaining("Welcome"),
    }));
  });

  it("normalises email to lowercase and trims whitespace", async () => {
    mockAdminFrom.mockReturnValue(makeUpsertChain(null));
    await POST(makePost({ email: "  Alice@Example.COM  " }));
    const upsertArg = (mockAdminFrom.mock.results[0].value.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(upsertArg.email).toBe("alice@example.com");
  });

  it("defaults preference to 'weekly' when value is not in allowlist", async () => {
    mockAdminFrom.mockReturnValue(makeUpsertChain(null));
    await POST(makePost({ email: "alice@example.com", preference: "daily" }));
    const upsertArg = (mockAdminFrom.mock.results[0].value.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(upsertArg.preference).toBe("weekly");
  });

  it("accepts valid preference values: monthly, quarterly", async () => {
    for (const preference of ["monthly", "quarterly"] as const) {
      vi.clearAllMocks();
      mockIsAllowed.mockResolvedValue(true);
      mockIsValidEmail.mockReturnValue(true);
      mockIsDisposableEmail.mockReturnValue(false);
      mockEnqueueJob.mockResolvedValue(undefined);
      mockAdminFrom.mockReturnValue(makeUpsertChain(null));
      await POST(makePost({ email: "alice@example.com", preference }));
      const upsertArg = (mockAdminFrom.mock.results[0].value.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
      expect(upsertArg.preference).toBe(preference);
    }
  });

  it("defaults source to 'newsletter' when body.source is missing", async () => {
    mockAdminFrom.mockReturnValue(makeUpsertChain(null));
    await POST(makePost({ email: "alice@example.com" }));
    const upsertArg = (mockAdminFrom.mock.results[0].value.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(upsertArg.source).toBe("newsletter");
  });

  it("upserts with status='active' to handle re-subscribe", async () => {
    mockAdminFrom.mockReturnValue(makeUpsertChain(null));
    await POST(makePost({ email: "alice@example.com" }));
    const upsertArg = (mockAdminFrom.mock.results[0].value.upsert as ReturnType<typeof vi.fn>).mock.calls[0][0];
    expect(upsertArg.status).toBe("active");
    expect(upsertArg.unsubscribed_at).toBeNull();
  });

  it("returns 500 when DB upsert fails", async () => {
    mockAdminFrom.mockReturnValue(makeUpsertChain({ message: "unique constraint" }));
    const res = await POST(makePost({ email: "alice@example.com" }));
    expect(res.status).toBe(500);
    expect(await res.json()).toMatchObject({ error: "Failed to subscribe" });
  });

  it("does NOT call enqueueJob when upsert fails", async () => {
    mockAdminFrom.mockReturnValue(makeUpsertChain({ message: "DB error" }));
    await POST(makePost({ email: "alice@example.com" }));
    expect(mockEnqueueJob).not.toHaveBeenCalled();
  });
});
