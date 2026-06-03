import { describe, it, expect } from "vitest";
import robots from "@/app/robots";

// app/robots.ts is the single canonical robots source. The static
// public/robots.txt was removed (2026-05-21) because Next.js serves the
// static file in preference to this route, silently overriding it with a
// less-complete disallow list. These assertions lock the intended policy.
describe("app/robots.ts", () => {
  const out = robots();
  const rule = Array.isArray(out.rules) ? out.rules[0] : out.rules;

  it("allows all user-agents to crawl the site root (AI crawlers welcome for GEO)", () => {
    expect(rule?.userAgent).toBe("*");
    expect(rule?.allow).toBe("/");
  });

  it("disallows private/internal paths, including the ones the old static file missed", () => {
    const disallow = (rule?.disallow ?? []) as string[];
    for (const path of ["/api/", "/admin/", "/account/", "/dashboard/", "/review/", "/go/", "/invest/my-listings/"]) {
      expect(disallow).toContain(path);
    }
  });

  it("does not block any AI crawler by name", () => {
    const agents = (Array.isArray(out.rules) ? out.rules : [out.rules]).map((r) => r?.userAgent);
    for (const bot of ["GPTBot", "Google-Extended", "PerplexityBot", "ClaudeBot", "CCBot"]) {
      expect(agents).not.toContain(bot);
    }
  });

  it("points crawlers at all 8 sitemap shards (the /sitemap.xml index 404s on the Netlify runtime)", () => {
    const sitemaps = Array.isArray(out.sitemap) ? out.sitemap : [out.sitemap];
    expect(sitemaps).toHaveLength(8);
    sitemaps.forEach((url, i) =>
      expect(url).toMatch(new RegExp(`/sitemap/${i}\\.xml$`)),
    );
  });
});
