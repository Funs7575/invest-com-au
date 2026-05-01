import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ── module mocks ──────────────────────────────────────────────────────────────
// vi.mock() factories are hoisted by vitest to the top of the file BEFORE any
// `const`/`let` declarations. Plain `const mock = vi.fn()` at module scope is
// undefined inside the factory closure at hoist time, which is exactly what
// the error "make sure there are no top level variables inside" was reporting.
// vi.hoisted() runs alongside the mock-hoist so the mocks are usable both
// inside the factory and in the test cases below.
const { mockGetUser, mockMaybeSingle, mockSingle } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockMaybeSingle: vi.fn(),
  mockSingle: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      or: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      single: mockSingle,
      maybeSingle: mockMaybeSingle,
    }),
  }),
}));

// Import the SUT AFTER vi.mock so the mocked modules resolve correctly.
import { requireAdvisorSession } from "@/lib/require-advisor-session";

// ── helpers ───────────────────────────────────────────────────────────────────

function makeRequest(cookies: Record<string, string> = {}): NextRequest {
  return {
    cookies: { get: (name: string) => (cookies[name] ? { value: cookies[name] } : undefined) },
  } as unknown as NextRequest;
}

const FUTURE = new Date(Date.now() + 3600_000).toISOString();
const PAST = new Date(Date.now() - 1000).toISOString();

// ── tests ─────────────────────────────────────────────────────────────────────

describe("requireAdvisorSession", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns advisorId for a linked Supabase Auth user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1", email: "a@test.com" } } });
    mockMaybeSingle.mockResolvedValue({ data: { id: 42 } });

    expect(await requireAdvisorSession(makeRequest())).toBe(42);
  });

  it("returns null when Supabase Auth user has no matching professional", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1", email: "a@test.com" } } });
    mockMaybeSingle.mockResolvedValue({ data: null });

    expect(await requireAdvisorSession(makeRequest())).toBeNull();
  });

  it("falls back to cookie session when no Supabase Auth user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockSingle.mockResolvedValue({ data: { professional_id: 7, expires_at: FUTURE } });

    expect(await requireAdvisorSession(makeRequest({ advisor_session: "tok-abc" }))).toBe(7);
  });

  it("rejects an expired cookie session", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockSingle.mockResolvedValue({ data: { professional_id: 7, expires_at: PAST } });

    expect(await requireAdvisorSession(makeRequest({ advisor_session: "tok-abc" }))).toBeNull();
  });

  it("returns null when no auth and no cookie", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    expect(await requireAdvisorSession(makeRequest())).toBeNull();
  });

  it("returns null when cookie session row is missing", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockSingle.mockResolvedValue({ data: null });

    expect(await requireAdvisorSession(makeRequest({ advisor_session: "bad" }))).toBeNull();
  });

  it("prefers Supabase Auth over cookie when both present", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "uid-2", email: "b@test.com" } } });
    mockMaybeSingle.mockResolvedValue({ data: { id: 99 } });

    const result = await requireAdvisorSession(
      makeRequest({ advisor_session: "should-not-be-used" }),
    );
    expect(result).toBe(99);
    expect(mockSingle).not.toHaveBeenCalled();
  });
});
