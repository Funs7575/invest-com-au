import { describe, it, expect } from "vitest";
import { scrub } from "@/lib/form-persistence";

/**
 * scrub() strips PII before we persist a form to localStorage. The
 * guarantees tested here are security-relevant: a PII leak via
 * localStorage is a real vulnerability class (extensions, shared
 * devices, XSS exfiltration), so every default-sensitive pattern is
 * asserted.
 */
describe("scrub — form persistence PII redaction", () => {
  it("keeps benign fields untouched", () => {
    const input = { name: "Finn", age: 30, suburb: "Bondi" };
    expect(scrub(input, [])).toEqual({ name: "Finn", age: 30, suburb: "Bondi" });
  });

  it("drops any key containing 'password' (case-insensitive)", () => {
    expect(scrub({ password: "hunter2" } as Record<string, unknown>, [])).toEqual({});
    expect(scrub({ PASSWORD: "hunter2" } as Record<string, unknown>, [])).toEqual({});
    expect(scrub({ user_password: "hunter2" } as Record<string, unknown>, [])).toEqual({});
  });

  it("drops any key containing 'token'", () => {
    expect(scrub({ token: "abc", refresh_token: "x" } as Record<string, unknown>, [])).toEqual({});
  });

  it("drops any key containing 'secret'", () => {
    expect(scrub({ client_secret: "s" } as Record<string, unknown>, [])).toEqual({});
  });

  it("drops credit card fields (card, cvv)", () => {
    const input = {
      cardNumber: "4111111111111111",
      card_holder: "J Smith",
      cvv: "123",
      name: "J Smith",
    };
    expect(scrub(input, [])).toEqual({ name: "J Smith" });
  });

  it("drops tax-file-number variants (tfn, ssn)", () => {
    expect(scrub({ tfn: "123456789", ssn: "000-00-0000", email: "x@y.co" }, [])).toEqual({
      email: "x@y.co",
    });
  });

  it("drops account_number and bsb", () => {
    expect(
      scrub(
        { account_number: "12345678", accountNumber: "12345678", bsb: "062-000" },
        [],
      ),
    ).toEqual({});
  });

  it("does NOT drop fields that merely contain other letters coincidentally", () => {
    // "email" has no sensitive substring — it must stay.
    expect(scrub({ email: "f@e.co" }, [])).toEqual({ email: "f@e.co" });
    // "username" too.
    expect(scrub({ username: "finn" }, [])).toEqual({ username: "finn" });
  });

  it("drops extraSensitive keys even if they don't match the default patterns", () => {
    const input = { medicareNumber: "1234567890", name: "Finn" };
    expect(scrub(input, ["medicareNumber"])).toEqual({ name: "Finn" });
  });

  it("preserves nested-object values as-is on non-sensitive keys", () => {
    // scrub is shallow — it doesn't try to walk nested objects.
    const input = { profile: { nickname: "fw" }, password: "nope" } as Record<string, unknown>;
    const out = scrub(input, []);
    expect(out).toEqual({ profile: { nickname: "fw" } });
  });

  it("preserves falsy-but-valid values (0, '', false, null)", () => {
    const input = { count: 0, label: "", enabled: false, parent: null };
    expect(scrub(input, [])).toEqual({
      count: 0,
      label: "",
      enabled: false,
      parent: null,
    });
  });

  it("is empty-object stable", () => {
    expect(scrub({}, [])).toEqual({});
  });
});
