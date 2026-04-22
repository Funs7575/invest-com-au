// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { getSessionId } from "@/lib/session";

/**
 * getSessionId is the first-party analytics ID — cookie-first,
 * localStorage fallback, UUID generation on cold start. Every
 * analytics event carries the result, so regressions here break
 * session-stitching across the attribution pipeline.
 */

describe("getSessionId", () => {
  beforeEach(() => {
    // Clear cookies + storage between tests
    document.cookie.split(";").forEach((c) => {
      const name = c.split("=")[0]?.trim();
      if (name) document.cookie = `${name}=; path=/; max-age=0`;
    });
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty string when window is undefined (SSR guard)", () => {
    const originalWindow = globalThis.window;
    // @ts-expect-error — simulating SSR
    delete globalThis.window;
    try {
      expect(getSessionId()).toBe("");
    } finally {
      globalThis.window = originalWindow;
    }
  });

  it("returns the cookie value when _inv_sid cookie is set", () => {
    document.cookie = "_inv_sid=cookie-value-abc; path=/";
    expect(getSessionId()).toBe("cookie-value-abc");
  });

  it("promotes a localStorage value back into a cookie (cookie expired, storage didn't)", () => {
    localStorage.setItem("_inv_sid", "storage-value-xyz");
    expect(getSessionId()).toBe("storage-value-xyz");
    // Cookie should now carry the same ID
    expect(document.cookie).toContain("_inv_sid=storage-value-xyz");
  });

  it("generates a new UUID when neither cookie nor storage has a value", () => {
    const id = getSessionId();
    // Crypto.randomUUID shape: 8-4-4-4-12 hex chars
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    // AND persists to both cookie + storage
    expect(document.cookie).toContain(`_inv_sid=${id}`);
    expect(localStorage.getItem("_inv_sid")).toBe(id);
  });

  it("is idempotent on the cold-start path — second call returns the same ID", () => {
    const first = getSessionId();
    const second = getSessionId();
    expect(second).toBe(first);
  });

  it("falls back to the Math.random UUID when crypto.randomUUID is missing (older browsers)", () => {
    // Temporarily remove randomUUID
    const original = crypto.randomUUID;
    delete (crypto as { randomUUID?: () => string }).randomUUID;

    try {
      const id = getSessionId();
      // Same UUIDv4 shape from the polyfill
      expect(id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
    } finally {
      (crypto as { randomUUID?: () => string }).randomUUID = original;
    }
  });

  it("survives a localStorage setItem throw (private browsing / quota)", () => {
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceeded");
    });
    // Should not throw and should still return the freshly-generated cookie ID
    const id = getSessionId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(document.cookie).toContain(`_inv_sid=${id}`);
  });

  it("survives a localStorage getItem throw when reading the fallback", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("SecurityError");
    });
    // Cold start still works — generates a fresh id
    const id = getSessionId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });
});
