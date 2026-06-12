import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Hoisted mock refs ─────────────────────────────────────────────────────────

const { mockRequireAdvisorSession, mockAdminFrom, mockIsRateLimited } = vi.hoisted(() => ({
  mockRequireAdvisorSession: vi.fn<(...args: unknown[]) => Promise<number | null>>(async () => 42),
  mockAdminFrom: vi.fn<(...args: unknown[]) => unknown>(),
  mockIsRateLimited: vi.fn<(...args: unknown[]) => Promise<boolean>>(async () => false),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: (...args: unknown[]) => mockRequireAdvisorSession(...args),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: (...args: unknown[]) => mockIsRateLimited(...args),
}));

import { GET, POST } from "@/app/api/advisor-portal/embed-kit/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeBuilder(data: unknown = null) {
  const c: Record<string, unknown> = {};
  for (const m of ["select", "eq", "maybeSingle"]) c[m] = vi.fn(() => c);
  c.maybeSingle = vi.fn(() => Promise.resolve({ data, error: null }));
  return c;
}

function makeReq(body?: unknown): NextRequest {
  return new NextRequest("http://localhost/api/advisor-portal/embed-kit", {
    method: body === undefined ? "GET" : "POST",
    headers: { "Content-Type": "application/json", "x-forwarded-for": "9.9.9.9" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

const ADVISOR = { id: 42, slug: "jane-smith-cfp", name: "Jane Smith CFP", status: "active" };

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdvisorSession.mockResolvedValue(42);
  mockIsRateLimited.mockResolvedValue(false);
  // Token signing needs a secret.
  process.env.ADVISOR_EMBED_TOKEN_SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef";
});

describe("GET /api/advisor-portal/embed-kit", () => {
  it("401s when not authenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
  });

  it("returns slug, token and snippets for the logged-in adviser", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder(ADVISOR));
    const res = await GET(makeReq());
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      configured: boolean;
      slug: string;
      active: boolean;
      token: string;
      snippets: Array<{ type: string; scriptHtml: string }>;
    };
    expect(json.configured).toBe(true);
    expect(json.slug).toBe("jane-smith-cfp");
    expect(json.active).toBe(true);
    expect(json.token.startsWith("aet1.")).toBe(true);
    expect(json.snippets.map((s) => s.type).sort()).toEqual(["badge", "book", "reviews"]);
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("marks active:false for a pending adviser", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder({ ...ADVISOR, status: "pending" }));
    const res = await GET(makeReq());
    const json = (await res.json()) as { active: boolean };
    expect(json.active).toBe(false);
  });

  it("503s with configured:false when no signing secret is set", async () => {
    delete process.env.ADVISOR_EMBED_TOKEN_SECRET;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const res = await GET(makeReq());
    expect(res.status).toBe(503);
    const json = (await res.json()) as { configured: boolean };
    expect(json.configured).toBe(false);
  });

  it("404s when the adviser row is missing", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder(null));
    const res = await GET(makeReq());
    expect(res.status).toBe(404);
  });
});

describe("POST /api/advisor-portal/embed-kit (regenerate)", () => {
  it("401s when not authenticated", async () => {
    mockRequireAdvisorSession.mockResolvedValue(null);
    const res = await POST(makeReq({ regenerate: true }));
    expect(res.status).toBe(401);
  });

  it("mints a fresh token + snippets", async () => {
    mockAdminFrom.mockReturnValue(makeBuilder(ADVISOR));
    const res = await POST(makeReq({ regenerate: true }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { token: string; snippets: unknown[] };
    expect(json.token.startsWith("aet1.")).toBe(true);
    expect(json.snippets).toHaveLength(3);
  });

  it("429s when the regenerate control is hammered", async () => {
    mockIsRateLimited.mockResolvedValue(true);
    const res = await POST(makeReq({ regenerate: true }));
    expect(res.status).toBe(429);
  });
});
