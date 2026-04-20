import { describe, it, expect } from "vitest";
import { escapeHtml } from "@/lib/html-escape";

describe("escapeHtml", () => {
  it("escapes ampersand", () => {
    expect(escapeHtml("fish & chips")).toBe("fish &amp; chips");
  });

  it("escapes less-than and greater-than", () => {
    expect(escapeHtml("<script>alert(1)</script>")).toBe(
      "&lt;script&gt;alert(1)&lt;/script&gt;",
    );
  });

  it("escapes double quote", () => {
    expect(escapeHtml('"onclick"')).toBe("&quot;onclick&quot;");
  });

  it("escapes single quote / apostrophe", () => {
    expect(escapeHtml("don't")).toBe("don&#39;t");
  });

  it("escapes all five in one pass", () => {
    expect(escapeHtml(`<a href="x" onclick='y'>Tom & Jerry</a>`)).toBe(
      "&lt;a href=&quot;x&quot; onclick=&#39;y&#39;&gt;Tom &amp; Jerry&lt;/a&gt;",
    );
  });

  it("escapes ampersand first so existing entities stay escaped (no double-decode)", () => {
    // "&amp;" should become "&amp;amp;", not "&amp;" (idempotent input escaped further)
    expect(escapeHtml("&amp;")).toBe("&amp;amp;");
  });

  it("returns empty string unchanged", () => {
    expect(escapeHtml("")).toBe("");
  });

  it("leaves plain text alone", () => {
    expect(escapeHtml("Hello world")).toBe("Hello world");
  });

  it("leaves unicode alone", () => {
    expect(escapeHtml("中文 한글 emoji 💰")).toBe("中文 한글 emoji 💰");
  });

  it("handles a common XSS attempt", () => {
    const payload = `<img src=x onerror="alert('xss')">`;
    expect(escapeHtml(payload)).toBe(
      "&lt;img src=x onerror=&quot;alert(&#39;xss&#39;)&quot;&gt;",
    );
  });

  it("handles a newline-containing multi-line input", () => {
    expect(escapeHtml("line one\n<br>\nline two")).toBe(
      "line one\n&lt;br&gt;\nline two",
    );
  });
});
