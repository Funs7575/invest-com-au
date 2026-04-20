import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { createRateLimiter } from "@/lib/rate-limiter";

describe("createRateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-20T00:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows the first request under the limit", () => {
    const limit = createRateLimiter(60_000, 3);
    expect(limit("1.2.3.4")).toBe(false);
  });

  it("lets exactly 'maxRequests' calls pass before blocking", () => {
    const limit = createRateLimiter(60_000, 3);
    expect(limit("1.2.3.4")).toBe(false); // 1
    expect(limit("1.2.3.4")).toBe(false); // 2
    expect(limit("1.2.3.4")).toBe(false); // 3
    expect(limit("1.2.3.4")).toBe(true); // 4 — blocked
  });

  it("tracks IPs independently", () => {
    const limit = createRateLimiter(60_000, 1);
    expect(limit("a")).toBe(false);
    expect(limit("a")).toBe(true);
    expect(limit("b")).toBe(false); // different IP resets
  });

  it("resets the window after the configured duration elapses", () => {
    const limit = createRateLimiter(60_000, 1);
    expect(limit("1.2.3.4")).toBe(false);
    expect(limit("1.2.3.4")).toBe(true);
    vi.advanceTimersByTime(61_000);
    expect(limit("1.2.3.4")).toBe(false); // fresh window
  });

  it("does NOT reset inside the window", () => {
    const limit = createRateLimiter(60_000, 1);
    expect(limit("1.2.3.4")).toBe(false);
    vi.advanceTimersByTime(30_000);
    expect(limit("1.2.3.4")).toBe(true);
  });

  it("lazy-cleans expired entries after 60s of access silence", () => {
    // Not directly observable, but we can assert that a stale IP
    // behaves like a brand-new one after the cleanup window.
    const limit = createRateLimiter(10_000, 1);
    expect(limit("1.2.3.4")).toBe(false);
    expect(limit("1.2.3.4")).toBe(true);
    // Skip well past the window AND past the 60s cleanup threshold
    vi.advanceTimersByTime(70_000);
    expect(limit("1.2.3.4")).toBe(false);
  });

  it("two independent limiters have independent state", () => {
    const a = createRateLimiter(60_000, 1);
    const b = createRateLimiter(60_000, 1);
    expect(a("ip")).toBe(false);
    expect(a("ip")).toBe(true);
    expect(b("ip")).toBe(false); // unaffected
  });
});
