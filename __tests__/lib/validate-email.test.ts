import { describe, it, expect } from "vitest";
import { isValidEmail, isValidEmailClient, isDisposableEmail } from "@/lib/validate-email";

// ── isValidEmail ──────────────────────────────────────────────────────────────

describe("isValidEmail", () => {
  it.each([
    "user@example.com",
    "user.name+tag@sub.example.co.uk",
    "first.last@example.org",
    "test@test.io",
    "a@b.co",
  ])("returns true for valid email %s", (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each([
    "",
    "notanemail",
    "@nodomain.com",
    "user@",
    "user@domain",
    "user @domain.com",
    "user@ domain.com",
    "user@domain .com",
  ])("returns false for invalid format %s", (email) => {
    expect(isValidEmail(email)).toBe(false);
  });

  it("returns false for email exceeding 254 characters", () => {
    const longEmail = "a".repeat(250) + "@b.com"; // 256 chars total
    expect(longEmail.length).toBeGreaterThan(254);
    expect(isValidEmail(longEmail)).toBe(false);
  });

  it("returns true for a valid email well within the 254-char limit", () => {
    const email = "a".repeat(50) + "@example.com";
    expect(email.length).toBeLessThan(254);
    expect(isValidEmail(email)).toBe(true);
  });

  it("does not guard against disposable domains — that is isDisposableEmail's job", () => {
    // isValidEmail only validates format; disposable filtering is separate
    expect(isValidEmail("user@mailinator.com")).toBe(true);
  });
});

// ── isDisposableEmail ─────────────────────────────────────────────────────────

describe("isDisposableEmail", () => {
  it("returns false for an empty string", () => {
    expect(isDisposableEmail("")).toBe(false);
  });

  it("returns false for a non-disposable domain", () => {
    expect(isDisposableEmail("user@gmail.com")).toBe(false);
    expect(isDisposableEmail("user@company.com.au")).toBe(false);
  });

  it("returns true for mailinator.com", () => {
    expect(isDisposableEmail("test@mailinator.com")).toBe(true);
  });

  it("returns true for guerrillamail.com", () => {
    expect(isDisposableEmail("foo@guerrillamail.com")).toBe(true);
  });

  it("returns true for 10minutemail.com", () => {
    expect(isDisposableEmail("bar@10minutemail.com")).toBe(true);
  });

  it("returns true for yopmail.com", () => {
    expect(isDisposableEmail("baz@yopmail.com")).toBe(true);
  });

  it("is case-insensitive for the domain part", () => {
    expect(isDisposableEmail("x@MAILINATOR.COM")).toBe(true);
    expect(isDisposableEmail("x@Mailinator.Com")).toBe(true);
  });

  it("returns false for an email with no domain (malformed)", () => {
    expect(isDisposableEmail("nodomain")).toBe(false);
    expect(isDisposableEmail("user@")).toBe(false);
  });

  it("returns false for a domain that merely contains a disposable domain name", () => {
    // "mycompany-mailinator.com" is not "mailinator.com"
    expect(isDisposableEmail("user@mycompany-mailinator.com")).toBe(false);
  });
});

// ── isValidEmailClient ────────────────────────────────────────────────────────

describe("isValidEmailClient", () => {
  it("returns true for a valid email", () => {
    expect(isValidEmailClient("user@example.com")).toBe(true);
  });

  it("returns false for an email without @", () => {
    expect(isValidEmailClient("notanemail")).toBe(false);
  });

  it("returns false for an email with spaces", () => {
    expect(isValidEmailClient("user @domain.com")).toBe(false);
  });

  it("returns false for an empty string", () => {
    expect(isValidEmailClient("")).toBe(false);
  });

  it("returns false when no domain part follows @", () => {
    expect(isValidEmailClient("user@")).toBe(false);
  });

  it("does not enforce the 254-char limit (lighter than isValidEmail)", () => {
    const longEmail = "a".repeat(250) + "@b.com";
    // Client validator is intentionally lighter — does not check length
    expect(isValidEmailClient(longEmail)).toBe(true);
  });
});
