import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({ logger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() }) }));
vi.mock("@/lib/cron-run-log", () => ({ wrapCronHandler: (_n: string, h: unknown) => h }));
vi.mock("@/lib/cron-auth", () => ({ requireCronAuth: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/resend", () => ({ sendEmail: vi.fn() }));

import { GET } from "@/app/api/cron/process-data-exports/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/resend";

const mockRequireCronAuth = vi.mocked(requireCronAuth);
const mockCreateAdmin = vi.mocked(createAdminClient);
const mockSendEmail = vi.mocked(sendEmail);

function makeChain(res: unknown) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "update", "eq", "in", "order", "limit"]) {
    c[m] = vi.fn(() => c);
  }
  c.single = vi.fn(() => Promise.resolve(res));
  c.then = (resolve: (v: unknown) => void) => Promise.resolve(resolve(res));
  return c;
}

function makeReq() {
  return new NextRequest("http://localhost/api/cron/process-data-exports", { method: "GET" });
}

function makeAdminClient(opts: {
  selectPendingResult: unknown;
  claimResult?: unknown;
  uploadResult?: { error: null | { message: string } };
  signedUrlResult?: unknown;
  updateFinalResult?: unknown;
  getUserByIdResult?: unknown;
}) {
  let call = 0;
  const mockStorage = {
    from: vi.fn(() => ({
      upload: vi.fn().mockResolvedValue(opts.uploadResult ?? { error: null }),
      createSignedUrl: vi.fn().mockResolvedValue(
        opts.signedUrlResult ?? { data: { signedUrl: "https://storage.example.com/file.json" }, error: null }
      ),
    })),
  };
  const mockAuth = {
    admin: {
      getUserById: vi.fn().mockResolvedValue(
        opts.getUserByIdResult ?? {
          data: {
            user: {
              id: "user-1", email: "user@ex.com", created_at: new Date().toISOString(),
              updated_at: null, email_confirmed_at: null, last_sign_in_at: null, user_metadata: {},
            },
          },
        }
      ),
    },
  };
  return {
    from: vi.fn(() => {
      call++;
      if (call === 1) return makeChain(opts.selectPendingResult); // .single() — select pending
      if (call === 2) return makeChain(opts.claimResult ?? opts.selectPendingResult); // .single() — claim update
      // calls 3–17: user data table queries (USER_ID_TABLES + USER_EMAIL_TABLES)
      if (call === 18) return makeChain(opts.updateFinalResult ?? { data: null, error: null }); // final update
      return makeChain({ data: [], error: null }); // user data tables
    }),
    storage: mockStorage,
    auth: mockAuth,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
  mockRequireCronAuth.mockReturnValue(undefined as never);
  mockSendEmail.mockResolvedValue({ ok: true } as never);
});

describe("GET /api/cron/process-data-exports", () => {
  it("returns 401 when cron auth fails", async () => {
    mockRequireCronAuth.mockReturnValue(new Response(null, { status: 401 }) as never);
    mockCreateAdmin.mockReturnValue({} as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns processed:0 when no pending requests (PGRST116)", async () => {
    mockCreateAdmin.mockReturnValue(makeAdminClient({
      selectPendingResult: { data: null, error: { code: "PGRST116", message: "no rows" } },
    }) as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.processed).toBe(0);
  });

  it("returns processed:0 when table does not exist", async () => {
    mockCreateAdmin.mockReturnValue(makeAdminClient({
      selectPendingResult: { data: null, error: { code: "42P01", message: "relation data_export_requests does not exist" } },
    }) as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.note).toBe("table_not_found");
  });

  it("returns 500 on unexpected select error", async () => {
    mockCreateAdmin.mockReturnValue(makeAdminClient({
      selectPendingResult: { data: null, error: { code: "500", message: "connection failed" } },
    }) as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });

  it("returns processed:0 when request already claimed by another instance", async () => {
    const pending = { id: 1, user_id: "u1", email: "u@ex.com", requested_at: new Date().toISOString() };
    mockCreateAdmin.mockReturnValue(makeAdminClient({
      selectPendingResult: { data: pending, error: null },
      claimResult: { data: null, error: { message: "no rows updated" } }, // claim fails → already taken
    }) as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.processed).toBe(0);
  });

  it("returns 500 when storage upload fails", async () => {
    const pending = { id: 2, user_id: "u2", email: "u2@ex.com", requested_at: new Date().toISOString() };
    mockCreateAdmin.mockReturnValue(makeAdminClient({
      selectPendingResult: { data: pending, error: null },
      uploadResult: { error: { message: "Bucket not found" } },
    }) as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toMatch(/Bucket not found/);
  });

  it("returns 500 when signed URL creation fails", async () => {
    const pending = { id: 3, user_id: "u3", email: "u3@ex.com", requested_at: new Date().toISOString() };
    mockCreateAdmin.mockReturnValue(makeAdminClient({
      selectPendingResult: { data: pending, error: null },
      signedUrlResult: { data: null, error: { message: "sign failed" } },
    }) as never);
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });

  it("processes export successfully and returns processed:1", async () => {
    const pending = { id: 4, user_id: "u4", email: "u4@ex.com", requested_at: new Date().toISOString() };
    mockCreateAdmin.mockReturnValue(makeAdminClient({
      selectPendingResult: { data: pending, error: null },
    }) as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.processed).toBe(1);
    expect(body.request_id).toBe(4);
    expect(body.email_sent).toBe(true);
    expect(mockSendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "u4@ex.com" }));
  });

  it("completes export even when sendEmail fails (non-fatal)", async () => {
    mockSendEmail.mockResolvedValue({ ok: false, error: "rate limited" } as never);
    const pending = { id: 5, user_id: "u5", email: "u5@ex.com", requested_at: new Date().toISOString() };
    mockCreateAdmin.mockReturnValue(makeAdminClient({
      selectPendingResult: { data: pending, error: null },
    }) as never);
    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.processed).toBe(1);
    expect(body.email_sent).toBe(false);
  });
});
