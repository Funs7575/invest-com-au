import { describe, it, expect } from "vitest";
import {
  LOCALES,
  DEFAULT_LOCALE,
  BCP47_TAG,
  LOCALE_LABEL,
  isLocale,
  stripLocalePrefix,
  localePath,
} from "@/lib/i18n/locales";
import { getForeignInvestmentDict } from "@/lib/i18n/dictionaries";

describe("locale registry", () => {
  it("has a default locale of en", () => {
    expect(DEFAULT_LOCALE).toBe("en");
  });

  it("includes en + zh + ko and nothing else", () => {
    expect([...LOCALES].sort()).toEqual(["en", "ko", "zh"]);
  });

  it("every locale has a BCP-47 tag and a UI label", () => {
    for (const l of LOCALES) {
      expect(BCP47_TAG[l]).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
      expect(LOCALE_LABEL[l]).toBeTruthy();
    }
  });

  it("isLocale guards correctly", () => {
    expect(isLocale("en")).toBe(true);
    expect(isLocale("zh")).toBe(true);
    expect(isLocale("fr")).toBe(false);
    expect(isLocale("")).toBe(false);
  });
});

describe("stripLocalePrefix", () => {
  it("returns en for a non-prefixed path", () => {
    expect(stripLocalePrefix("/foreign-investment")).toEqual({
      locale: "en",
      path: "/foreign-investment",
    });
  });

  it("strips /zh and returns the residual path", () => {
    expect(stripLocalePrefix("/zh/foreign-investment")).toEqual({
      locale: "zh",
      path: "/foreign-investment",
    });
  });

  it("handles bare /zh as /", () => {
    expect(stripLocalePrefix("/zh")).toEqual({ locale: "zh", path: "/" });
  });

  it("does not strip unrelated locales (fr, es)", () => {
    expect(stripLocalePrefix("/fr/foo")).toEqual({
      locale: "en",
      path: "/fr/foo",
    });
  });
});

describe("localePath", () => {
  it("leaves en unchanged", () => {
    expect(localePath("/foreign-investment", "en")).toBe("/foreign-investment");
  });

  it("prefixes non-default locales", () => {
    expect(localePath("/foreign-investment", "zh")).toBe("/zh/foreign-investment");
    expect(localePath("/foreign-investment", "ko")).toBe("/ko/foreign-investment");
  });

  it("handles root path without leaving a dangling slash", () => {
    expect(localePath("/", "zh")).toBe("/zh");
  });
});

describe("foreign investment dictionary", () => {
  it("exists for every registered locale", () => {
    for (const l of LOCALES) {
      const dict = getForeignInvestmentDict(l);
      expect(dict).toBeDefined();
      expect(dict.meta.title).toBeTruthy();
    }
  });

  it("every locale has exactly 4 topic cards", () => {
    for (const l of LOCALES) {
      expect(getForeignInvestmentDict(l).topicCards).toHaveLength(4);
    }
  });

  it("body arrays have at least 2 paragraphs in every locale", () => {
    for (const l of LOCALES) {
      const d = getForeignInvestmentDict(l);
      expect(d.firb.body.length).toBeGreaterThanOrEqual(2);
      expect(d.siv.body.length).toBeGreaterThanOrEqual(2);
      expect(d.tax.body.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("localised topic cards link back to their own locale prefix", () => {
    const zh = getForeignInvestmentDict("zh");
    for (const card of zh.topicCards) {
      expect(card.href).toMatch(/^\/zh\//);
    }
    const ko = getForeignInvestmentDict("ko");
    for (const card of ko.topicCards) {
      expect(card.href).toMatch(/^\/ko\//);
    }
  });
});
