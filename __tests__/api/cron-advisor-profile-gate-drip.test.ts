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

vi.mock("@/lib/url", () => ({ getSiteUrl: () => "https://invest.com.au" }));
vi.mock("@/lib/html-escape", () => ({ escapeHtml: (s: unknown) => String(s ?? "") }));

const fetchMock = vi.fn<() => Promise<Response>>();
vi.stubGlobal("fetch", fetchMock);

// ─── DB queue ────────────────────────────────────────────────────────────────

interface DbResult {
  data?: unknown;
  error?: { message: string } | null;
  count?: number | null;
}

let dbQueue: DbResult[] = [];
let dbIdx = 0;

function makeChain(res: DbResult) {
  const chain: Record<string, unknown> = {};
  const methods = ["select","update","insert","eq","neq","lt","lte","gte","not","in","or","limit","maybeSingle","single"];
  for (const m of methods) chain[m] = vi.fn(() => chain);
  const r = { data: res.data ?? null, error: res.error ?? null, count: res.count ?? null };
  chain.then = (resolve: (v: typeof r) => unknown) => Promise.resolve(resolve(r));
  chain.catch = () => chain;
  return chain;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => makeChain(dbQueue[dbIdx++] ?? { error: null })),
  })),
}));

import { GET } from "@/app/api/cron/advisor-profile-gate-drip/route";
import { requireCronAuth } from "@/lib/cron-auth";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/advisor-profile-gate-drip", {
    headers: { Authorization: "Bearer test-secret" },
  }) as unknown as NextRequest;
}

const DAY1_AGO = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
const DAY3_AGO = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
const DAY22_AGO = new Date(Date.now() - 22 * 24 * 60 * 60 * 1000).toISOString();

function advisor(overrides: Record<string, unknown> = {}) {
  return {
    id: "adv-1",
    name: "Alice Smith",
    email: "alice@example.com",
    status: "pending",
    profile_quality_gate: "pending",
    profile_missing_fields: ["bio"],
    profile_gate_checked_at: DAY1_AGO,
    profile_gate_step: 0,
    ...overrides,
  };
}

function freshProfile(overrides: Record<string, unknown> = {}) {
  return {
    name: "Alice Smith",
    bio: "I am an experienced financial advisor with over 10 years helping clients.",
    photo_url: "https://example.com/photo.jpg",
    phone: "0400123456",
    website: "https://example.com",
    specialties: ["SMSF", "retirement"],
    fee_description: "Fixed fee",
    location_state: "NSW",
    ...overrides,
  };
}

beforeEach(() => {
  dbQueue = [];
  dbIdx = 0;
  vi.clearAllMocks();
  process.env.RESEND_API_KEY = "test-key";
  fetchMock.mockResolvedValue(new Response("ok", { status: 200 }));
});

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/cron/advisor-profile-gate-drip", () => {
  it("returns 401 when cron auth fails", async () => {
    vi.mocked(requireCronAuth).mockReturnValueOnce(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }) as never
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 500 when professionals fetch fails", async () => {
    dbQueue.push({ error: { message: "DB error" } }); // professionals query
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json() as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
    expect(body.error).toBe("fetch_failed");
  });

  it("returns ok with zero stats when no pending advisors", async () => {
    dbQueue.push({ data: [] }); // professionals empty
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; scanned: number };
    expect(body.ok).toBe(true);
    expect(body.scanned).toBe(0);
  });

  it("unlocks advisor when profile is complete and sends congratulations email", async () => {
    dbQueue.push({ data: [advisor()] });                 // professionals list
    dbQueue.push({ data: freshProfile() });              // fresh profile (all fields populated)
    dbQueue.push({ error: null });                       // update profile_quality_gate=passed
    // No additional DB calls — sendEmail fire-and-forget

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; unlocked: number };
    expect(body.ok).toBe(true);
    expect(body.unlocked).toBe(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("sends day-1 drip email to advisor with missing fields at step 0", async () => {
    const a = advisor({ profile_gate_checked_at: DAY1_AGO, profile_gate_step: 0 });
    dbQueue.push({ data: [a] });
    // fresh profile still missing bio
    dbQueue.push({ data: freshProfile({ bio: "" }) });
    dbQueue.push({ error: null }); // update profile_missing_fields
    dbQueue.push({ error: null }); // update profile_gate_step

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; drip1: number };
    expect(body.drip1).toBe(1);
  });

  it("archives advisor whose profile has been pending for 21+ days", async () => {
    const a = advisor({ profile_gate_checked_at: DAY22_AGO });
    dbQueue.push({ data: [a] });
    dbQueue.push({ data: freshProfile({ bio: "" }) }); // still missing
    dbQueue.push({ error: null }); // update profile_missing_fields
    // daysSince >= 21 → archive path
    dbQueue.push({ error: null }); // update status=incomplete

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; archived: number };
    expect(body.archived).toBe(1);
  });

  it("skips drip step when advisor already received that step", async () => {
    // profile_gate_step=1 and daysSince=1 → step would be 1, already sent
    const a = advisor({ profile_gate_checked_at: DAY1_AGO, profile_gate_step: 1 });
    dbQueue.push({ data: [a] });
    dbQueue.push({ data: freshProfile({ bio: "" }) });
    dbQueue.push({ error: null }); // update missing fields

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { ok: boolean; drip1: number };
    expect(body.drip1).toBe(0); // no new step sent
  });

  it("does not send email when RESEND_API_KEY is absent", async () => {
    const savedKey = process.env.RESEND_API_KEY;
    delete process.env.RESEND_API_KEY;

    dbQueue.push({ data: [advisor({ profile_gate_checked_at: DAY3_AGO, profile_gate_step: 0 })] });
    dbQueue.push({ data: freshProfile({ bio: "" }) });
    dbQueue.push({ error: null }); // update missing fields
    dbQueue.push({ error: null }); // update step

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();

    process.env.RESEND_API_KEY = savedKey;
  });
});
