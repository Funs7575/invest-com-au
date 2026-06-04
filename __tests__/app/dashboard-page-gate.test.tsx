import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: () => mockGetUser() } })),
}));

// redirect() throws in Next; emulate so we can assert it short-circuits.
const mockRedirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

// The client component is heavy ("use client" + browser hooks); stub it so the
// server gate is the only thing under test.
vi.mock("@/app/dashboard/DashboardClient", () => ({
  default: () => null,
}));

import DashboardPage from "@/app/dashboard/page";

describe("/dashboard server gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("ADMIN_EMAILS", "admin@invest.com.au");
  });

  it("redirects anonymous visitors to login with a return path", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await expect(DashboardPage()).rejects.toThrow(
      "REDIRECT:/auth/login?next=/dashboard",
    );
    expect(mockRedirect).toHaveBeenCalledWith("/auth/login?next=/dashboard");
  });

  it("redirects a signed-in non-admin user away from the analytics shell", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", email: "regular@example.com" } },
    });
    await expect(DashboardPage()).rejects.toThrow(
      "REDIRECT:/auth/login?next=/dashboard",
    );
  });

  it("renders for an admin user (case-insensitive allowlist match)", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "admin1", email: "Admin@Invest.com.au" } },
    });
    await expect(DashboardPage()).resolves.toBeTruthy();
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});
