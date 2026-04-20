import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: () => null,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null }) }) }),
    }),
  }),
}));

vi.mock("@/lib/seo", () => ({
  SITE_URL: "https://invest.com.au",
}));

import { extractEmail } from "@/app/api/cron/sponsored-renewal-reminder/route";

describe("extractEmail — renewal reminder cron", () => {
  it("uses created_by when it's a plain email", () => {
    expect(extractEmail("broker@example.com", null)).toBe("broker@example.com");
  });

  it("trims whitespace around a plain email in created_by", () => {
    expect(extractEmail("  broker@example.com  ", null)).toBe("broker@example.com");
  });

  it("falls through created_by when it's the literal 'checkout' placeholder", () => {
    // webhook falls back to 'checkout' when no email is on metadata —
    // we must not email that string
    expect(extractEmail("checkout", "contact@firm.co.uk")).toBe("contact@firm.co.uk");
  });

  it("parses an email out of the angle-bracket notes format", () => {
    expect(
      extractEmail(null, "Contact: Jane Smith <jane@firm.co.uk>"),
    ).toBe("jane@firm.co.uk");
  });

  it("falls back to plain @ in notes when no angle brackets present", () => {
    expect(extractEmail(null, "billing@firm.co")).toBe("billing@firm.co");
  });

  it("returns null when neither field contains an email", () => {
    expect(extractEmail("checkout", null)).toBeNull();
    expect(extractEmail(null, "no contact info")).toBeNull();
    expect(extractEmail(null, null)).toBeNull();
  });

  it("prefers created_by over notes", () => {
    expect(
      extractEmail("primary@firm.co", "Contact: <backup@firm.co>"),
    ).toBe("primary@firm.co");
  });
});
