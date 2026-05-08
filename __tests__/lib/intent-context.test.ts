import { describe, it, expect } from "vitest";
import {
  INTENT_COUNTRY_CODES,
  intentCountryMeta,
  intentCountryFromSlug,
  intentCountryFromQuizKey,
  intentCountryFromIso,
  quizKeyForIntentCode,
  isoForIntentCode,
  isKnownIntentCountry,
  type IntentCountryCode,
} from "@/lib/intent-context";

describe("INTENT_COUNTRY_CODES", () => {
  it("covers the 12 supported countries", () => {
    expect(INTENT_COUNTRY_CODES).toHaveLength(12);
    expect([...INTENT_COUNTRY_CODES].sort()).toEqual(
      ["ae", "cn", "hk", "in", "jp", "kr", "my", "nz", "sa", "sg", "uk", "us"],
    );
  });
});

describe("intentCountryMeta", () => {
  it.each(INTENT_COUNTRY_CODES)("%s has all required fields populated", (code) => {
    const meta = intentCountryMeta(code);
    expect(meta.slug).toBeTruthy();
    expect(meta.name).toBeTruthy();
    expect(meta.label).toBeTruthy();
    expect(meta.flag).toBeTruthy();
    expect(meta.currency).toMatch(/^[A-Z]{3}$/);
    expect(meta.quizKey).toBeTruthy();
    expect(meta.iso).toMatch(/^[A-Z]{2}$/);
    expect(typeof meta.hasDta).toBe("boolean");
  });

  it("name is a place name (not the 'investors' label)", () => {
    expect(intentCountryMeta("uk").name).toBe("the UK");
    expect(intentCountryMeta("hk").name).toBe("Hong Kong");
    expect(intentCountryMeta("sa").name).toBe("Saudi Arabia");
    expect(intentCountryMeta("uk").name).not.toBe(intentCountryMeta("uk").label);
  });

  it("uk maps to GB ISO (UK is reserved, not official alpha-2)", () => {
    expect(intentCountryMeta("uk").iso).toBe("GB");
  });

  it("us maps to USA quiz key (not 'us')", () => {
    expect(intentCountryMeta("us").quizKey).toBe("usa");
  });
});

describe("isKnownIntentCountry", () => {
  it("accepts every supported code", () => {
    INTENT_COUNTRY_CODES.forEach((code) => {
      expect(isKnownIntentCountry(code)).toBe(true);
    });
  });

  it("rejects unsupported codes and arbitrary strings", () => {
    expect(isKnownIntentCountry("de")).toBe(false);
    expect(isKnownIntentCountry("UK")).toBe(false); // case-sensitive intent code
    expect(isKnownIntentCountry("")).toBe(false);
  });

  it("rejects prototype-chain keys (hasOwnProperty hardening)", () => {
    // Without hasOwnProperty.call, `value in KNOWN` walks the prototype
    // chain and would accept these. Each one would then either crash a
    // downstream consumer or write a garbage cookie value.
    expect(isKnownIntentCountry("__proto__")).toBe(false);
    expect(isKnownIntentCountry("toString")).toBe(false);
    expect(isKnownIntentCountry("hasOwnProperty")).toBe(false);
    expect(isKnownIntentCountry("constructor")).toBe(false);
  });
});

describe("intentCountryFromSlug", () => {
  it("maps every meta.slug back to its code", () => {
    INTENT_COUNTRY_CODES.forEach((code) => {
      const meta = intentCountryMeta(code);
      expect(intentCountryFromSlug(meta.slug)).toBe(code);
    });
  });

  it("returns null for unknown / empty / nullish slugs", () => {
    expect(intentCountryFromSlug("germany")).toBeNull();
    expect(intentCountryFromSlug("")).toBeNull();
    expect(intentCountryFromSlug(null)).toBeNull();
    expect(intentCountryFromSlug(undefined)).toBeNull();
  });
});

describe("intentCountryFromQuizKey", () => {
  it("maps every meta.quizKey back to its code", () => {
    INTENT_COUNTRY_CODES.forEach((code) => {
      const meta = intentCountryMeta(code);
      expect(intentCountryFromQuizKey(meta.quizKey)).toBe(code);
    });
  });

  it("handles the divergent us → usa mapping", () => {
    expect(intentCountryFromQuizKey("usa")).toBe("us");
    expect(intentCountryFromQuizKey("us")).toBeNull();
  });

  it("handles the snake_case quiz keys", () => {
    expect(intentCountryFromQuizKey("hong_kong")).toBe("hk");
    expect(intentCountryFromQuizKey("south_korea")).toBe("kr");
    expect(intentCountryFromQuizKey("saudi_arabia")).toBe("sa");
    expect(intentCountryFromQuizKey("new_zealand")).toBe("nz");
    expect(intentCountryFromQuizKey("uae")).toBe("ae");
  });

  it("returns null for the 'other' option and unknown / nullish keys", () => {
    expect(intentCountryFromQuizKey("other")).toBeNull();
    expect(intentCountryFromQuizKey("germany")).toBeNull();
    expect(intentCountryFromQuizKey("")).toBeNull();
    expect(intentCountryFromQuizKey(null)).toBeNull();
    expect(intentCountryFromQuizKey(undefined)).toBeNull();
  });
});

describe("intentCountryFromIso", () => {
  it("maps every meta.iso back to its code", () => {
    INTENT_COUNTRY_CODES.forEach((code) => {
      const meta = intentCountryMeta(code);
      expect(intentCountryFromIso(meta.iso)).toBe(code);
    });
  });

  it("is case-insensitive (Vercel returns uppercase, but accept both)", () => {
    expect(intentCountryFromIso("gb")).toBe("uk");
    expect(intentCountryFromIso("GB")).toBe("uk");
    expect(intentCountryFromIso("Gb")).toBe("uk");
  });

  it("returns null for unsupported ISO codes (travellers, VPNs)", () => {
    expect(intentCountryFromIso("DE")).toBeNull();
    expect(intentCountryFromIso("FR")).toBeNull();
    expect(intentCountryFromIso("BR")).toBeNull();
  });

  it("returns null for empty / nullish input", () => {
    expect(intentCountryFromIso("")).toBeNull();
    expect(intentCountryFromIso(null)).toBeNull();
    expect(intentCountryFromIso(undefined)).toBeNull();
  });
});

describe("quizKeyForIntentCode / isoForIntentCode round-trips", () => {
  it.each(INTENT_COUNTRY_CODES)("%s round-trips through quizKey", (code) => {
    expect(intentCountryFromQuizKey(quizKeyForIntentCode(code))).toBe(code);
  });

  it.each(INTENT_COUNTRY_CODES)("%s round-trips through iso", (code) => {
    expect(intentCountryFromIso(isoForIntentCode(code))).toBe(code);
  });

  it.each(INTENT_COUNTRY_CODES)("%s round-trips through slug", (code) => {
    expect(intentCountryFromSlug(intentCountryMeta(code).slug)).toBe(code);
  });
});

describe("uniqueness of indexed fields", () => {
  it("every slug, quizKey and iso is unique across the 12 countries", () => {
    const slugs = new Set<string>();
    const quizKeys = new Set<string>();
    const isos = new Set<string>();
    INTENT_COUNTRY_CODES.forEach((code: IntentCountryCode) => {
      const meta = intentCountryMeta(code);
      slugs.add(meta.slug);
      quizKeys.add(meta.quizKey);
      isos.add(meta.iso);
    });
    expect(slugs.size).toBe(12);
    expect(quizKeys.size).toBe(12);
    expect(isos.size).toBe(12);
  });
});
