import { describe, it, expect } from "vitest";
import {
  LOCALES,
  DEFAULT_LOCALE,
  BCP47_TAG,
  LOCALE_LABEL,
  LOCALE_DIR,
  LOCALE_KNOWN_PATHS,
  isLocale,
  stripLocalePrefix,
  localePath,
  type Locale,
} from "@/lib/i18n/locales";

describe("LOCALES registry", () => {
  it("includes en, zh, ko, ar (Phase 5a added ar)", () => {
    expect(LOCALES).toEqual(["en", "zh", "ko", "ar"]);
  });

  it("DEFAULT_LOCALE is en", () => {
    expect(DEFAULT_LOCALE).toBe("en");
  });
});

describe("BCP47_TAG", () => {
  it("has a tag for every locale", () => {
    LOCALES.forEach((locale) => {
      expect(BCP47_TAG[locale]).toBeTruthy();
    });
  });

  it("ar maps to ar-AE (UAE primary)", () => {
    expect(BCP47_TAG.ar).toBe("ar-AE");
  });
});

describe("LOCALE_LABEL", () => {
  it("ar uses native script", () => {
    expect(LOCALE_LABEL.ar).toBe("العربية");
  });

  it("every locale has a label", () => {
    LOCALES.forEach((locale) => {
      expect(LOCALE_LABEL[locale]).toBeTruthy();
    });
  });
});

describe("LOCALE_DIR (Phase 5 RTL hook)", () => {
  it("ar is rtl, everything else is ltr", () => {
    expect(LOCALE_DIR.ar).toBe("rtl");
    expect(LOCALE_DIR.en).toBe("ltr");
    expect(LOCALE_DIR.zh).toBe("ltr");
    expect(LOCALE_DIR.ko).toBe("ltr");
  });

  it("has a dir for every locale", () => {
    LOCALES.forEach((locale) => {
      expect(LOCALE_DIR[locale]).toMatch(/^(ltr|rtl)$/);
    });
  });
});

describe("isLocale", () => {
  it("accepts every supported locale", () => {
    LOCALES.forEach((locale) => {
      expect(isLocale(locale)).toBe(true);
    });
  });

  it("rejects unknown / nullish input", () => {
    expect(isLocale("ja")).toBe(false);
    expect(isLocale("EN")).toBe(false);
    expect(isLocale("")).toBe(false);
    expect(isLocale("ar-AE")).toBe(false); // BCP47 tag, not locale code
  });
});

describe("stripLocalePrefix", () => {
  it("strips the locale prefix and returns the path", () => {
    expect(stripLocalePrefix("/zh/foreign-investment")).toEqual({
      locale: "zh",
      path: "/foreign-investment",
    });
    expect(stripLocalePrefix("/ko/")).toEqual({ locale: "ko", path: "/" });
    expect(stripLocalePrefix("/ar/foreign-investment/united-arab-emirates")).toEqual({
      locale: "ar",
      path: "/foreign-investment/united-arab-emirates",
    });
  });

  it("returns DEFAULT_LOCALE for paths without a prefix", () => {
    expect(stripLocalePrefix("/")).toEqual({ locale: "en", path: "/" });
    expect(stripLocalePrefix("/foreign-investment")).toEqual({
      locale: "en",
      path: "/foreign-investment",
    });
  });

  it("does not match partial prefixes (e.g. /zhao or /art-)", () => {
    expect(stripLocalePrefix("/zhao-foo")).toEqual({
      locale: "en",
      path: "/zhao-foo",
    });
    expect(stripLocalePrefix("/article")).toEqual({
      locale: "en",
      path: "/article",
    });
  });
});

describe("localePath", () => {
  it("does not prefix when locale is the default", () => {
    expect(localePath("/foreign-investment", "en")).toBe("/foreign-investment");
    expect(localePath("/", "en")).toBe("/");
  });

  it("prefixes for non-default locales", () => {
    expect(localePath("/foreign-investment", "ar")).toBe("/ar/foreign-investment");
    expect(localePath("/foreign-investment", "zh")).toBe("/zh/foreign-investment");
  });

  it("handles the root path correctly for non-default locales", () => {
    expect(localePath("/", "ar")).toBe("/ar");
    expect(localePath("/", "ko")).toBe("/ko");
  });
});

describe("type-level guard", () => {
  it("Locale union covers exactly the LOCALES array", () => {
    // Compile-time check: assigning a literal not in the union should
    // fail TS but is hard to assert at runtime. Instead, verify that
    // every element of LOCALES is type-compatible with Locale.
    const all: Locale[] = [...LOCALES];
    expect(all).toHaveLength(4);
  });
});

describe("LOCALE_KNOWN_PATHS (CC-05 — locale-aware sitemap)", () => {
  it("does not include 'en' — default locale needs no prefix", () => {
    expect(LOCALE_KNOWN_PATHS.en).toBeUndefined();
  });

  it("includes ar with the UAE foreign-investment page", () => {
    expect(LOCALE_KNOWN_PATHS.ar).toContain(
      "/foreign-investment/united-arab-emirates",
    );
  });

  it("includes zh and ko foreign-investment hub paths", () => {
    expect(LOCALE_KNOWN_PATHS.zh).toContain("/foreign-investment");
    expect(LOCALE_KNOWN_PATHS.ko).toContain("/foreign-investment");
  });

  it("zh and ko paths are symmetric (same set)", () => {
    const zh = [...(LOCALE_KNOWN_PATHS.zh ?? [])].sort();
    const ko = [...(LOCALE_KNOWN_PATHS.ko ?? [])].sort();
    expect(zh).toEqual(ko);
  });

  it("generates correct locale-prefixed URLs via localePath", () => {
    const arPrefixed = (LOCALE_KNOWN_PATHS.ar ?? []).map((p) =>
      localePath(p, "ar"),
    );
    expect(arPrefixed).toContain("/ar/foreign-investment/united-arab-emirates");

    const zhPrefixed = (LOCALE_KNOWN_PATHS.zh ?? []).map((p) =>
      localePath(p, "zh"),
    );
    expect(zhPrefixed).toContain("/zh/foreign-investment");
    expect(zhPrefixed).toContain("/zh/foreign-investment/siv");
    expect(zhPrefixed).toContain("/zh/foreign-investment/property");
    expect(zhPrefixed).toContain("/zh/foreign-investment/tax");
  });

  it("all paths start with '/'", () => {
    Object.values(LOCALE_KNOWN_PATHS).forEach((paths) => {
      (paths ?? []).forEach((p) => {
        expect(p).toMatch(/^\//);
      });
    });
  });

  it("no path is the root '/' — root locale pages are not yet supported", () => {
    Object.values(LOCALE_KNOWN_PATHS).forEach((paths) => {
      (paths ?? []).forEach((p) => {
        expect(p).not.toBe("/");
      });
    });
  });
});
