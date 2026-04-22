import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getAdminEmails,
  getAdminEmail,
  getFinObjectionEmails,
  fallbackAvatarUrl,
} from "@/lib/admin";

describe("getAdminEmails — reads ADMIN_EMAILS env at call time", () => {
  const ORIG = process.env.ADMIN_EMAILS;
  beforeEach(() => {
    delete process.env.ADMIN_EMAILS;
  });
  afterEach(() => {
    if (ORIG === undefined) delete process.env.ADMIN_EMAILS;
    else process.env.ADMIN_EMAILS = ORIG;
  });

  it("defaults to the built-in admin list when env is unset", () => {
    expect(getAdminEmails()).toEqual([
      "admin@invest.com.au",
      "finn@invest.com.au",
    ]);
  });

  it("parses a comma-separated list", () => {
    process.env.ADMIN_EMAILS = "a@x.co,b@x.co,c@x.co";
    expect(getAdminEmails()).toEqual(["a@x.co", "b@x.co", "c@x.co"]);
  });

  it("lowercases emails so the comparison site-wide is consistent", () => {
    process.env.ADMIN_EMAILS = "ALPHA@X.CO,Beta@Y.IO";
    expect(getAdminEmails()).toEqual(["alpha@x.co", "beta@y.io"]);
  });

  it("trims whitespace around comma-separated entries", () => {
    process.env.ADMIN_EMAILS = "a@x.co , b@x.co ,c@x.co";
    expect(getAdminEmails()).toEqual(["a@x.co", "b@x.co", "c@x.co"]);
  });

  it("returns a list with one entry when only one email is set", () => {
    process.env.ADMIN_EMAILS = "solo@x.co";
    expect(getAdminEmails()).toEqual(["solo@x.co"]);
  });
});

describe("getAdminEmail — primary admin", () => {
  const ORIG = process.env.ADMIN_EMAIL;
  beforeEach(() => {
    delete process.env.ADMIN_EMAIL;
  });
  afterEach(() => {
    if (ORIG === undefined) delete process.env.ADMIN_EMAIL;
    else process.env.ADMIN_EMAIL = ORIG;
  });

  it("defaults to admin@invest.com.au", () => {
    expect(getAdminEmail()).toBe("admin@invest.com.au");
  });

  it("reads env override at call time", () => {
    process.env.ADMIN_EMAIL = "override@invest.com.au";
    expect(getAdminEmail()).toBe("override@invest.com.au");
  });
});

describe("getFinObjectionEmails — narrower Fin-only allowlist", () => {
  // Narrower than getAdminEmails(). Per .claude/agents/04-editorial.md,
  // fin_objection_at is Fin's exclusive surface (admin ≠ Fin). If this
  // resolver regresses, the admin route either locks Fin out or opens
  // the surface wider than intended — both break compliance.
  const ORIG_FIN_OBJ = process.env.FIN_OBJECTION_EMAILS;
  const ORIG_FIN = process.env.FIN_EMAIL;
  beforeEach(() => {
    delete process.env.FIN_OBJECTION_EMAILS;
    delete process.env.FIN_EMAIL;
  });
  afterEach(() => {
    if (ORIG_FIN_OBJ === undefined) delete process.env.FIN_OBJECTION_EMAILS;
    else process.env.FIN_OBJECTION_EMAILS = ORIG_FIN_OBJ;
    if (ORIG_FIN === undefined) delete process.env.FIN_EMAIL;
    else process.env.FIN_EMAIL = ORIG_FIN;
  });

  it("falls back to the hardcoded Fin default when neither env var is set", () => {
    expect(getFinObjectionEmails()).toEqual(["finn@invest.com.au"]);
  });

  it("falls back to FIN_EMAIL when FIN_OBJECTION_EMAILS is unset", () => {
    process.env.FIN_EMAIL = "fin@example.com";
    expect(getFinObjectionEmails()).toEqual(["fin@example.com"]);
  });

  it("prefers FIN_OBJECTION_EMAILS over FIN_EMAIL (explicit allowlist wins)", () => {
    process.env.FIN_OBJECTION_EMAILS = "primary@example.com";
    process.env.FIN_EMAIL = "secondary@example.com";
    expect(getFinObjectionEmails()).toEqual(["primary@example.com"]);
  });

  it("lowercases + trims comma-separated FIN_OBJECTION_EMAILS", () => {
    process.env.FIN_OBJECTION_EMAILS = "  Fin@E.com , Co-Founder@EX.com  ";
    expect(getFinObjectionEmails()).toEqual([
      "fin@e.com",
      "co-founder@ex.com",
    ]);
  });

  it("filters out empty entries from stray commas", () => {
    process.env.FIN_OBJECTION_EMAILS = "a@b.com,,c@d.com,";
    expect(getFinObjectionEmails()).toEqual(["a@b.com", "c@d.com"]);
  });

  it("reads env each call (test-friendly)", () => {
    process.env.FIN_OBJECTION_EMAILS = "first@invest.com.au";
    expect(getFinObjectionEmails()).toEqual(["first@invest.com.au"]);
    process.env.FIN_OBJECTION_EMAILS = "second@invest.com.au";
    expect(getFinObjectionEmails()).toEqual(["second@invest.com.au"]);
  });
});

describe("fallbackAvatarUrl", () => {
  it("encodes simple names", () => {
    expect(fallbackAvatarUrl("Finn")).toBe(
      "https://ui-avatars.com/api/?name=Finn&size=80&background=7c3aed&color=fff",
    );
  });

  it("url-encodes names with spaces and apostrophes", () => {
    expect(fallbackAvatarUrl("Mary O'Brien")).toBe(
      "https://ui-avatars.com/api/?name=Mary%20O'Brien&size=80&background=7c3aed&color=fff",
    );
  });

  it("uses the supplied size", () => {
    expect(fallbackAvatarUrl("Alex", 200)).toContain("size=200");
  });

  it("uses the brand purple as background and white text regardless of size", () => {
    const url = fallbackAvatarUrl("X", 120);
    expect(url).toContain("background=7c3aed");
    expect(url).toContain("color=fff");
  });
});
