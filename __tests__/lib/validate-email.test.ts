import { describe, it, expect } from "vitest";
import {
  isValidEmail,
  isValidEmailClient,
  isDisposableEmail,
} from "@/lib/validate-email";

describe("isValidEmail (server-side, strict)", () => {
  it.each([
    "finn@invest.com.au",
    "jane.smith@example.co.uk",
    "user+tag@example.com",
    "a@b.co",
    "user.name+tag.filter@subdomain.example.org",
  ])("accepts %s", (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each([
    "",
    "not-an-email",
    "@example.com",
    "finn@",
    "finn@@example.com",
    "finn@example",
    "finn @example.com",
    "finn@.example.com",
    "finn@example..com",
  ])("rejects %j", (email) => {
    expect(isValidEmail(email)).toBe(false);
  });

  it("rejects non-string input", () => {
    expect(isValidEmail(null as unknown as string)).toBe(false);
    expect(isValidEmail(undefined as unknown as string)).toBe(false);
    expect(isValidEmail(123 as unknown as string)).toBe(false);
  });

  it("rejects emails over 254 chars (RFC 5321)", () => {
    const local = "a".repeat(250);
    const email = `${local}@b.co`;
    expect(email.length).toBeGreaterThan(254);
    expect(isValidEmail(email)).toBe(false);
  });

  it("accepts emails exactly at the 254-char boundary", () => {
    const local = "a".repeat(248);
    const email = `${local}@b.co`;
    expect(email.length).toBeLessThanOrEqual(254);
    expect(isValidEmail(email)).toBe(true);
  });
});

describe("isValidEmailClient (lighter inline check)", () => {
  it("accepts typical addresses", () => {
    expect(isValidEmailClient("finn@example.com")).toBe(true);
  });

  it("requires exactly one @", () => {
    expect(isValidEmailClient("finn@@example.com")).toBe(false);
    expect(isValidEmailClient("finnexample.com")).toBe(false);
  });

  it("requires a dot after the @", () => {
    expect(isValidEmailClient("finn@example")).toBe(false);
  });

  it("rejects whitespace", () => {
    expect(isValidEmailClient("finn @example.com")).toBe(false);
    expect(isValidEmailClient("finn@ example.com")).toBe(false);
  });
});

describe("isDisposableEmail (anti-spam guard)", () => {
  it("flags mailinator and related", () => {
    expect(isDisposableEmail("foo@mailinator.com")).toBe(true);
    expect(isDisposableEmail("foo@trashmail.com")).toBe(true);
  });

  it("flags guerrillamail + grr.la aliases", () => {
    expect(isDisposableEmail("foo@guerrillamail.com")).toBe(true);
    expect(isDisposableEmail("foo@grr.la")).toBe(true);
    expect(isDisposableEmail("foo@sharklasers.com")).toBe(true);
  });

  it("flags 10-minute mail services", () => {
    expect(isDisposableEmail("foo@10minutemail.com")).toBe(true);
    expect(isDisposableEmail("foo@10mail.org")).toBe(true);
  });

  it("flags YOPmail + temp-mail", () => {
    expect(isDisposableEmail("foo@yopmail.com")).toBe(true);
    expect(isDisposableEmail("foo@temp-mail.org")).toBe(true);
    expect(isDisposableEmail("foo@fakeinbox.com")).toBe(true);
  });

  it("is case-insensitive on the domain", () => {
    expect(isDisposableEmail("foo@MAILINATOR.com")).toBe(true);
    expect(isDisposableEmail("foo@MaIlInAtOr.com")).toBe(true);
  });

  it("trims whitespace in the domain", () => {
    expect(isDisposableEmail("foo@mailinator.com ")).toBe(true);
  });

  it("does NOT flag regular providers", () => {
    expect(isDisposableEmail("foo@gmail.com")).toBe(false);
    expect(isDisposableEmail("foo@outlook.com")).toBe(false);
    expect(isDisposableEmail("foo@example.com")).toBe(false);
    expect(isDisposableEmail("foo@invest.com.au")).toBe(false);
  });

  it("returns false for malformed inputs", () => {
    expect(isDisposableEmail("")).toBe(false);
    expect(isDisposableEmail("not-an-email")).toBe(false);
    expect(isDisposableEmail(null as unknown as string)).toBe(false);
  });
});
