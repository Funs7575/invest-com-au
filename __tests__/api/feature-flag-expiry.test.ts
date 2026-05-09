import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// rls-isolation: feature_flags

const { mockFrom } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  return { mockFrom };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

vi.mock("@/lib/feature-flags", () => ({
  invalidateFlagCache: vi.fn(),
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: vi.fn(() => null),
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn() }),
}));

import { GET } from "@/app/api/cron/feature-flag-expiry/route";

function makeReq() {
  return new NextRequest("http://localhost/api/cron/feature-flag-expiry", {
    headers: { Authorization: "Bearer test" },
  });
}

describe("GET /api/cron/feature-flag-expiry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns archived: 0 when no candidates", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            lt: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
        }),
      }),
    });

    const res = await GET(makeReq());
    const body = await res.json();
    expect(body.archived).toBe(0);
  });

  it("archives eligible flags and invalidates cache", async () => {
    const { invalidateFlagCache } = await import("@/lib/feature-flags");

    const candidate = { flag_key: "old_flag", updated_at: "2025-01-01T00:00:00Z" };

    let callCount = 0;
    mockFrom.mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              is: vi.fn().mockReturnValue({
                lt: vi.fn().mockResolvedValue({ data: [candidate], error: null }),
              }),
            }),
          }),
        };
      }
      return {
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            is: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
        }),
      };
    });

    const res = await GET(makeReq());
    const body = await res.json();

    expect(body.archived).toBe(1);
    expect(body.archivedKeys).toContain("old_flag");
    expect(invalidateFlagCache).toHaveBeenCalledWith("old_flag");
  });

  it("returns 500 when fetch fails", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          is: vi.fn().mockReturnValue({
            lt: vi.fn().mockResolvedValue({
              data: null,
              error: { message: "DB offline" },
            }),
          }),
        }),
      }),
    });

    const res = await GET(makeReq());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("DB offline");
  });
});
