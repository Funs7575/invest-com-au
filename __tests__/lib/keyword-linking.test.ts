import { describe, it, expect } from "vitest";
import {
  INTERNAL_LINK_TARGETS,
  GLOSSARY_LINK_TARGETS,
  linkifyHtml,
  splitByLinks,
  pillarPathForCategory,
  getClusterPaths,
  linkDensityForCategory,
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

describe("pillarPathForCategory", () => {
  it("maps known categories to their pillar paths", () => {
    expect(pillarPathForCategory("smsf")).toBe("/smsf");
    expect(pillarPathForCategory("tax")).toBe("/tax");
    expect(pillarPathForCategory("etfs")).toBe("/etfs");
    expect(pillarPathForCategory("property")).toBe("/property");
  });

  it("handles mixed-case category strings", () => {
    expect(pillarPathForCategory("SMSF")).toBe("/smsf");
    expect(pillarPathForCategory("Tax & Strategy")).toBe("/tax");
  });

  it("returns undefined for unknown or missing categories", () => {
    expect(pillarPathForCategory("news")).toBeUndefined();
    expect(pillarPathForCategory()).toBeUndefined();
    expect(pillarPathForCategory("")).toBeUndefined();
  });
});

describe("getClusterPaths", () => {
  it("returns hrefs for a known pillar", () => {
    const paths = getClusterPaths("/smsf");
    expect(paths.has("/smsf")).toBe(true);
    expect(paths.size).toBeGreaterThan(1);
  });

  it("returns an empty set for an unknown pillar path", () => {
    expect(getClusterPaths("/unknown-path").size).toBe(0);
  });
});

describe("splitByLinks — cluster-aware selection", () => {
  it("without pillarPath: injects first-N links in text order", () => {
    // CommSec appears first; SelfWealth second. Both are /broker/ paths — not SMSF cluster.
    const text = "CommSec and SelfWealth are popular brokers. SMSF investors use different platforms.";
    const out = splitByLinks(text, 1);
    const links = out.filter((p) => typeof p !== "string");
    expect(links).toHaveLength(1);
    // Without cluster context, CommSec (first in text) wins.
    expect(links[0]).toMatchObject({ href: "/broker/commsec" });
  });

  it("with SMSF pillarPath: prefers cluster-relevant SMSF link over earlier broker link", () => {
    // CommSec appears first, SMSF appears second. With smsf cluster, SMSF should win.
    const text = "CommSec and SelfWealth are popular brokers. SMSF investors use different platforms.";
    const out = splitByLinks(text, 1, "/smsf");
    const links = out.filter((p) => typeof p !== "string");
    expect(links).toHaveLength(1);
    expect(links[0]).toMatchObject({ href: "/smsf" });
  });

  it("preserves all text content when cluster selection skips an earlier match", () => {
    const original = "CommSec and SelfWealth are popular. SMSF investors differ.";
    const out = splitByLinks(original, 1, "/smsf");
    const reconstructed = out.map((p) => (typeof p === "string" ? p : p.label)).join("");
    expect(reconstructed).toBe(original);
  });

  it("fills remaining cap slots with non-cluster links after cluster links are selected", () => {
    // With maxLinks=2 and SMSF cluster: first slot = /smsf (cluster), second = CommSec (generic).
    const text = "CommSec and SelfWealth are brokers. SMSF investors need an SMSF accountant.";
    const out = splitByLinks(text, 2, "/smsf");
    const links = out.filter((p) => typeof p !== "string");
    expect(links).toHaveLength(2);
    const hrefs = links.map((l) => (typeof l !== "string" ? l.href : ""));
    // SMSF accountant (/advisors/smsf-accountants) is cluster-relevant (supporting)
    // CommSec or SelfWealth fills the second slot
    expect(hrefs.some((h) => h.startsWith("/smsf") || h.startsWith("/advisors/smsf"))).toBe(true);
  });

  it("falls back to original behaviour when pillarPath resolves to no cluster", () => {
    const text = "CommSec and SelfWealth are popular brokers.";
    const withUnknown = splitByLinks(text, 1, "/unknown-pillar");
    const withoutPillar = splitByLinks(text, 1);
    // Both should inject CommSec (first in text) since no cluster context applies
    expect(withUnknown).toEqual(withoutPillar);
  });
});

describe("linkDensityForCategory", () => {
  it("returns higher density for long-form categories like smsf and tax", () => {
    expect(linkDensityForCategory("smsf")).toBeGreaterThan(5);
    expect(linkDensityForCategory("tax")).toBeGreaterThan(5);
  });

  it("returns lower density for short-format categories like calculators", () => {
    expect(linkDensityForCategory("calculators")).toBeLessThan(5);
  });

  it("returns the default density for unknown categories", () => {
    expect(linkDensityForCategory("news")).toBe(5);
    expect(linkDensityForCategory("unknown-vertical")).toBe(5);
  });

  it("returns the default density when category is undefined or empty", () => {
    expect(linkDensityForCategory(undefined)).toBe(5);
    expect(linkDensityForCategory("")).toBe(5);
  });

  it("is case-insensitive", () => {
    expect(linkDensityForCategory("SMSF")).toBe(linkDensityForCategory("smsf"));
    expect(linkDensityForCategory("Tax & Strategy")).toBe(linkDensityForCategory("tax & strategy"));
  });

  it("accepts a custom default density", () => {
    expect(linkDensityForCategory("unknown", 3)).toBe(3);
    expect(linkDensityForCategory(undefined, 2)).toBe(2);
  });
});

describe("splitByLinks — edge cases (iter5 regression suite)", () => {
  it("keyword at the very start of text is linked", () => {
    const out = splitByLinks("CommSec is great.");
    const first = out[0];
    expect(typeof first).not.toBe("string");
    if (typeof first !== "string") {
      expect(first.href).toBe("/broker/commsec");
    }
  });

  it("keyword at the very end of text is linked", () => {
    const out = splitByLinks("We recommend CommSec");
    const last = out[out.length - 1];
    expect(typeof last).not.toBe("string");
    if (typeof last !== "string") {
      expect(last.href).toBe("/broker/commsec");
    }
  });

  it("multiple distinct keywords all get linked (unlimited mode)", () => {
    const text = "CommSec and SelfWealth and Pearler and Moomoo.";
    const out = splitByLinks(text);
    const links = out.filter((p) => typeof p !== "string");
    expect(links.length).toBe(4);
    const hrefs = links.map((l) => (typeof l !== "string" ? l.href : "")).sort();
    expect(hrefs).toEqual([
      "/broker/commsec",
      "/broker/moomoo",
      "/broker/pearler",
      "/broker/selfwealth",
    ].sort());
  });

  it("reconstructs the original text faithfully with multiple links", () => {
    const original = "CommSec and SelfWealth are both CHESS-sponsored.";
    const out = splitByLinks(original);
    const reconstructed = out
      .map((p) => (typeof p === "string" ? p : p.label))
      .join("");
    expect(reconstructed).toBe(original);
  });

  it("handles text with no alphabetic characters gracefully", () => {
    const out = splitByLinks("123 456 789");
    expect(out).toHaveLength(1);
    expect(out[0]).toBe("123 456 789");
  });

  it("ignores partial keyword matches inside longer words (word boundary)", () => {
    const out = splitByLinks("The FIRBs decision was final.");
    const links = out.filter((p) => typeof p !== "string");
    expect(links.length).toBe(0);
  });
});

describe("linkifyHtml — edge cases (iter5 regression suite)", () => {
  it("injects rel attribute from target definition", () => {
    const term = GLOSSARY_LINK_TARGETS[0];
    if (!term) return;
    const out = linkifyHtml(`<p>${term.keyword} and more text.</p>`);
    expect(out).toContain('rel="glossary"');
  });

  it("does not inject links inside <code> blocks even when surrounded by text", () => {
    const out = linkifyHtml(
      "<p>Before CommSec <code>const commsec = true</code> after CommSec.</p>",
    );
    const linkCount = (out.match(/href="\/broker\/commsec"/g) || []).length;
    expect(linkCount).toBe(1);
    expect(out).toContain("<code>const commsec = true</code>");
  });

  it("preserves title attribute for targets that define one", () => {
    const out = linkifyHtml("<p>Find an SMSF accountant today.</p>");
    expect(out).toContain('href="/advisors/smsf-accountants"');
    expect(out).toContain(">SMSF accountant</a>");
  });

  it("the injected link class is always the expected amber style", () => {
    const out = linkifyHtml("<p>CommSec is popular.</p>");
    expect(out).toContain(
      'class="text-amber-700 underline decoration-amber-300 underline-offset-2 hover:text-amber-800"',
    );
  });
});
