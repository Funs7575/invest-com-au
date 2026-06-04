import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ auth: { getUser: () => mockGetUser() } })),
}));

// redirect() throws in Next; emulate so we can assert it short-circuits before
// any data-fetch runs for an anonymous visitor.
const mockRedirect = vi.fn((url: string) => {
  throw new Error(`REDIRECT:${url}`);
});
vi.mock("next/navigation", () => ({
  redirect: (url: string) => mockRedirect(url),
}));

import AccountPage from "@/app/account/page";

describe("/account anonymous gate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects anonymous visitors to login with a return path", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });
    await expect(AccountPage()).rejects.toThrow("REDIRECT:/auth/login?next=/account");
    expect(mockRedirect).toHaveBeenCalledWith("/auth/login?next=/account");
  });
});
