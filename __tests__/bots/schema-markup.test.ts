import { describe, it, expect, vi } from "vitest";
import { checkSchemaMarkup } from "../../bots/checks/schema-markup";
import { FindingStore } from "../../bots/findings/store";
import type { Page } from "@playwright/test";

function makePage(jsonldBlocks: string[], url = "http://localhost:3000/brokers"): Page {
  return {
    evaluate: vi.fn().mockResolvedValue(jsonldBlocks),
    url: vi.fn().mockReturnValue(url),
  } as unknown as Page;
}

function makeStore() {
  return new FindingStore();
}

describe("checkSchemaMarkup", () => {
  it("adds no findings for a page with no JSON-LD blocks", async () => {
    const store = makeStore();
    await checkSchemaMarkup(makePage([]), store, "test");
    expect(store.all()).toHaveLength(0);
  });

  it("adds no findings for a valid Article block", async () => {
    const block = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "Test Article",
      datePublished: "2026-01-01",
      author: { "@type": "Person", name: "Author" },
    });
    const store = makeStore();
    await checkSchemaMarkup(makePage([block]), store, "test");
    expect(store.all().filter((f) => f.category === "schema")).toHaveLength(0);
  });

  it("flags an Article missing datePublished", async () => {
    const block = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      headline: "Test",
      author: { "@type": "Person", name: "Author" },
    });
    const store = makeStore();
    await checkSchemaMarkup(makePage([block]), store, "test");
    const findings = store.all().filter((f) => f.category === "schema");
    expect(findings.length).toBeGreaterThan(0);
    expect(findings.some((f) => f.title.includes("datePublished"))).toBe(true);
  });

  it("flags an Article missing both headline and author", async () => {
    const block = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "Article",
      datePublished: "2026-01-01",
    });
    const store = makeStore();
    await checkSchemaMarkup(makePage([block]), store, "test");
    const findings = store.all().filter((f) => f.category === "schema");
    expect(findings.some((f) => f.title.includes("headline"))).toBe(true);
    expect(findings.some((f) => f.title.includes("author"))).toBe(true);
  });

  it("flags a FAQPage missing mainEntity", async () => {
    const block = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "FAQPage",
    });
    const store = makeStore();
    await checkSchemaMarkup(makePage([block]), store, "test");
    const findings = store.all().filter((f) => f.category === "schema");
    expect(findings.some((f) => f.title.includes("FAQPage") && f.title.includes("mainEntity"))).toBe(true);
  });

  it("flags FAQPage mainEntity item missing name", async () => {
    const block = JSON.stringify({
      "@type": "FAQPage",
      mainEntity: [
        { "@type": "Question", acceptedAnswer: { "@type": "Answer", text: "Answer text" } },
      ],
    });
    const store = makeStore();
    await checkSchemaMarkup(makePage([block]), store, "test");
    const findings = store.all().filter((f) => f.category === "schema");
    expect(findings.some((f) => f.title.includes("mainEntity item missing name"))).toBe(true);
  });

  it("flags FAQPage mainEntity item missing acceptedAnswer.text", async () => {
    const block = JSON.stringify({
      "@type": "FAQPage",
      mainEntity: [
        { "@type": "Question", name: "What is X?", acceptedAnswer: { "@type": "Answer" } },
      ],
    });
    const store = makeStore();
    await checkSchemaMarkup(makePage([block]), store, "test");
    const findings = store.all().filter((f) => f.category === "schema");
    expect(findings.some((f) => f.title.includes("acceptedAnswer.text"))).toBe(true);
  });

  it("flags a malformed JSON-LD block", async () => {
    const store = makeStore();
    await checkSchemaMarkup(makePage(["{not valid json"]), store, "test");
    const findings = store.all().filter((f) => f.category === "schema");
    expect(findings.some((f) => f.title.includes("Malformed"))).toBe(true);
    expect(findings[0]?.severity).toBe("low");
  });

  it("validates @graph arrays — each node checked individually", async () => {
    const block = JSON.stringify({
      "@context": "https://schema.org",
      "@graph": [
        { "@type": "Organization", name: "Invest", url: "https://invest.com.au" },
        { "@type": "WebSite" }, // missing name
      ],
    });
    const store = makeStore();
    await checkSchemaMarkup(makePage([block]), store, "test");
    const findings = store.all().filter((f) => f.category === "schema");
    expect(findings.some((f) => f.title.includes("WebSite") && f.title.includes("name"))).toBe(true);
    // Organization node is valid — no finding for it
    expect(findings.every((f) => !f.title.includes("Organization"))).toBe(true);
  });

  it("flags a BreadcrumbList missing itemListElement", async () => {
    const block = JSON.stringify({
      "@type": "BreadcrumbList",
    });
    const store = makeStore();
    await checkSchemaMarkup(makePage([block]), store, "test");
    const findings = store.all().filter((f) => f.category === "schema");
    expect(findings.some((f) => f.title.includes("BreadcrumbList") && f.title.includes("itemListElement"))).toBe(true);
  });

  it("flags BreadcrumbList items missing name", async () => {
    const block = JSON.stringify({
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, item: "https://invest.com.au/" },
      ],
    });
    const store = makeStore();
    await checkSchemaMarkup(makePage([block]), store, "test");
    const findings = store.all().filter((f) => f.category === "schema");
    expect(findings.some((f) => f.title.includes("BreadcrumbList item missing name"))).toBe(true);
    expect(findings[0]?.severity).toBe("low");
  });

  it("strips namespace prefix — schema:Article treated same as Article", async () => {
    const block = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "schema:Article",
      datePublished: "2026-01-01",
      author: { "@type": "Person", name: "Author" },
    });
    const store = makeStore();
    await checkSchemaMarkup(makePage([block]), store, "test");
    const findings = store.all().filter((f) => f.category === "schema");
    expect(findings.some((f) => f.title.includes("headline"))).toBe(true);
  });

  it("adds no findings for types not in the required-fields map", async () => {
    const block = JSON.stringify({
      "@type": "VideoObject",
      name: "A video",
    });
    const store = makeStore();
    await checkSchemaMarkup(makePage([block]), store, "test");
    expect(store.all().filter((f) => f.category === "schema")).toHaveLength(0);
  });

  it("deduplicates repeated calls on the same URL — occurrences increments", async () => {
    const block = JSON.stringify({
      "@type": "Article",
      datePublished: "2026-01-01",
      author: { "@type": "Person", name: "Author" },
    });
    const url = "http://localhost/brokers";
    const store = makeStore();
    // Same URL + same missing field → same dedupe id → occurrences = 2
    await checkSchemaMarkup(makePage([block], url), store, "test");
    await checkSchemaMarkup(makePage([block], url), store, "test");
    const findings = store.all().filter((f) => f.title.includes("headline"));
    expect(findings).toHaveLength(1);
    expect(findings[0]?.occurrences).toBe(2);
  });

  it("produces separate findings for the same issue on different pages", async () => {
    const block = JSON.stringify({
      "@type": "Article",
      datePublished: "2026-01-01",
      author: { "@type": "Person", name: "Author" },
    });
    const store = makeStore();
    await checkSchemaMarkup(makePage([block], "http://localhost/page-1"), store, "test");
    await checkSchemaMarkup(makePage([block], "http://localhost/page-2"), store, "test");
    const findings = store.all().filter((f) => f.title.includes("headline"));
    // Different URLs → different dedupe ids → two separate findings
    expect(findings).toHaveLength(2);
  });

  it("silently skips if page.evaluate throws (navigated away)", async () => {
    const page = {
      evaluate: vi.fn().mockRejectedValue(new Error("Target closed")),
      url: vi.fn().mockReturnValue("http://localhost/"),
    } as unknown as Page;
    const store = makeStore();
    await expect(checkSchemaMarkup(page, store, "test")).resolves.toBeUndefined();
    expect(store.all()).toHaveLength(0);
  });
});
