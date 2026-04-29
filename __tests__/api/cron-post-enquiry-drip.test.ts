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

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: vi.fn(() => null),
}));

vi.mock("@/lib/email-templates", () => ({
  notificationFooter: vi.fn(() => ""),
}));

const fetchMock = vi.fn<() => Promise<Response>>();
vi.stubGlobal("fetch", fetchMock);

// ─── DB queue ────────────────────────────────────────────────────────────────

interface DbResult {
  data?: unknown;
  error?: { message: string } | null;
}

let dbQueue: DbResult[] = [];
let dbIdx = 0;

function makeChain(res: DbResult) {
  const chain: Record<string, unknown> = {};
  const methods = ["select","update","insert","eq","neq","lt","lte","gte","not","in","or","is","order","limit"];
  for (const m of methods) chain[m] = vi.fn(() => chain);
  const r = { data: res.data ?? null, error: res.error ?? null };
  chain.then = (resolve: (v: typeof r) => unknown) => Promise.resolve(resolve(r));
  chain.catch = () => chain;
  return chain;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => makeChain(dbQueue[dbIdx++] ?? { error: null })),
  })),
}));

import { GET } from "@/app/api/cron/post-enquiry-drip/route";
import { requireCronAuth } from "@/lib/cron-auth";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/post-enquiry-drip", {
    headers: { Authorization: "Bearer test-secret" },
  }) as unknown as NextRequest;
}

const TWO_DAYS_AGO = new Date(Date.now() - 2 * 86400000).toISOString();
const FOUR_DAYS_AGO = new Date(Date.now() - 4 * 86400000).toISOString();

function lead(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    user_name: "Alice Smith",
    user_email: "alice@example.com",
    professional_id: "pro-1",
    source_page: "/find-advisor",
    created_at: TWO_DAYS_AGO,
    post_drip_step: 0,
    ...overrides,
  };
}

function pro(overrides: Record<string, unknown> = {}) {
  return {
    id: "pro-1",
    name: "Bob Jones",
    slug: "bob-jones",
    email: "bob@advisor.com",
    type: "financial_planner",
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

describe("GET /api/cron/post-enquiry-drip", () => {
  it("returns 401 when cron auth fails", async () => {
    vi.mocked(requireCronAuth).mockReturnValueOnce(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }) as never
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 500 when RESEND_API_KEY is absent", async () => {
    delete process.env.RESEND_API_KEY;
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });

  it("returns zero counts when no leads exist", async () => {
    dbQueue.push({ data: [] }); // professional_leads (user drips)
    // professionals fetch skipped (proIds empty)
    dbQueue.push({ data: [] }); // professional_leads (nudge leads)
    // nudge professionals fetch skipped

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { sent: number; checked: number; advisor_nudges_sent: number };
    expect(body.sent).toBe(0);
    expect(body.checked).toBe(0);
    expect(body.advisor_nudges_sent).toBe(0);
  });

  it("sends step-0 drip email and advances step to 1", async () => {
    dbQueue.push({ data: [lead()] });          // leads (step=0, 2 days old → step 1 eligible)
    dbQueue.push({ data: [pro()] });           // professionals lookup
    // fetch email → ok (fetchMock resolves 200)
    dbQueue.push({ error: null });             // update post_drip_step=1
    dbQueue.push({ data: [] });                // nudge leads (empty)

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { sent: number };
    expect(body.sent).toBe(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("skips lead with no email address", async () => {
    dbQueue.push({ data: [lead({ user_email: null })] }); // lead without email
    // professionals lookup skipped because proIds has entries but lead is skipped
    dbQueue.push({ data: [{ id: "pro-1", name: "Bob", slug: "bob", type: "financial_planner" }] });
    dbQueue.push({ data: [] }); // nudge leads

    const res = await GET(makeReq());
    const body = await res.json() as { sent: number };
    expect(body.sent).toBe(0);
  });

  it("sends advisor nudge email for 3+ day old lead with no nudge sent", async () => {
    dbQueue.push({ data: [] }); // user drip leads (empty)
    const nudgeLead = {
      id: 5,
      user_name: "Carol White",
      professional_id: "pro-2",
      created_at: FOUR_DAYS_AGO,
    };
    dbQueue.push({ data: [nudgeLead] }); // nudge leads
    dbQueue.push({ data: [{ id: "pro-2", name: "Dan Advisor", email: "dan@firm.com" }] }); // nudge pros
    // fetch nudge email
    dbQueue.push({ error: null }); // update advisor_nudge_sent_at

    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const body = await res.json() as { advisor_nudges_sent: number };
    expect(body.advisor_nudges_sent).toBe(1);
  });

  it("auto-advances step-2 lead when advisor type has no cross-sells", async () => {
    // Lead at step=2, 14+ days old, advisor type with no cross-sell mapping
    const l = lead({ post_drip_step: 2, created_at: new Date(Date.now() - 15 * 86400000).toISOString() });
    dbQueue.push({ data: [l] });
    dbQueue.push({ data: [pro({ type: "unknown_type" })] }); // pro with unmapped type
    dbQueue.push({ error: null }); // update post_drip_step=3 (auto-advance)
    dbQueue.push({ data: [] }); // nudge leads

    const res = await GET(makeReq());
    const body = await res.json() as { sent: number };
    // auto-advance skips the email; sent stays 0
    expect(body.sent).toBe(0);
  });
});
