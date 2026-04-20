import { describe, it, expect } from "vitest";
import {
  getForeignInvestmentDict,
  getSubPageDict,
} from "@/lib/i18n/dictionaries";
import { LOCALES, type Locale } from "@/lib/i18n/locales";

describe("foreign-investment dictionaries", () => {
  it.each(LOCALES)("exposes a complete dictionary for locale %s", (locale) => {
    const d = getForeignInvestmentDict(locale);
    expect(d.meta.title).toBeTruthy();
    expect(d.meta.description).toBeTruthy();
    expect(d.hero.heading).toBeTruthy();
    expect(d.hero.subhead).toBeTruthy();
    expect(d.firb.heading).toBeTruthy();
    expect(d.siv.heading).toBeTruthy();
    expect(d.tax.heading).toBeTruthy();
    expect(d.disclaimer).toBeTruthy();
  });

  it("keeps topicCards the same length across locales", () => {
    const lengths = LOCALES.map(
      (l) => getForeignInvestmentDict(l).topicCards.length,
    );
    expect(new Set(lengths).size).toBe(1);
  });

  it("keeps body paragraphs the same count across locales (firb)", () => {
    const counts = LOCALES.map(
      (l) => getForeignInvestmentDict(l).firb.body.length,
    );
    expect(new Set(counts).size).toBe(1);
  });

  it.each(LOCALES)(
    "uses locale-correct href prefix on topicCards for %s",
    (locale) => {
      const cards = getForeignInvestmentDict(locale).topicCards;
      for (const card of cards) {
        if (locale === "en") {
          expect(card.href.startsWith("/foreign-investment/")).toBe(true);
        } else {
          expect(card.href.startsWith(`/${locale}/foreign-investment/`)).toBe(
            true,
          );
        }
      }
    },
  );
});

describe("sub-page dictionaries", () => {
  const SLUGS = ["siv", "property", "tax"] as const;

  it.each(SLUGS)("exposes all locales for sub-page %s", (slug) => {
    for (const locale of LOCALES) {
      const d = getSubPageDict(slug, locale);
      expect(d.meta.title).toBeTruthy();
      expect(d.hero.heading).toBeTruthy();
      expect(d.sections.length).toBeGreaterThan(0);
      expect(d.ctas.length).toBeGreaterThan(0);
      expect(d.disclaimer).toBeTruthy();
    }
  });

  it.each(SLUGS)(
    "keeps section count consistent across locales for %s",
    (slug) => {
      const counts = LOCALES.map(
        (l: Locale) => getSubPageDict(slug, l).sections.length,
      );
      expect(new Set(counts).size).toBe(1);
    },
  );

  it.each(SLUGS)(
    "keeps cta count consistent across locales for %s",
    (slug) => {
      const counts = LOCALES.map(
        (l: Locale) => getSubPageDict(slug, l).ctas.length,
      );
      expect(new Set(counts).size).toBe(1);
    },
  );

  it("siv property and tax sub-pages all have non-empty body paragraphs", () => {
    for (const slug of SLUGS) {
      for (const locale of LOCALES) {
        const d = getSubPageDict(slug, locale);
        for (const section of d.sections) {
          expect(section.heading).toBeTruthy();
          expect(section.body.length).toBeGreaterThan(0);
          for (const para of section.body) {
            expect(para.length).toBeGreaterThan(20);
          }
        }
      }
    }
  });
});
