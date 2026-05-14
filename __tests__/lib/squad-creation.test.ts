/**
 * Unit tests for the pure squad-creation helpers used by /api/teams/new.
 *
 * Coverage:
 *   1. slugifySquadName — kebab-cases, strips, caps at 64 chars.
 *   2. dedupeSquadSlug — picks base when free, falls through to -2/-3, throws
 *      after 100 collisions, falls back to "squad" for an empty/punctuation-only name.
 *   3. isValidSquadMemberRole — accepts the canonical 3 roles, rejects anything else.
 *   4. classifyInvitee — returns `existing` when the lookup hits, `new` when it misses.
 */

import { describe, expect, it, vi } from "vitest";

import {
  classifyInvitee,
  dedupeSquadSlug,
  isValidSquadMemberRole,
  slugifySquadName,
} from "@/lib/squad-creation";

describe("slugifySquadName", () => {
  it("kebab-cases and lowercases a normal name", () => {
    expect(slugifySquadName("SMSF Property Specialists")).toBe(
      "smsf-property-specialists",
    );
  });

  it("strips punctuation and collapses whitespace/dash runs", () => {
    expect(slugifySquadName("  Smith & Jones, Ltd. — North!!!  ")).toBe(
      "smith-jones-ltd-north",
    );
  });

  it("trims leading and trailing dashes", () => {
    expect(slugifySquadName("---Hello---")).toBe("hello");
  });

  it("caps the slug at 64 characters so the dedup suffix still fits", () => {
    const longName = "a".repeat(200);
    expect(slugifySquadName(longName).length).toBe(64);
  });
});

describe("dedupeSquadSlug", () => {
  it("returns the base slug when nothing is taken", async () => {
    const exists = vi.fn().mockResolvedValue(false);
    expect(await dedupeSquadSlug("My Squad", exists)).toBe("my-squad");
    expect(exists).toHaveBeenCalledWith("my-squad");
  });

  it("appends -2, then -3 etc. when collisions exist", async () => {
    const taken = new Set(["my-squad", "my-squad-2"]);
    const exists = vi.fn(async (s: string) => taken.has(s));
    expect(await dedupeSquadSlug("My Squad", exists)).toBe("my-squad-3");
  });

  it("falls back to 'squad' for a punctuation-only name", async () => {
    const exists = vi.fn().mockResolvedValue(false);
    expect(await dedupeSquadSlug("!!!", exists)).toBe("squad");
  });

  it("throws after 100 collisions", async () => {
    const exists = vi.fn().mockResolvedValue(true);
    await expect(dedupeSquadSlug("Busy", exists)).rejects.toThrow(
      /slug_dedup_exhausted/,
    );
  });
});

describe("isValidSquadMemberRole", () => {
  it("accepts the three canonical roles", () => {
    expect(isValidSquadMemberRole("lead")).toBe(true);
    expect(isValidSquadMemberRole("specialist")).toBe(true);
    expect(isValidSquadMemberRole("observer")).toBe(true);
  });

  it("rejects unknown roles, casing, and non-strings", () => {
    expect(isValidSquadMemberRole("admin")).toBe(false);
    expect(isValidSquadMemberRole("LEAD")).toBe(false);
    expect(isValidSquadMemberRole("")).toBe(false);
    expect(isValidSquadMemberRole(null)).toBe(false);
    expect(isValidSquadMemberRole(undefined)).toBe(false);
    expect(isValidSquadMemberRole(42)).toBe(false);
  });
});

describe("classifyInvitee", () => {
  it("returns 'existing' when the lookup hits, including professionalId", async () => {
    const lookup = vi.fn().mockResolvedValue({ id: 17 });
    const result = await classifyInvitee("HELLO@example.com  ", lookup);
    expect(result).toEqual({ kind: "existing", professionalId: 17 });
    // Email is normalised before the lookup fires.
    expect(lookup).toHaveBeenCalledWith("hello@example.com");
  });

  it("returns 'new' when the lookup returns null", async () => {
    const lookup = vi.fn().mockResolvedValue(null);
    const result = await classifyInvitee("nobody@example.com", lookup);
    expect(result).toEqual({ kind: "new" });
  });
});
