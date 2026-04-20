import { describe, it, expect } from "vitest";
import { isValidAuPhone } from "@/lib/validate-phone";

describe("isValidAuPhone — AU phone validator", () => {
  describe("accepts real-looking AU numbers", () => {
    it.each([
      "0412 345 679", // mobile with spaces
      "0412345679", // mobile no formatting
      "04-1234-5679", // mobile with dashes
      "(04) 1234 5679", // mobile with parens
      "+61 412 345 679", // +61 international
      "+61412345679",
      "0061 412 345 679", // 0061 international
      "02 9123 4567", // Sydney landline
      "08 9123 4567", // Perth landline
      "0391234567", // Melbourne landline no formatting
      "03 9654 2378", // Melbourne landline, not in FAKE_PATTERNS
    ])("accepts %s", (phone) => {
      expect(isValidAuPhone(phone)).toBe(true);
    });
  });

  describe("rejects fake/test sequences", () => {
    it.each([
      "0400 000 000",
      "0411111111",
      "0412 345 678", // the textbook FAKE_PATTERNS entry
      "0398 765 432", // the textbook FAKE_PATTERNS entry
      "1234567890",
      "0000000000",
      "9999999999",
    ])("rejects %s", (phone) => {
      expect(isValidAuPhone(phone)).toBe(false);
    });
  });

  describe("rejects structurally invalid numbers", () => {
    it("rejects empty string", () => {
      expect(isValidAuPhone("")).toBe(false);
    });

    it("rejects non-string input", () => {
      expect(isValidAuPhone(null as unknown as string)).toBe(false);
      expect(isValidAuPhone(undefined as unknown as string)).toBe(false);
    });

    it("rejects too short (<8 digits)", () => {
      expect(isValidAuPhone("12345")).toBe(false);
    });

    it("rejects too long (>15 digits)", () => {
      expect(isValidAuPhone("+61412345678901234")).toBe(false);
    });

    it("rejects letters mixed in", () => {
      expect(isValidAuPhone("041234ABCD")).toBe(false);
    });

    it("rejects 10-digit numbers not starting with 0", () => {
      expect(isValidAuPhone("1412345679")).toBe(false);
    });

    it("rejects AU numbers starting with 0 but with invalid area code (01)", () => {
      expect(isValidAuPhone("0123456789")).toBe(false);
    });

    it("rejects 7+ repeated digit runs even when not in FAKE_PATTERNS", () => {
      expect(isValidAuPhone("0477777777")).toBe(false); // in FAKE_PATTERNS
      // 8 sevens in the trailing digits of a mobile — the repeating-run
      // rule should catch this even if it were excluded from the list.
      expect(isValidAuPhone("0477777776")).toBe(false);
    });
  });

  it("strips common formatting characters before validating", () => {
    // All four of these should normalise to the same 10-digit number.
    const numbers = [
      "0412345679",
      "0412 345 679",
      "0412-345-679",
      "(04) 1234-5679",
    ];
    for (const n of numbers) expect(isValidAuPhone(n)).toBe(true);
  });

  it("treats +61 and 0061 prefixes equivalently", () => {
    expect(isValidAuPhone("+61412345679")).toBe(true);
    expect(isValidAuPhone("0061412345679")).toBe(true);
  });
});
