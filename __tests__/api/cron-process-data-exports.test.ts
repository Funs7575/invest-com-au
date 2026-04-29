import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@/lib/cron-run-log", () => ({
  wrapCronHandler: (_name: string, h: unknown) => h,
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: vi.fn(() => null),
}));

vi.mock("@/lib/resend", () => ({
  sendEmail: vi.fn().mockResolvedValue({ ok: true }),
}));

// ─── DB queue ────────────────────────────────────────────────────────────────

interface DbResult {
  data?: unknown;
  error?: { message: string; code?: string } | null;
}

let dbQueue: DbResult[] = [];
let dbIdx = 0;

function makeChain(res: DbResult) {
  const chain: Record<string, unknown> = {};
  const methods = ["select","update","insert","eq","neq","lt","lte","gte","not","in","or","order","limit","maybeSingle","single"];
  for (const m of methods) chain[m] = vi.fn(() => chain);
  const r = { data: res.data ?? null, error: res.error ?? null };
  chain.then = (resolve: (v: typeof r) => unknown) => Promise.resolve(resolve(r));
  chain.catch = () => chain;
  return chain;
}

// Storage and auth.admin mock state
const storageMock = {
  upload: vi.fn(),
  createSignedUrl: vi.fn(),
};

const authAdminMock = {
  getUserById: vi.fn(),
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => makeChain(dbQueue[dbIdx++] ?? { error: null })),
    storage: {
      from: vi.fn(() => storageMock),
    },
    auth: {
      admin: authAdminMock,
    },
  })),
}));

import { GET } from "@/app/api/cron/process-data-exports/route";
import { requireCronAuth } from "@/lib/cron-auth";
import { sendEmail } from "@/lib/resend";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/process-data-exports", {
    headers: { Authorization: "Bearer test-secret" },
  }) as unknown as NextRequest;
}

const PENDING_REQUEST = {
  id: 42,
  user_id: "user-uuid-1",
  email: "alice@example.com",
  requested_at: new Date(Date.now() - 3600000).toISOString(),
};

const USER_ID_TABLES_COUNT = 13;
const USER_EMAIL_TABLES_COUNT = 2;

beforeEach(() => {
  dbQueue = [];
  dbIdx = 0;
  vi.clearAllMocks();
  storageMock.upload.mockResolvedValue({ error: null });
  storageMock.createSignedUrl.mockResolvedValue({
    data: { signedUrl: "https://storage.example.com/signed?token=abc" },
    error: null,
  });
  authAdminMock.getUserById.mockResolvedValue({ data: { user: null } });
  vi.mocked(sendEmail).mockResolvedValue({ ok: true } as never);
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/cron/process-data-exports", () => {
  it("returns 401 when cron auth fails", async () => {
    vi.mocked(requireCronAuth).mockReturnValueOnce(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }) as never
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns ok with processed:0 when no pending requests (PGRST116 code)", async () => {
    dbQueue.push({ data: null, error: { message: "no rows", code: "PGRST116" } });

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; processed: number };
    expect(body.ok).toBe(true);
    expect(body.processed).toBe(0);
  });

  it("returns ok with note=table_not_found when migration not applied", async () => {
    dbQueue.push({ data: null, error: { message: "relation does not exist", code: "" } });

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; note?: string };
    expect(body.ok).toBe(true);
    expect(body.note).toBe("table_not_found");
  });

  it("returns 500 on unexpected DB error during pending query", async () => {
    dbQueue.push({ data: null, error: { message: "connection timeout" } });

    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });

  it("returns ok with processed:0 when request already claimed (race condition)", async () => {
    // Step 1: found pending
    dbQueue.push({ data: PENDING_REQUEST });
    // Step 2: claim update returns null (already taken by another instance)
    dbQueue.push({ data: null, error: { message: "no rows updated" } });

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; processed: number };
    expect(body.ok).toBe(true);
    expect(body.processed).toBe(0);
  });

  it("returns 500 and marks failed when storage upload fails", async () => {
    // Step 1: found pending
    dbQueue.push({ data: PENDING_REQUEST });
    // Step 2: claim → ok
    dbQueue.push({ data: PENDING_REQUEST });
    // Step 3: gatherUserData — auth.admin + USER_ID_TABLES + USER_EMAIL_TABLES
    for (let i = 0; i < USER_ID_TABLES_COUNT + USER_EMAIL_TABLES_COUNT; i++) {
      dbQueue.push({ data: [] });
    }
    // Step 4: storage upload fails
    storageMock.upload.mockResolvedValueOnce({ error: { message: "Bucket not found" } });
    // markFailed: update data_export_requests
    dbQueue.push({ error: null });

    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });

  it("processes export successfully and returns processed:1", async () => {
    // Step 1: found pending
    dbQueue.push({ data: PENDING_REQUEST });
    // Step 2: claim
    dbQueue.push({ data: PENDING_REQUEST });
    // Step 3: gatherUserData — USER_ID_TABLES + USER_EMAIL_TABLES
    for (let i = 0; i < USER_ID_TABLES_COUNT + USER_EMAIL_TABLES_COUNT; i++) {
      dbQueue.push({ data: [] });
    }
    // Step 5: storage upload → ok (mock already set in beforeEach)
    // Step 6: createSignedUrl → ok (mock already set)
    // Step 7: sendEmail (via lib/resend mock)
    // Step 8: mark ready → ok
    dbQueue.push({ error: null });

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; processed: number; email_sent: boolean };
    expect(body.ok).toBe(true);
    expect(body.processed).toBe(1);
    expect(body.email_sent).toBe(true);
    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({ to: "alice@example.com" })
    );
  });
});
