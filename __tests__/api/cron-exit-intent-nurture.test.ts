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
  createAdminClient: () => ({ from: () => ({}) }),
}));

vi.mock("@/lib/resend", () => ({
  sendEmail: vi.fn(() => Promise.resolve({ ok: true })),
}));

vi.mock("@/lib/seo", () => ({
  SITE_URL: "https://invest.com.au",
}));

import { firstNameOf } from "@/app/api/cron/exit-intent-nurture/route";

describe("firstNameOf — exit-intent nurture greeting", () => {
  it("prefers name field when present", () => {
    expect(firstNameOf("Finn Webster", "finn@example.com")).toBe("Finn");
  });

  it("uses the first word of a multi-part name", () => {
    expect(firstNameOf("Mary Jane Watson", "mjw@example.com")).toBe("Mary");
  });

  it("trims surrounding whitespace on name", () => {
    expect(firstNameOf("  Alex  ", "a@example.com")).toBe("Alex");
  });

  it("falls back to email local-part when name is empty string", () => {
    expect(firstNameOf("", "anna@example.com")).toBe("Anna");
  });

  it("falls back to email local-part when name is only whitespace", () => {
    expect(firstNameOf("   ", "bob@example.com")).toBe("Bob");
  });

  it("falls back to email local-part when name is null", () => {
    expect(firstNameOf(null, "chris@example.com")).toBe("Chris");
  });

  it("falls back to email local-part when name is undefined", () => {
    expect(firstNameOf(undefined, "dan@example.com")).toBe("Dan");
  });

  it("cleans dots/underscores/hyphens in the email local-part", () => {
    expect(firstNameOf(null, "john.smith@example.com")).toBe("John");
    expect(firstNameOf(null, "jane_doe@example.com")).toBe("Jane");
    expect(firstNameOf(null, "kat-perry@example.com")).toBe("Kat");
  });

  it("capitalises a lowercase local-part", () => {
    expect(firstNameOf(null, "finn@example.com")).toBe("Finn");
  });

  it("lowercases the tail of an ALL-CAPS local-part", () => {
    expect(firstNameOf(null, "FINN@example.com")).toBe("Finn");
  });

  it("handles email-only address with no @ by returning a usable greeting", () => {
    // Defensive — firstNameOf shouldn't throw on malformed input even
    // though upstream schemas reject these.
    const result = firstNameOf(null, "no-at-sign");
    expect(result.length).toBeGreaterThan(0);
  });
});
