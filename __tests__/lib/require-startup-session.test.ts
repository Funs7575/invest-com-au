import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
const mockMaybeSingle = vi.fn();
const mockSingle = vi.fn();

const mockAdminFrom = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  in: vi.fn().mockReturnThis(),
  maybeSingle: mockMaybeSingle,
  single: mockSingle,
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () =>
    Promise.resolve({ auth: { getUser: mockGetUser } }),
}));

// ─── Import after mocks ───────────────────────────────────────────────────────

import { requireStartupSession } from "@/lib/require-startup-session";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeRequest(cookies: Record<string, string> = {}): NextRequest {
  return {
    cookies: {
      get: (name: string) =>
        cookies[name] ? { value: cookies[name] } : undefined,
    },
  } as unknown as NextRequest;
}

function futureDate(offsetMs = 60_000): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

function pastDate(): string {
  return new Date(Date.now() - 60_000).toISOString();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("requireStartupSession — JWT path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns startup id when user has an active JWT + matching startup_profiles row", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "uid-1", email: "founder@example.com" } } });
    mockMaybeSingle.mockResolvedValue({ data: { id: "sp-uuid-1" }, error: null });

    const result = await requireStartupSession(makeRequest());

    expect(result).toBe("sp-uuid-1");
    expect(mockAdminFrom).toHaveBeenCalledWith("startup_profiles");
  });

  it("returns startup id for a draft-status startup profile", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "uid-2", email: "draft@example.com" } } });
    mockMaybeSingle.mockResolvedValue({ data: { id: "sp-uuid-draft" }, error: null });

    const result = await requireStartupSession(makeRequest());
    expect(result).toBe("sp-uuid-draft");
  });

  it("returns null when JWT user has no matching startup_profiles row", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "uid-investor", email: "investor@example.com" } } });
    mockMaybeSingle.mockResolvedValue({ data: null, error: null });

    const result = await requireStartupSession(makeRequest());
    expect(result).toBeNull();
  });

  it("returns null when getUser returns no user and no cookie present", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const result = await requireStartupSession(makeRequest());
    expect(result).toBeNull();
  });
});

describe("requireStartupSession — cookie fallback path", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // No JWT user
    mockGetUser.mockResolvedValue({ data: { user: null } });
  });

  it("returns startup id from valid non-expired session cookie", async () => {
    mockSingle.mockResolvedValue({
      data: { startup_id: "sp-uuid-from-cookie", expires_at: futureDate() },
      error: null,
    });

    const request = makeRequest({ startup_session: "valid-token-abc" });
    const result = await requireStartupSession(request);

    expect(result).toBe("sp-uuid-from-cookie");
    expect(mockAdminFrom).toHaveBeenCalledWith("startup_sessions");
  });

  it("returns null for an expired session cookie", async () => {
    mockSingle.mockResolvedValue({
      data: { startup_id: "sp-uuid-expired", expires_at: pastDate() },
      error: null,
    });

    const request = makeRequest({ startup_session: "expired-token" });
    const result = await requireStartupSession(request);
    expect(result).toBeNull();
  });

  it("returns null when session token not found in DB", async () => {
    mockSingle.mockResolvedValue({ data: null, error: { code: "PGRST116" } });

    const request = makeRequest({ startup_session: "unknown-token" });
    const result = await requireStartupSession(request);
    expect(result).toBeNull();
  });
});

describe("requireStartupSession — service-role admin client usage", () => {
  it("always uses createAdminClient for startup_sessions lookup (deny-all-anon table)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    mockSingle.mockResolvedValue({
      data: { startup_id: "sp-1", expires_at: futureDate() },
      error: null,
    });

    const request = makeRequest({ startup_session: "tok" });
    await requireStartupSession(request);

    // The admin from() was called with startup_sessions — not a server client
    expect(mockAdminFrom).toHaveBeenCalledWith("startup_sessions");
  });
});
