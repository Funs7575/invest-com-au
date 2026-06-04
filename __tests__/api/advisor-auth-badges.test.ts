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

vi.mock("@/lib/logger", () => ({
  logger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

import { GET } from "@/app/api/advisor-auth/badges/route";
import { isRateLimited } from "@/lib/rate-limit";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeGet(): NextRequest {
  return new NextRequest("http://localhost/api/advisor-auth/badges", {
    method: "GET",
    headers: { "x-forwarded-for": "1.2.3.4" },
  });
}

function resetCalls() {
  for (const k of Object.keys(supabaseCalls)) delete supabaseCalls[k];
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/advisor-auth/badges", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCalls();
    mockAdminFrom.mockReset();
    mockAdminFrom.mockImplementation((table: string) =>
      createChainableBuilder(table, supabaseCalls),
    );
    mockRequireAdvisorSession.mockResolvedValue(null);
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValue(false);
  });

  it("returns 429 when rate limited", async () => {
    (isRateLimited as ReturnType<typeof vi.fn>).mockResolvedValueOnce(true);
    const res = await GET(makeGet());
    expect(res.status).toBe(429);
  });

  it("returns 401 when not authenticated", async () => {
    const res = await GET(makeGet());
    expect(res.status).toBe(401);
  });

  it("returns badges for the authenticated advisor", async () => {
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "advisor_badges") {
        b.order = vi.fn(() =>
          Promise.resolve({
            data: [
              { id: 1, badge_type: "verified", earned_at: "2024-02-01" },
              { id: 2, badge_type: "top_rated", earned_at: "2024-01-01" },
            ],
            error: null,
          }),
        );
      }
      return b;
    });

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.badges).toHaveLength(2);
  });

  it("returns an empty array when there are no badges", async () => {
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "advisor_badges") {
        b.order = vi.fn(() => Promise.resolve({ data: null, error: null }));
      }
      return b;
    });

    const res = await GET(makeGet());
    expect(res.status).toBe(200);
    expect((await res.json()).badges).toEqual([]);
  });

  it("returns 500 when the badges query errors", async () => {
    mockRequireAdvisorSession.mockResolvedValue(42);
    mockAdminFrom.mockImplementation((table: string) => {
      const b = createChainableBuilder(table, supabaseCalls);
      if (table === "advisor_badges") {
        b.order = vi.fn(() =>
          Promise.resolve({ data: null, error: { message: "db error" } }),
        );
      }
      return b;
    });

    const res = await GET(makeGet());
    expect(res.status).toBe(500);
  });
});
