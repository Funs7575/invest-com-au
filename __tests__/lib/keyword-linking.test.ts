import { describe, it, expect } from "vitest";
import {
  INTERNAL_LINK_TARGETS,
  GLOSSARY_LINK_TARGETS,
  linkifyHtml,
  splitByLinks,
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
  it("has no empty keywords and all hrefs point to /glossary#<slug>", () => {
    for (const t of GLOSSARY_LINK_TARGETS) {
      expect(t.keyword.trim()).toBeTruthy();
      expect(t.href).toMatch(/^\/glossary#[a-z0-9-]+$/);
    }
  });

  it("does not include terms already covered by INTERNAL_LINK_TARGETS", () => {
    const dedicated = new Set(INTERNAL_LINK_TARGETS.map((t) => t.keyword.toLowerCase()));
    for (const t of GLOSSARY_LINK_TARGETS) {
      expect(dedicated.has(t.keyword.toLowerCase())).toBe(false);
    }
  });

  it("contains a meaningful number of glossary terms", () => {
    // Glossary has 123 entries; a handful are filtered as duplicates.
    expect(GLOSSARY_LINK_TARGETS.length).toBeGreaterThan(100);
  });
});

describe("splitByLinks with glossary terms", () => {
  it("links a glossary term to its glossary anchor", () => {
    const out = splitByLinks("An ETF is a basket of investments.");
    const link = out.find((p): p is { href: string; label: string } => typeof p !== "string");
    expect(link).toBeDefined();
    expect(link?.href).toBe("/glossary#etf");
    expect(link?.label).toBe("ETF");
  });

  it("canonical dedicated target wins over glossary for the same keyword", () => {
    // "SMSF" is in INTERNAL_LINK_TARGETS (/smsf) and filtered out of GLOSSARY_LINK_TARGETS.
    const out = splitByLinks("Use an SMSF to manage retirement savings.");
    const link = out.find((p): p is { href: string; label: string } => typeof p !== "string");
    expect(link?.href).toBe("/smsf");
  });

  it("longer dedicated keyword wins over a glossary term that is a substring", () => {
    // "CGT calculator" (INTERNAL_LINK_TARGETS) should win over bare "CGT" (glossary).
    const out = splitByLinks("Use our CGT calculator to estimate tax.");
    const link = out.find((p): p is { href: string; label: string } => typeof p !== "string");
    expect(link?.href).toBe("/cgt-calculator");
    expect(link?.label).toBe("CGT calculator");
  });
});

describe("linkifyHtml with glossary terms", () => {
  it("wraps a glossary term in <a> pointing to the glossary anchor", () => {
    const out = linkifyHtml("<p>Diversification reduces portfolio risk.</p>");
    expect(out).toContain('href="/glossary#diversification"');
    expect(out).toContain(">Diversification</a>");
  });

  it("does not rewrite a dedicated canonical link as a glossary link", () => {
    const out = linkifyHtml("<p>Use our CGT calculator today.</p>");
    expect(out).toContain('href="/cgt-calculator"');
    expect(out).not.toContain("/glossary#cgt");
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
