import { describe, it, expect } from "vitest";
import {
  INTERNAL_LINK_TARGETS,
  GLOSSARY_LINK_TARGETS,
  ARTICLE_LINK_DENSITY,
  DEFAULT_ARTICLE_LINK_DENSITY,
  getArticleLinkDensity,
  linkifyHtml,
  splitByLinks,
  splitByLinksForArticle,
} from "@/lib/keyword-linking";

describe("INTERNAL_LINK_TARGETS", () => {
  it("has no empty keywords or hrefs", () => {
    for (const t of INTERNAL_LINK_TARGETS) {
      expect(t.keyword.trim()).toBeTruthy();
      expect(t.href).toMatch(/^\//);
    }
  });

  it("has no duplicate (keyword, href) pairs", () => {
    const seen = new Set<string>();
    for (const t of INTERNAL_LINK_TARGETS) {
      const k = `${t.keyword.toLowerCase()}::${t.href}`;
      expect(seen.has(k)).toBe(false);
      seen.add(k);
    }
  });
});

describe("splitByLinks", () => {
  it("returns an empty array for empty input", () => {
    expect(splitByLinks("")).toEqual([]);
  });

  it("returns plain text untouched when no keyword is present", () => {
    const out = splitByLinks("Just some neutral copy about finance.");
    expect(out).toHaveLength(1);
    expect(out[0]).toBe("Just some neutral copy about finance.");
  });

  it("wraps the first occurrence of a known keyword", () => {
    const out = splitByLinks("We recommend CommSec for beginners.");
    expect(out).toEqual([
      "We recommend ",
      { href: "/broker/commsec", label: "CommSec", title: undefined, rel: undefined },
      " for beginners.",
    ]);
  });

  it("only links the first occurrence of a keyword", () => {
    const out = splitByLinks("CommSec offers research. CommSec also sponsors CHESS.");
    const links = out.filter(
      (p): p is { href: string; label: string } =>
        typeof p !== "string",
    );
    const commsecLinks = links.filter((l) => l.href === "/broker/commsec");
    expect(commsecLinks).toHaveLength(1);
  });

  it("matches case-insensitively but preserves the original casing in the label", () => {
    const out = splitByLinks("We use commSEC daily.");
    const link = out.find((p) => typeof p !== "string");
    expect(link).toBeDefined();
    if (typeof link !== "string" && link) {
      expect(link.label).toBe("commSEC");
      expect(link.href).toBe("/broker/commsec");
    }
  });

  it("prefers longer keywords over shorter ones that are substrings", () => {
    // "SMSF accountant" should win over bare "SMSF" when both could match.
    const out = splitByLinks("Find an SMSF accountant in Sydney.");
    const link = out.find((p) => typeof p !== "string");
    if (typeof link !== "string" && link) {
      expect(link.label).toBe("SMSF accountant");
      expect(link.href).toBe("/advisors/smsf-accountants");
    }
  });

  it("respects word boundaries (won't match substrings of other words)", () => {
    const out = splitByLinks("The commsecure vault is separate.");
    // "commsec" is a keyword but "commsecure" should NOT match.
    const links = out.filter((p) => typeof p !== "string");
    expect(links).toHaveLength(0);
  });
});

describe("GLOSSARY_LINK_TARGETS", () => {
  it("has entries (glossary is non-empty)", () => {
    expect(GLOSSARY_LINK_TARGETS.length).toBeGreaterThan(0);
  });

  it("all hrefs point to /glossary/ paths", () => {
    for (const t of GLOSSARY_LINK_TARGETS) {
      expect(t.href).toMatch(/^\/glossary\//);
    }
  });

  it("all entries have rel=glossary", () => {
    for (const t of GLOSSARY_LINK_TARGETS) {
      expect(t.rel).toBe("glossary");
    }
  });

  it("does not duplicate keywords already in INTERNAL_LINK_TARGETS", () => {
    const internalKeywords = new Set(
      INTERNAL_LINK_TARGETS.map((t) => t.keyword.toLowerCase()),
    );
    for (const t of GLOSSARY_LINK_TARGETS) {
      expect(internalKeywords.has(t.keyword.toLowerCase())).toBe(false);
    }
  });

  it("includes common glossary terms that are not in internal targets", () => {
    const glossaryHrefs = new Set(GLOSSARY_LINK_TARGETS.map((t) => t.href));
    // ETF should link to glossary since it's not an internal target keyword
    const hasEtf = GLOSSARY_LINK_TARGETS.some(
      (t) => t.keyword.toLowerCase() === "etf",
    );
    expect(hasEtf).toBe(true);
    expect(glossaryHrefs.has("/glossary/etf")).toBe(true);
  });
});

describe("splitByLinks — density cap (maxLinks)", () => {
  it("caps injected links to the specified maximum", () => {
    const text = "CommSec and SelfWealth and Pearler are all brokers.";
    const out = splitByLinks(text, 2);
    const links = out.filter((p) => typeof p !== "string");
    expect(links.length).toBe(2);
  });

  it("maxLinks=0 injects no links and returns the full text as one string", () => {
    const out = splitByLinks("CommSec is a broker.", 0);
    expect(out).toHaveLength(1);
    expect(out[0]).toBe("CommSec is a broker.");
  });

  it("maxLinks=1 injects exactly one link", () => {
    const out = splitByLinks("CommSec and SelfWealth.", 1);
    const links = out.filter((p) => typeof p !== "string");
    expect(links.length).toBe(1);
  });

  it("without a cap, injects all first occurrences (existing behaviour)", () => {
    const text = "CommSec and SelfWealth and Pearler.";
    const out = splitByLinks(text);
    const links = out.filter((p) => typeof p !== "string");
    // Three distinct broker keywords — all should be linked.
    expect(links.length).toBe(3);
  });

  it("preserves the full text content after capping — no characters lost", () => {
    const original = "CommSec and SelfWealth and Pearler end.";
    const out = splitByLinks(original, 1);
    const reconstructed = out.map((p) => (typeof p === "string" ? p : p.label)).join("");
    expect(reconstructed).toBe(original);
  });

  it("skipped keywords after cap appear as plain text, not links", () => {
    const out = splitByLinks("CommSec and SelfWealth and Pearler.", 1);
    const plainParts = out.filter((p) => typeof p === "string").join("");
    // "SelfWealth" and "Pearler" should appear in plain text segments.
    expect(plainParts).toContain("SelfWealth");
    expect(plainParts).toContain("Pearler");
  });
});

describe("splitByLinks — glossary terms", () => {
  it("links a glossary term in prose", () => {
    // "Dividend" is a glossary term not covered by INTERNAL_LINK_TARGETS
    const out = splitByLinks("Dividend investing is a popular strategy.");
    const link = out.find((p) => typeof p !== "string");
    expect(link).toBeDefined();
    if (typeof link !== "string" && link) {
      expect(link.href).toMatch(/^\/glossary\//);
      expect(link.rel).toBe("glossary");
    }
  });

  it("internal link takes priority over glossary for overlapping terms", () => {
    // "SMSF accountant" is an internal target; "SMSF" may also be in glossary.
    // The longer match wins because SORTED_TARGETS is longest-first.
    const out = splitByLinks("Hire an SMSF accountant.");
    const link = out.find((p) => typeof p !== "string");
    if (typeof link !== "string" && link) {
      expect(link.href).toBe("/advisors/smsf-accountants");
    }
  });
});

describe("splitByLinksForArticle — cluster-aware priority", () => {
  it("falls back to splitByLinks when no clusterIds provided", () => {
    const text = "CommSec and SelfWealth and Pearler.";
    expect(splitByLinksForArticle(text, [])).toEqual(splitByLinks(text));
  });

  it("falls back to splitByLinks when maxLinks is unlimited", () => {
    const text = "CommSec and SelfWealth.";
    expect(splitByLinksForArticle(text, ["best-brokers"])).toEqual(
      splitByLinks(text),
    );
  });

  it("promotes cluster-affine keywords over positionally-earlier non-affine ones", () => {
    // "SMSF" (affinity: super-australia) appears AFTER "CommSec" (affinity: best-brokers).
    // With clusterIds=["super-australia"] and maxLinks=1, SMSF should win the slot.
    const text = "CommSec is a broker. You can hold SMSF assets there.";
    const out = splitByLinksForArticle(text, ["super-australia"], 1);
    const links = out.filter((p) => typeof p !== "string");
    expect(links).toHaveLength(1);
    if (typeof links[0] !== "string" && links[0]) {
      expect(links[0].href).toBe("/smsf");
    }
  });

  it("still links positionally-first keyword when it is also cluster-affine", () => {
    // Both CommSec and SelfWealth are affine to best-brokers; CommSec appears first.
    const text = "CommSec and SelfWealth are brokers.";
    const out = splitByLinksForArticle(text, ["best-brokers"], 1);
    const links = out.filter((p) => typeof p !== "string");
    expect(links).toHaveLength(1);
    if (typeof links[0] !== "string" && links[0]) {
      expect(links[0].href).toBe("/broker/commsec");
    }
  });

  it("preserves full text content — no characters lost after cluster reordering", () => {
    const original = "CommSec offers research and SMSF support.";
    const out = splitByLinksForArticle(original, ["super-australia"], 1);
    const reconstructed = out
      .map((p) => (typeof p === "string" ? p : p.label))
      .join("");
    expect(reconstructed).toBe(original);
  });

  it("non-affine links fill remaining cap slots when affine ones are exhausted", () => {
    // Only SMSF is affine to super-australia; CommSec and SelfWealth are not.
    // With maxLinks=2, SMSF gets slot 1, then positional order fills slot 2.
    const text = "CommSec and SelfWealth plus SMSF investing.";
    const out = splitByLinksForArticle(text, ["super-australia"], 2);
    const links = out.filter(
      (p): p is { href: string; label: string } => typeof p !== "string",
    );
    expect(links).toHaveLength(2);
    const hrefs = links.map((l) => l.href);
    expect(hrefs).toContain("/smsf");
  });
});

describe("INTERNAL_LINK_TARGETS — affinity annotations", () => {
  it("all affinity arrays contain valid non-empty cluster IDs", () => {
    for (const t of INTERNAL_LINK_TARGETS) {
      if (t.affinity) {
        expect(Array.isArray(t.affinity)).toBe(true);
        for (const id of t.affinity) {
          expect(typeof id).toBe("string");
          expect(id.trim()).toBeTruthy();
        }
      }
    }
  });

  it("broker targets have best-brokers affinity", () => {
    const brokerKeywords = ["CommSec", "SelfWealth", "Pearler", "Moomoo", "Superhero"];
    for (const kw of brokerKeywords) {
      const target = INTERNAL_LINK_TARGETS.find(
        (t) => t.keyword.toLowerCase() === kw.toLowerCase(),
      );
      expect(target).toBeDefined();
      expect(target?.affinity).toContain("best-brokers");
    }
  });
});

describe("linkifyHtml", () => {
  it("returns an empty string for empty input", () => {
    expect(linkifyHtml("")).toBe("");
  });

  it("wraps a matched keyword in <a>", () => {
    const out = linkifyHtml("<p>We use CommSec daily.</p>");
    expect(out).toContain('<a href="/broker/commsec"');
    expect(out).toContain(">CommSec</a>");
  });

  it("does not rewrite text inside an existing <a>", () => {
    const input =
      '<p><a href="/external">CommSec is already linked</a>. CommSec again.</p>';
    const out = linkifyHtml(input);
    // The second CommSec (outside the <a>) should be linked; the first should not.
    const newLinks = out.match(/href="\/broker\/commsec"/g) || [];
    expect(newLinks).toHaveLength(1);
    // Original external link is preserved.
    expect(out).toContain('href="/external"');
  });

  it("skips <code> and <pre> blocks", () => {
    const out = linkifyHtml(
      "<pre>CommSec code example</pre><p>CommSec prose.</p>",
    );
    expect(out).toContain("<pre>CommSec code example</pre>");
    // Prose outside the pre still gets linked once.
    expect(out).toContain('<a href="/broker/commsec"');
  });

  it("only links first occurrence even across multiple chunks", () => {
    const out = linkifyHtml(
      "<p>CommSec first</p><p>CommSec second</p><p>CommSec third</p>",
    );
    const count = (out.match(/href="\/broker\/commsec"/g) || []).length;
    expect(count).toBe(1);
  });

  it("is safe against malformed HTML (unclosed tag)", () => {
    const out = linkifyHtml("<p>CommSec without closing");
    expect(out).toContain("<p>");
    expect(out.length).toBeGreaterThan(0);
  });
});

describe("getArticleLinkDensity — per-category density config", () => {
  it("returns DEFAULT_ARTICLE_LINK_DENSITY for undefined category", () => {
    expect(getArticleLinkDensity(undefined)).toBe(DEFAULT_ARTICLE_LINK_DENSITY);
  });

  it("returns DEFAULT_ARTICLE_LINK_DENSITY for null category", () => {
    expect(getArticleLinkDensity(null)).toBe(DEFAULT_ARTICLE_LINK_DENSITY);
  });

  it("returns DEFAULT_ARTICLE_LINK_DENSITY for unknown category", () => {
    expect(getArticleLinkDensity("unknown-category-xyz")).toBe(DEFAULT_ARTICLE_LINK_DENSITY);
  });

  it("news category gets lower density than smsf", () => {
    const news = getArticleLinkDensity("news");
    const smsf = getArticleLinkDensity("smsf");
    expect(news).toBeLessThan(smsf);
  });

  it("returns correct density for known categories", () => {
    expect(getArticleLinkDensity("news")).toBe(ARTICLE_LINK_DENSITY["news"]);
    expect(getArticleLinkDensity("smsf")).toBe(ARTICLE_LINK_DENSITY["smsf"]);
    expect(getArticleLinkDensity("beginners")).toBe(ARTICLE_LINK_DENSITY["beginners"]);
    expect(getArticleLinkDensity("tax")).toBe(ARTICLE_LINK_DENSITY["tax"]);
  });

  it("is case-insensitive", () => {
    expect(getArticleLinkDensity("NEWS")).toBe(ARTICLE_LINK_DENSITY["news"]);
    expect(getArticleLinkDensity("SMSF")).toBe(ARTICLE_LINK_DENSITY["smsf"]);
    expect(getArticleLinkDensity("Beginners")).toBe(ARTICLE_LINK_DENSITY["beginners"]);
  });

  it("all entries in ARTICLE_LINK_DENSITY are positive integers", () => {
    for (const [, density] of Object.entries(ARTICLE_LINK_DENSITY)) {
      expect(Number.isInteger(density)).toBe(true);
      expect(density).toBeGreaterThan(0);
    }
  });
});
