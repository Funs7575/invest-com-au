import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks (vi.mock factories are hoisted, so vars must be too) ─────────

const { mockCreateClient } = vi.hoisted(() => ({
  mockCreateClient: vi.fn(),
}));

// ── Module mocks ───────────────────────────────────────────────────────────────

vi.mock("@supabase/supabase-js", () => ({
  createClient: mockCreateClient,
}));

import { GET } from "@/app/api/quiz/data/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makeSupabaseClient(
  brokerResult: { data: unknown; error: unknown },
  weightsResult: { data: unknown; error: unknown },
) {
  const brokerBuilder = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue(brokerResult),
  };
  const weightsBuilder = {
    select: vi.fn().mockResolvedValue(weightsResult),
  };
  return {
    from: vi.fn().mockImplementation((table: string) =>
      table === "brokers" ? brokerBuilder : weightsBuilder,
    ),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_SUPABASE_URL = "https://test.supabase.co";
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("GET /api/quiz/data", () => {
  it("returns 503 when NEXT_PUBLIC_SUPABASE_URL is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    const res = await GET();
    expect(res.status).toBe(503);
    expect(await res.text()).toBe("Service unavailable");
  });

  it("returns 503 when NEXT_PUBLIC_SUPABASE_ANON_KEY is missing", async () => {
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const res = await GET();
    expect(res.status).toBe(503);
  });

  it("returns 502 when broker query errors", async () => {
    mockCreateClient.mockReturnValue(
      makeSupabaseClient(
        { data: null, error: { message: "db error" } },
        { data: [], error: null },
      ),
    );
    const res = await GET();
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("Failed to load quiz data");
  });

  it("returns 200 with brokers + quiz_weights on success", async () => {
    const brokers = [{ id: 1, name: "CommSec", status: "active", rating: 4.5 }];
    const weights = [{ id: 1, category: "fees", weight: 0.3 }];
    mockCreateClient.mockReturnValue(
      makeSupabaseClient(
        { data: brokers, error: null },
        { data: weights, error: null },
      ),
    );
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.brokers).toEqual(brokers);
    expect(body.quiz_weights).toEqual(weights);
  });

  it("returns Cache-Control header with stale-while-revalidate", async () => {
    mockCreateClient.mockReturnValue(
      makeSupabaseClient({ data: [], error: null }, { data: [], error: null }),
    );
    const res = await GET();
    const cc = res.headers.get("Cache-Control");
    expect(cc).toContain("max-age=60");
    expect(cc).toContain("stale-while-revalidate=300");
    expect(cc).toContain("public");
  });

  it("returns empty quiz_weights array when weights query errors", async () => {
    mockCreateClient.mockReturnValue(
      makeSupabaseClient(
        { data: [{ id: 1, name: "CommSec" }], error: null },
        { data: null, error: { message: "weights error" } },
      ),
    );
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.quiz_weights).toEqual([]);
  });

  it("uses anon key (not service-role) so RLS restricts to active brokers", async () => {
    let capturedKey: string | undefined;
    mockCreateClient.mockImplementation((_url: string, key: string) => {
      capturedKey = key;
      return makeSupabaseClient({ data: [], error: null }, { data: [], error: null });
    });
    await GET();
    expect(capturedKey).toBe("anon-key");
  });
});
