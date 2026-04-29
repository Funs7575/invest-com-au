import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() })),
}));

vi.mock("@/lib/cron-run-log", () => ({
  wrapCronHandler: (_name: string, h: unknown) => h,
}));

const mockRequireCronAuth = vi.fn();
vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: (...a: unknown[]) => mockRequireCronAuth(...a),
}));

const mockSendEmail = vi.fn();
vi.mock("@/lib/resend", () => ({
  sendEmail: (...a: unknown[]) => mockSendEmail(...a),
}));

const mockAdminFrom = vi.fn();
const mockStorageFrom = vi.fn();
const mockGetUserById = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: mockAdminFrom,
    storage: { from: mockStorageFrom },
    auth: { admin: { getUserById: (...a: unknown[]) => mockGetUserById(...a) } },
  })),
}));

import { GET } from "@/app/api/cron/process-data-exports/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/process-data-exports") as unknown as NextRequest;
}

interface ChainResult {
  data: unknown;
  error?: { message: string; code?: string } | null;
}

function makeChain(result: ChainResult) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "order", "limit", "update", "insert", "in", "not", "neq"]) {
    c[m] = vi.fn(() => c);
  }
  c.single = vi.fn().mockResolvedValue(result);
  c.then = (resolve: (v: ChainResult) => unknown) => Promise.resolve(resolve(result));
  return c;
}

const pendingRow = {
  id: "req-1",
  user_id: "u-1",
  email: "user@example.com",
  requested_at: "2026-01-01T00:00:00Z",
};

function setupHappyPath(overrides: {
  pending?: ChainResult;
  claimed?: ChainResult;
  uploadErr?: { message: string } | null;
  signedData?: { signedUrl: string } | null;
  signedErr?: { message: string } | null;
  markReadyErr?: { message: string } | null;
} = {}) {
  let reqCallCount = 0;
  mockAdminFrom.mockImplementation((table: string) => {
    if (table === "data_export_requests") {
      reqCallCount++;
      if (reqCallCount === 1) {
        return makeChain(overrides.pending ?? { data: pendingRow, error: null });
      }
      if (reqCallCount === 2) {
        return makeChain(overrides.claimed ?? { data: pendingRow, error: null });
      }
      return makeChain({ data: null, error: overrides.markReadyErr ?? null });
    }
    return makeChain({ data: [], error: null });
  });
  mockStorageFrom.mockReturnValue({
    upload: vi.fn().mockResolvedValue({ error: overrides.uploadErr ?? null }),
    createSignedUrl: vi.fn().mockResolvedValue({
      data: overrides.signedData ?? { signedUrl: "https://storage.example.com/u-1/req-1.json" },
      error: overrides.signedErr ?? null,
    }),
  });
  mockGetUserById.mockResolvedValue({ data: { user: null } });
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/cron/process-data-exports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireCronAuth.mockReturnValue(null);
    mockSendEmail.mockResolvedValue({ ok: true });
  });

  afterEach(() => { vi.restoreAllMocks(); });

  it("returns 401 when cron auth fails", async () => {
    mockRequireCronAuth.mockReturnValue(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns ok:true processed:0 when no pending rows (PGRST116)", async () => {
    mockAdminFrom.mockReturnValue(
      makeChain({ data: null, error: { message: "no rows found", code: "PGRST116" } }),
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; processed: number };
    expect(body.ok).toBe(true);
    expect(body.processed).toBe(0);
  });

  it("returns ok:true note:table_not_found when table is missing", async () => {
    mockAdminFrom.mockReturnValue(
      makeChain({ data: null, error: { message: "relation does not exist" } }),
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; note: string };
    expect(body.ok).toBe(true);
    expect(body.note).toBe("table_not_found");
  });

  it("returns 500 on generic select error", async () => {
    mockAdminFrom.mockReturnValue(
      makeChain({ data: null, error: { message: "DB connection failed" } }),
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json() as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
    expect(body.error).toBe("DB connection failed");
  });

  it("returns ok:true processed:0 when CAS claim finds row already claimed", async () => {
    let callCount = 0;
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "data_export_requests") {
        callCount++;
        if (callCount === 1) return makeChain({ data: pendingRow, error: null });
        // claim returns no row — already taken by another instance
        return makeChain({ data: null, error: null });
      }
      return makeChain({ data: [], error: null });
    });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; processed: number };
    expect(body.ok).toBe(true);
    expect(body.processed).toBe(0);
  });

  it("returns 500 and marks failed on storage upload error", async () => {
    setupHappyPath({ uploadErr: { message: "Bucket not found" } });
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json() as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
    expect(body.error).toContain("Storage upload failed");
    expect(body.error).toContain("data-exports");
  });

  it("returns 500 and marks failed on signed URL error", async () => {
    setupHappyPath({
      uploadErr: null,
      signedData: null,
      signedErr: { message: "Signing key expired" },
    });
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json() as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
    expect(body.error).toContain("Signed URL creation failed");
  });

  it("returns ok:true processed:1 on full success", async () => {
    setupHappyPath();
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; processed: number; email_sent: boolean; request_id: string };
    expect(body.ok).toBe(true);
    expect(body.processed).toBe(1);
    expect(body.request_id).toBe("req-1");
    expect(body.email_sent).toBe(true);
    expect(mockSendEmail).toHaveBeenCalledTimes(1);
  });

  it("email failure is non-fatal — still returns ok:true processed:1", async () => {
    setupHappyPath();
    mockSendEmail.mockResolvedValue({ ok: false, error: "Resend rate limit" });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; processed: number; email_sent: boolean };
    expect(body.ok).toBe(true);
    expect(body.processed).toBe(1);
    expect(body.email_sent).toBe(false);
  });

  it("calls sendEmail with download URL and correct recipient", async () => {
    setupHappyPath();
    await GET(makeReq());
    const callArg = mockSendEmail.mock.calls[0]?.[0] as {
      to: string;
      subject: string;
      html: string;
    };
    expect(callArg.to).toBe("user@example.com");
    expect(callArg.subject).toContain("data export");
    expect(callArg.html).toContain("https://storage.example.com");
  });
});
