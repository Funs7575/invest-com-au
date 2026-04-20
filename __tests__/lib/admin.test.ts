import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { getAdminEmails, getAdminEmail, fallbackAvatarUrl } from "@/lib/admin";

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
