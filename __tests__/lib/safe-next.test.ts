import { describe, it, expect } from "vitest";
import { safeNextPath } from "@/lib/safe-next";

describe("safeNextPath — open-redirect guard for the login `next` param", () => {
  describe("accepts same-origin relative paths unchanged", () => {
    it.each([
      "/account",
      "/pro",
      "/dashboard/settings",
      "/account?tab=billing",
      "/path#section",
    ])("%s", (input) => {
      expect(safeNextPath(input)).toBe(input);
    });
  });

  describe("rejects off-site / malicious destinations and falls back to /account", () => {
    it.each([
      "https://evil.example/login", // absolute http(s) URL
      "http://evil.example/x",
      "//evil.example/login", // protocol-relative URL
      "//evil.example", // protocol-relative, no path
      "javascript:alert(1)", // javascript: scheme
      "data:text/html,<script>", // data: scheme
      "ftp://evil.example", // other scheme
      "evil.example/path", // bare host, no leading slash
      "account", // relative, no leading slash
      "", // empty string
    ])("%s -> /account", (input) => {
      expect(safeNextPath(input)).toBe("/account");
    });
  });

  describe("falls back for null/undefined", () => {
    it("null -> /account", () => {
      expect(safeNextPath(null)).toBe("/account");
    });
    it("undefined -> /account", () => {
      expect(safeNextPath(undefined)).toBe("/account");
    });
  });

  it("honours a custom fallback", () => {
    expect(safeNextPath("//evil.example", "/login")).toBe("/login");
    expect(safeNextPath(null, "/home")).toBe("/home");
  });
});
