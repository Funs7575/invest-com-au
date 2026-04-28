import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockSignOut = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { signOut: mockSignOut },
  })),
}));

// ── Import route AFTER mocks ──────────────────────────────────────────────────

import { POST } from "@/app/api/auth/signout/route";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/auth/signout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns { success: true } with 200 when signOut succeeds", async () => {
    mockSignOut.mockResolvedValueOnce({ error: null });
    const res = await POST();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ success: true });
    expect(mockSignOut).toHaveBeenCalledOnce();
  });

  it("returns { error: 'Failed to sign out' } with 500 when signOut throws", async () => {
    mockSignOut.mockRejectedValueOnce(new Error("network error"));
    const res = await POST();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toEqual({ error: "Failed to sign out" });
  });
});
