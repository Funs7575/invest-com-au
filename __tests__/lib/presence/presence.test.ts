import { describe, it, expect } from "vitest";
import { isPingFresh, STALE_WINDOW_MS } from "@/lib/presence";

describe("isPingFresh", () => {
  it("returns false for null / undefined ping", () => {
    expect(isPingFresh(null)).toBe(false);
    expect(isPingFresh(undefined)).toBe(false);
  });

  it("returns true for a ping within the staleness window", () => {
    const recent = new Date(Date.now() - 60 * 1000).toISOString(); // 1 min ago
    expect(isPingFresh(recent)).toBe(true);
  });

  it("returns false for a ping older than the staleness window", () => {
    const old = new Date(Date.now() - STALE_WINDOW_MS - 1000).toISOString();
    expect(isPingFresh(old)).toBe(false);
  });

  it("treats the boundary correctly (5 min cutoff)", () => {
    // Exactly at the edge — should be false (>= cutoff fails the < check)
    const boundary = new Date(Date.now() - STALE_WINDOW_MS).toISOString();
    expect(isPingFresh(boundary)).toBe(false);
  });
});
