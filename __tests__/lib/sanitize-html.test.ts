import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "@/lib/sanitize-html";

describe("sanitizeHtml", () => {
  it("strips <script> tags and content", () => {
    expect(sanitizeHtml('<p>Hello</p><script>alert("xss")</script>')).toBe("<p>Hello</p>");
  });

  it("strips <iframe> tags and content", () => {
    expect(sanitizeHtml('<iframe src="evil.com"></iframe>')).toBe("");
  });

  it("strips <object> tags and content", () => {
    expect(sanitizeHtml('<object data="evil.swf"></object>')).toBe("");
  });

  it("strips <embed> tags", () => {
    expect(sanitizeHtml('<embed src="evil.swf" />')).toBe("");
  });

  it("strips <style> tags and content", () => {
    expect(sanitizeHtml("<style>body{display:none}</style><p>Hi</p>")).toBe("<p>Hi</p>");
  });

  it("strips <svg> tags and content", () => {
    expect(sanitizeHtml('<svg onload="alert(1)"><circle/></svg>')).toBe("");
  });

  it("strips <form> tags and content", () => {
    expect(sanitizeHtml('<form action="/steal"><input type="text" /></form>')).toBe("");
  });

  it("strips <input> tags", () => {
    expect(sanitizeHtml('<input type="hidden" value="steal" />')).toBe("");
  });

  it("strips <base> tags", () => {
    expect(sanitizeHtml('<base href="https://evil.com/" />')).toBe("");
  });

  it("strips onclick handler", () => {
    const result = sanitizeHtml('<a href="/safe" onclick="alert(1)">Click</a>');
    expect(result).not.toContain("onclick");
    expect(result).toContain("Click");
  });

  it("strips onerror handler", () => {
    const result = sanitizeHtml('<img src="x" onerror="alert(1)" />');
    expect(result).not.toContain("onerror");
  });

  it("strips javascript: protocol in href", () => {
    const result = sanitizeHtml('<a href="javascript:alert(1)">Click</a>');
    expect(result).not.toContain("javascript:");
  });

  it("strips data: protocol in src", () => {
    const result = sanitizeHtml('<img src="data:text/html,<script>alert(1)</script>" />');
    expect(result).not.toContain("data:");
  });

  it("preserves <p> tags", () => {
    expect(sanitizeHtml("<p>Hello world</p>")).toBe("<p>Hello world</p>");
  });

  it("preserves <a> with safe href", () => {
    const html = '<a href="https://example.com">Link</a>';
    expect(sanitizeHtml(html)).toBe(html);
  });

  it("preserves <strong> and <em>", () => {
    const html = "<strong>Bold</strong> and <em>italic</em>";
    expect(sanitizeHtml(html)).toBe(html);
  });

  it("handles empty string", () => {
    expect(sanitizeHtml("")).toBe("");
  });

  it("handles plain text", () => {
    expect(sanitizeHtml("Just plain text")).toBe("Just plain text");
  });
});
