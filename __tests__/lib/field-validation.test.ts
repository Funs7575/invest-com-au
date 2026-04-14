import { describe, it, expect } from "vitest";
import {
  validateRequired,
  validateEmail,
  validateAustralianPhone,
  validateAustralianPostcode,
  validatePasswordStrength,
  validateAfslNumber,
  validateAbn,
  validateLength,
  compose,
} from "@/lib/field-validation";

describe("validateRequired", () => {
  it("rejects empty", () => expect(validateRequired("")).toBeTruthy());
  it("rejects whitespace only", () => expect(validateRequired("   ")).toBeTruthy());
  it("accepts a real value", () => expect(validateRequired("hi")).toBeNull());
});

describe("validateEmail", () => {
  it("rejects missing", () => expect(validateEmail("")).toBeTruthy());
  it("rejects malformed", () => expect(validateEmail("not-an-email")).toBeTruthy());
  it("rejects disposable", () => expect(validateEmail("user@mailinator.com")).toBeTruthy());
  it("accepts a normal address", () =>
    expect(validateEmail("alex@example.com")).toBeNull());
});

describe("validateAustralianPhone", () => {
  it("accepts 0412 345 678", () =>
    expect(validateAustralianPhone("0412 345 678")).toBeNull());
  it("accepts +61 412 345 678", () =>
    expect(validateAustralianPhone("+61 412 345 678")).toBeNull());
  it("accepts (02) 9999 1234", () =>
    expect(validateAustralianPhone("(02) 9999 1234")).toBeNull());
  it("rejects a US number", () =>
    expect(validateAustralianPhone("+1 415 555 1234")).toBeTruthy());
  it("rejects random digits", () =>
    expect(validateAustralianPhone("12345")).toBeTruthy());
});

describe("validateAustralianPostcode", () => {
  it("accepts 2000", () => expect(validateAustralianPostcode("2000")).toBeNull());
  it("rejects 3-digit postcode", () =>
    expect(validateAustralianPostcode("200")).toBeTruthy());
  it("rejects letters", () => expect(validateAustralianPostcode("SW1A")).toBeTruthy());
});

describe("validatePasswordStrength", () => {
  it("requires minimum length", () =>
    expect(validatePasswordStrength("Short1")).toBeTruthy());
  it("requires uppercase", () =>
    expect(validatePasswordStrength("lowercase1only")).toBeTruthy());
  it("requires lowercase", () =>
    expect(validatePasswordStrength("UPPERCASE1ONLY")).toBeTruthy());
  it("requires digit", () =>
    expect(validatePasswordStrength("NoDigitsInHere")).toBeTruthy());
  it("accepts a strong password", () =>
    expect(validatePasswordStrength("SuperS3cretPass")).toBeNull());
});

describe("validateAfslNumber", () => {
  it("accepts 6-digit number", () => expect(validateAfslNumber("123456")).toBeNull());
  it("strips spaces", () => expect(validateAfslNumber("123 456")).toBeNull());
  it("rejects 5 digits", () => expect(validateAfslNumber("12345")).toBeTruthy());
  it("rejects letters", () => expect(validateAfslNumber("ABCDEF")).toBeTruthy());
});

describe("validateAbn", () => {
  it("accepts a valid ABN (Commonwealth Bank 48 123 123 124)", () => {
    expect(validateAbn("48 123 123 124")).toBeNull();
  });

  it("rejects a bogus 11-digit ABN", () => {
    expect(validateAbn("12345678901")).toBeTruthy();
  });

  it("rejects a non-numeric string", () => {
    expect(validateAbn("not-an-abn")).toBeTruthy();
  });
});

describe("validateLength factory", () => {
  it("min applies", () => {
    const v = validateLength({ min: 5, label: "Name" });
    expect(v("abc")).toContain("at least 5");
    expect(v("abcde")).toBeNull();
  });

  it("max applies", () => {
    const v = validateLength({ max: 3 });
    expect(v("abcd")).toBeTruthy();
    expect(v("abc")).toBeNull();
  });
});

describe("compose", () => {
  it("returns the first error", () => {
    const v = compose(validateRequired, validateEmail);
    expect(v("")).toContain("required");
  });

  it("passes only if every validator passes", () => {
    const v = compose(validateRequired, validateEmail);
    expect(v("alex@example.com")).toBeNull();
  });
});
