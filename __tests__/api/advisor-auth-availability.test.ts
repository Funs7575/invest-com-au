import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { createChainableBuilder } from "@/__tests__/helpers";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockAdminFrom = vi.fn();
const supabaseCalls: Record<string, { method: string; args: unknown[] }[]> = {};

// vi.hoisted() — vi.mock factories are hoisted; the captured fn must be too.
const { mockRequireAdvisorSession } = vi.hoisted(() => ({
  mockRequireAdvisorSession: vi.fn(),
}));

vi.mock("@/lib/require-advisor-session", () => ({
  requireAdvisorSession: mockRequireAdvisorSession,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

vi.mock("@/lib/rate-limit", () => ({
  isRateLimited: vi.fn(() => Promise.resolve(false)),
}));

import { GET, PATCH } from "@/app/api/advisor-auth/availability/route";
import { isRateLimited } from "@/lib/rate-limit";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeGet(): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/availability", {
    method: "GET",
    headers: { "x-forwarded-for": "1.2.3.4" },
  });
}

function makePatch(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/availability", {
    method: "PATCH",
    body: typeof body === "string" ? body : JSON.stringify(body),
    headers: { "Content-Type": "application/json", "x-forwarded-for": "1.2.3.4" },
  });
}

function resetCalls() {
  for (const k of Object.keys(supabaseCalls)) delete supabaseCalls[k];
}

function baseBeforeEach() {
  vi.clearAllMocks();
  resetCalls();
  mockAdminFrom.mockReset();
  mockAdminFrom.mockImplementation((table: string) =>
    createChainableBuilder(table, supabaseCalls),
  );
  mockRequireAdvisorSession.mockResolvedValue(null);
  (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("PATCH /api/advisor-auth/availability", () => {
  beforeEach(baseBeforeEach);

  it("returns 400 on invalid JSON body", async () => {
    const res = await PATCH(makePatch("not-json"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Invalid JSON body/);
  });

  it("returns 400 for an invalid status value", async () => {
    const res = await PATCH(makePatch({ status: "vacationing" }));
    expect(res.status).toBe(400);
  });

  it("returns 401 when not authenticated", async () => {
    const res = await PATCH(makePatch({ status: "open" }));
    expect(res.status).toBe(401);
  });

  it("returns 429 when rate limited", async () => {
    mockRequireAdvisorSession.mockResolvedValue(42);
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);
    const res = await PATCH(makePatch({ status: "open" }));
    expect(res.status).toBe(429);
  });

  it("updates availability and returns the new status", async () => {
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professionals") {
        b.update = vi.fn(() => {
          supabaseCalls[table]?.push({ method: "update", args: [] });
          return {
            eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
          };
        });
      }
      return b;
    });

    const res = await PATCH(makePatch({ status: "waitlist" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(json.status).toBe("waitlist");
  });

  it("returns 500 when the update errors", async () => {
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professionals") {
        b.update = vi.fn(() => ({
          eq: vi.fn(() =>
            Promise.resolve({ data: null, error: { message: "db error" } }),
          ),
        }));
      }
      return b;
    });

    const res = await PATCH(makePatch({ status: "closed" }));
    expect(res.status).toBe(500);
  });
});

describe("GET /api/advisor-auth/availability", () => {
  beforeEach(baseBeforeEach);

  it("returns 401 when not authenticated", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("returns the stored availability status", async () => {
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professionals") {
        b.single = vi.fn(() =>
          Promise.resolve({ data: { availability_status: "waitlist" }, error: null }),
        );
      }
      return b;
    });

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("waitlist");
  });

  it("falls back to 'open' when status is null", async () => {
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professionals") {
        b.single = vi.fn(() =>
          Promise.resolve({ data: { availability_status: null }, error: null }),
        );
      }
      return b;
    });

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("open");
  });

  it("returns 500 when the fetch errors", async () => {
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "professionals") {
        b.single = vi.fn(() =>
          Promise.resolve({ data: null, error: { message: "db error" } }),
        );
      }
      return b;
    });

    const res = await GET(makeGet());
    expect(res.status).toBe(500);
  });
});
