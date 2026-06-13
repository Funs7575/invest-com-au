import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/seo", () => ({
  SITE_URL: "https://invest.com.au",
}));

import {
  ADVISOR_EMBED_TYPES,
  ADVISOR_EMBED_KIT,
  isAdvisorEmbedType,
  normaliseAdvisorEmbedTheme,
  advisorEmbedMeta,
  advisorEmbedUtmQuery,
  advisorEmbedUrl,
  buildAdvisorEmbedSnippets,
} from "@/lib/widget/advisor-embed";

describe("advisor-embed helpers", () => {
  it("catalogue covers every embed type exactly once", () => {
    const kitTypes = ADVISOR_EMBED_KIT.map((m) => m.type).sort();
    expect(kitTypes).toEqual([...ADVISOR_EMBED_TYPES].sort());
    // advisorEmbedMeta must resolve for every union member (drift guard).
    for (const t of ADVISOR_EMBED_TYPES) {
      expect(advisorEmbedMeta(t).type).toBe(t);
    }
  });

  it("isAdvisorEmbedType guards the union", () => {
    expect(isAdvisorEmbedType("badge")).toBe(true);
    expect(isAdvisorEmbedType("reviews")).toBe(true);
    expect(isAdvisorEmbedType("book")).toBe(true);
    expect(isAdvisorEmbedType("widget")).toBe(false);
    expect(isAdvisorEmbedType(null)).toBe(false);
    expect(isAdvisorEmbedType(undefined)).toBe(false);
  });

  it("normaliseAdvisorEmbedTheme falls back to light", () => {
    expect(normaliseAdvisorEmbedTheme("dark")).toBe("dark");
    expect(normaliseAdvisorEmbedTheme("auto")).toBe("auto");
    expect(normaliseAdvisorEmbedTheme("light")).toBe("light");
    expect(normaliseAdvisorEmbedTheme("neon")).toBe("light");
    expect(normaliseAdvisorEmbedTheme(null)).toBe("light");
  });

  it("builds the agreed UTM query (source=embed, medium=type, advisor=slug)", () => {
    const q = new URLSearchParams(advisorEmbedUtmQuery("reviews", "jane-smith-cfp"));
    expect(q.get("utm_source")).toBe("embed");
    expect(q.get("utm_medium")).toBe("reviews");
    expect(q.get("utm_campaign")).toBe("advisor-embed-kit");
    expect(q.get("advisor")).toBe("jane-smith-cfp");
  });

  it("advisorEmbedUrl points at the serving route with type/slug/token", () => {
    const url = advisorEmbedUrl({ type: "badge", slug: "x", token: "aet1.a.b" });
    expect(url).toContain("https://invest.com.au/api/widget/advisor-embed?");
    const q = new URLSearchParams(url.split("?")[1]);
    expect(q.get("type")).toBe("badge");
    expect(q.get("slug")).toBe("x");
    expect(q.get("token")).toBe("aet1.a.b");
    // light theme is the default → omitted from the query.
    expect(q.get("theme")).toBeNull();
    expect(q.get("format")).toBeNull();
  });

  it("advisorEmbedUrl includes theme + format when non-default", () => {
    const url = advisorEmbedUrl({
      type: "book",
      slug: "x",
      token: "t",
      theme: "dark",
      format: "html",
    });
    const q = new URLSearchParams(url.split("?")[1]);
    expect(q.get("theme")).toBe("dark");
    expect(q.get("format")).toBe("html");
  });

  it("buildAdvisorEmbedSnippets emits script + iframe variants for each type", () => {
    const snippets = buildAdvisorEmbedSnippets({ slug: "jane-smith-cfp", token: "aet1.a.b" });
    expect(snippets.map((s) => s.type).sort()).toEqual([...ADVISOR_EMBED_TYPES].sort());
    for (const s of snippets) {
      expect(s.scriptHtml).toContain("<script");
      expect(s.scriptHtml).toContain("/api/widget/advisor-embed");
      expect(s.iframeHtml).toContain("<iframe");
      expect(s.iframeHtml).toContain("format=html");
      expect(s.previewUrl).toContain("format=html");
      // Both variants carry the token + slug.
      expect(s.scriptHtml).toContain("jane-smith-cfp");
      expect(s.iframeHtml).toContain("aet1.a.b");
    }
  });

  it("threads the chosen theme into the snippet URLs", () => {
    const snippets = buildAdvisorEmbedSnippets({ slug: "x", token: "t", theme: "dark" });
    for (const s of snippets) {
      expect(s.scriptHtml).toContain("theme=dark");
      expect(s.iframeHtml).toContain("theme=dark");
    }
  });
});
