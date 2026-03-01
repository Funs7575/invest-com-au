import { describe, it, expect } from "vitest";
import { sanitizeHtml } from "@/lib/sanitize-html";

describe("sanitizeHtml", () => {
  describe("strips dangerous tags", () => {
    it("strips <script> tags", () => {
      expect(sanitizeHtml("<script>alert('xss')</script>")).toBe("");
    });

    it("strips <iframe> tags", () => {
      expect(sanitizeHtml('<iframe src="evil.com"></iframe>')).toBe("");
    });

    it("strips <object> tags", () => {
      expect(sanitizeHtml('<object data="evil.swf"></object>')).toBe("");
    });

    it("strips <embed> tags", () => {
      expect(sanitizeHtml('<embed src="evil.swf">')).toBe("");
    });

    it("strips <style> tags", () => {
      expect(sanitizeHtml("<style>body{display:none}</style>")).toBe("");
    });

    it("strips <svg> tags", () => {
      expect(sanitizeHtml('<svg onload="alert(1)"></svg>')).toBe("");
    });

    it("strips <math> tags", () => {
      expect(sanitizeHtml("<math><mi>x</mi></math>")).toBe("");
    });

    it("strips <form> tags and their children", () => {
      expect(
        sanitizeHtml(
          '<form action="evil.com"><input type="text"><button>Submit</button></form>'
        )
      ).toBe("");
    });

    it("strips <input> tags", () => {
      expect(sanitizeHtml('<input type="text" value="evil">')).toBe("");
    });

    it("strips <textarea> tags", () => {
      expect(sanitizeHtml("<textarea>evil</textarea>")).toBe("");
    });

    it("strips <select> tags", () => {
      expect(sanitizeHtml("<select><option>evil</option></select>")).toBe("");
    });

    it("strips <button> tags", () => {
      expect(sanitizeHtml("<button>click me</button>")).toBe("");
    });

    it("strips <base> tags", () => {
      expect(sanitizeHtml('<base href="evil.com">')).toBe("");
    });

    it("strips <link> tags", () => {
      expect(sanitizeHtml('<link rel="stylesheet" href="evil.css">')).toBe("");
    });

    it("strips <meta> tags", () => {
      expect(
        sanitizeHtml(
          '<meta http-equiv="refresh" content="0;url=evil.com">'
        )
      ).toBe("");
    });
  });

  describe("strips event handler attributes", () => {
    it("strips onclick", () => {
      expect(sanitizeHtml('<div onclick="alert(1)">text</div>')).toBe(
        "<div>text</div>"
      );
    });

    it("strips onerror", () => {
      const result = sanitizeHtml('<img onerror="alert(1)" src="x">');
      expect(result).not.toContain("onerror");
      expect(result).toContain("src=");
    });

    it("strips onload", () => {
      const result = sanitizeHtml('<body onload="alert(1)">content</body>');
      expect(result).not.toContain("onload");
    });

    it("strips onmouseover", () => {
      const result = sanitizeHtml(
        '<div onmouseover="alert(1)">hover</div>'
      );
      expect(result).not.toContain("onmouseover");
      expect(result).toContain("hover");
    });
  });

  describe("strips dangerous attribute values", () => {
    it("strips javascript: from href", () => {
      expect(
        sanitizeHtml('<a href="javascript:alert(1)">click</a>')
      ).toBe('<a href="">click</a>');
    });

    it("strips data: from src attributes", () => {
      const result = sanitizeHtml(
        '<img src="data:text/html,<script>alert(1)</script>">'
      );
      expect(result).not.toContain("data:text/html");
    });
  });

  describe("preserves safe HTML", () => {
    it("preserves plain text", () => {
      expect(sanitizeHtml("Hello world")).toBe("Hello world");
    });

    it("preserves <p> tags", () => {
      expect(sanitizeHtml("<p>Hello</p>")).toBe("<p>Hello</p>");
    });

    it("preserves <a> tags with safe hrefs", () => {
      expect(
        sanitizeHtml('<a href="https://example.com">link</a>')
      ).toBe('<a href="https://example.com">link</a>');
    });

    it("preserves <strong> tags", () => {
      expect(sanitizeHtml("<strong>bold</strong>")).toBe(
        "<strong>bold</strong>"
      );
    });

    it("preserves <em> tags", () => {
      expect(sanitizeHtml("<em>italic</em>")).toBe("<em>italic</em>");
    });

    it("preserves <img> tags with safe src and alt", () => {
      expect(
        sanitizeHtml('<img src="photo.jpg" alt="photo">')
      ).toBe('<img src="photo.jpg" alt="photo">');
    });

    it("preserves <ul> and <li> tags", () => {
      const input = "<ul><li>item 1</li><li>item 2</li></ul>";
      expect(sanitizeHtml(input)).toBe(input);
    });

    it("preserves <h1> through <h6> tags", () => {
      expect(sanitizeHtml("<h1>Title</h1>")).toBe("<h1>Title</h1>");
      expect(sanitizeHtml("<h3>Subtitle</h3>")).toBe("<h3>Subtitle</h3>");
    });

    it("preserves <br> tags", () => {
      expect(sanitizeHtml("line 1<br>line 2")).toBe("line 1<br>line 2");
    });
  });

  describe("handles edge cases", () => {
    it("handles empty string", () => {
      expect(sanitizeHtml("")).toBe("");
    });

    it("handles nested dangerous tags inside safe tags", () => {
      const result = sanitizeHtml(
        "<p>Safe</p><script>alert(1)</script><strong>Also safe</strong>"
      );
      expect(result).toContain("<p>Safe</p>");
      expect(result).toContain("<strong>Also safe</strong>");
      expect(result).not.toContain("script");
    });

    it("handles multiple dangerous attributes on one element", () => {
      const result = sanitizeHtml(
        '<div onclick="a()" onmouseover="b()">text</div>'
      );
      expect(result).not.toContain("onclick");
      expect(result).not.toContain("onmouseover");
      expect(result).toContain("text");
    });

    it("handles deeply nested content", () => {
      const result = sanitizeHtml(
        "<div><p><strong>deep <em>content</em></strong></p></div>"
      );
      expect(result).toContain("deep");
      expect(result).toContain("content");
    });
  });
});
