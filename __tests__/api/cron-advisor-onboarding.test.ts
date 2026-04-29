import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() })),
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: vi.fn(() => null),
}));

vi.mock("@/lib/email-templates", () => ({
  notificationFooter: vi.fn(() => "<footer>unsubscribe</footer>"),
}));

const mockFetch = vi.fn(() => Promise.resolve(new Response("ok", { status: 200 })));
vi.stubGlobal("fetch", mockFetch);

// DB queue consumed per from() call
interface DbResult { data?: unknown; error?: { message: string } | null }
const dbQueue: DbResult[] = [];
let dbIdx = 0;

function makeChain(res: DbResult) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "update", "eq", "lt", "not", "is", "in", "order", "limit"]) {
    c[m] = vi.fn(() => c);
  }
  c.then = (resolve: (v: { data: unknown; error: unknown }) => unknown) =>
    Promise.resolve(resolve({ data: res.data ?? null, error: res.error ?? null }));
  return c;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({
    from: vi.fn(() => makeChain(dbQueue[dbIdx++] ?? { data: null })),
  })),
}));

import { GET } from "@/app/api/cron/advisor-onboarding/route";
import { requireCronAuth } from "@/lib/cron-auth";

function makeReq(): Request {
  return new Request("http://localhost/api/cron/advisor-onboarding");
}

function makeAdvisor(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: "Alice Smith",
    email: "alice@example.com",
    slug: "alice-smith",
    onboarding_step: 0,
    onboarded_at: new Date(Date.now() - 3 * 86400000).toISOString(), // 3 days ago
    last_drip_at: null,
    booking_link: null,
    bio: null,
    profile_complete: false,
    ...overrides,
  };
}

const OLD_ENV = process.env;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/cron/advisor-onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbQueue.length = 0;
    dbIdx = 0;
    process.env = { ...OLD_ENV, RESEND_API_KEY: "re_test", NEXT_PUBLIC_SITE_URL: "https://invest.com.au" };
  });

  it("returns 401 when requireCronAuth rejects", async () => {
    vi.mocked(requireCronAuth).mockReturnValueOnce(
      new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }) as never,
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns 500 when RESEND_API_KEY is missing", async () => {
    delete process.env.RESEND_API_KEY;
    dbQueue.push({ data: [] });
    const res = await GET(makeReq());
    expect(res.status).toBe(500);
  });

  it("returns {sent: 0} when no advisors need drip", async () => {
    dbQueue.push({ data: [] });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json() as { sent: number; checked: number };
    expect(json.sent).toBe(0);
    expect(json.checked).toBe(0);
  });

  it("skips advisor with no email", async () => {
    dbQueue.push({ data: [makeAdvisor({ email: null })] });
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json() as { sent: number };
    expect(json.sent).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("skips advisor with no onboarded_at", async () => {
    dbQueue.push({ data: [makeAdvisor({ onboarded_at: null })] });
    const res = await GET(makeReq());
    const json = await res.json() as { sent: number };
    expect(json.sent).toBe(0);
  });

  it("skips advisor when step=0 but only 1 day since onboard (< 2 day threshold)", async () => {
    dbQueue.push({ data: [makeAdvisor({ onboarded_at: new Date(Date.now() - 1 * 86400000).toISOString(), onboarding_step: 0 })] });
    const res = await GET(makeReq());
    const json = await res.json() as { sent: number };
    expect(json.sent).toBe(0);
  });

  it("sends step-1 email and increments onboarding_step when day >= 2", async () => {
    dbQueue.push({ data: [makeAdvisor({ onboarding_step: 0 })] }); // advisors query
    dbQueue.push({ data: null }); // update call
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = await res.json() as { sent: number };
    expect(json.sent).toBe(1);
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({ method: "POST" }),
    );
    const body = JSON.parse((mockFetch.mock.calls[0][1] as { body: string }).body) as { subject: string };
    expect(body.subject).toContain("Alice Smith");
  });

  it("sends step-2 email for advisor at step=1 with >= 5 days", async () => {
    dbQueue.push({
      data: [makeAdvisor({ onboarding_step: 1, onboarded_at: new Date(Date.now() - 6 * 86400000).toISOString() })],
    });
    dbQueue.push({ data: null });
    const res = await GET(makeReq());
    const json = await res.json() as { sent: number };
    expect(json.sent).toBe(1);
    const body = JSON.parse((mockFetch.mock.calls[0][1] as { body: string }).body) as { subject: string };
    expect(body.subject).toMatch(/article/i);
  });

  it("continues processing other advisors when fetch throws", async () => {
    mockFetch
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValue(new Response("ok", { status: 200 }));
    const advisor1 = makeAdvisor({ id: 1, name: "Alice", email: "alice@ex.com" });
    const advisor2 = makeAdvisor({ id: 2, name: "Bob", email: "bob@ex.com" });
    dbQueue.push({ data: [advisor1, advisor2] });
    dbQueue.push({ data: null }); // update for advisor2
    const res = await GET(makeReq());
    const json = await res.json() as { sent: number };
    expect(json.sent).toBe(1);
  });
});
