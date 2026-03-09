import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("next/cache", () => ({
  unstable_cache: vi.fn(
    (fn: Function, _tags?: string[], _opts?: object) => fn
  ),
}));

import { cached, CacheTTL } from "@/lib/cache";
import { unstable_cache } from "next/cache";

const mockUnstableCache = vi.mocked(unstable_cache);

describe("CacheTTL", () => {
  it("STATIC is 24 hours (86400 seconds)", () => {
    expect(CacheTTL.STATIC).toBe(86400);
  });

  it("MODERATE is 1 hour (3600 seconds)", () => {
    expect(CacheTTL.MODERATE).toBe(3600);
  });

  it("DYNAMIC is 5 minutes (300 seconds)", () => {
    expect(CacheTTL.DYNAMIC).toBe(300);
  });

  it("values are readonly (as const)", () => {
    expect(CacheTTL).toEqual({
      STATIC: 86400,
      MODERATE: 3600,
      DYNAMIC: 300,
    });
  });
});

describe("cached", () => {
  beforeEach(() => {
    mockUnstableCache.mockClear();
  });

  it("calls unstable_cache with the provided function, tags, and options", () => {
    const fn = async (slug: string) => ({ slug });
    cached(fn, ["broker"], { revalidate: CacheTTL.STATIC });

    expect(mockUnstableCache).toHaveBeenCalledWith(
      fn,
      ["broker"],
      { revalidate: CacheTTL.STATIC, tags: ["broker"] }
    );
  });

  it("defaults revalidate to CacheTTL.MODERATE when not specified", () => {
    const fn = async () => "data";
    cached(fn, ["articles"]);

    expect(mockUnstableCache).toHaveBeenCalledWith(
      fn,
      ["articles"],
      { revalidate: CacheTTL.MODERATE, tags: ["articles"] }
    );
  });

  it("passes multiple tags through correctly", () => {
    const fn = async () => [];
    cached(fn, ["broker", "list"], { revalidate: CacheTTL.DYNAMIC });

    expect(mockUnstableCache).toHaveBeenCalledWith(
      fn,
      ["broker", "list"],
      { revalidate: CacheTTL.DYNAMIC, tags: ["broker", "list"] }
    );
  });

  it("returns a callable function", async () => {
    const fn = async (x: number) => x * 2;
    const cachedFn = cached(fn, ["test"]);

    const result = await cachedFn(5);
    expect(result).toBe(10);
  });

  it("handles empty tags array", () => {
    const fn = async () => null;
    cached(fn, []);

    expect(mockUnstableCache).toHaveBeenCalledWith(
      fn,
      [],
      { revalidate: CacheTTL.MODERATE, tags: [] }
    );
  });

  it("allows explicit revalidate of 0", () => {
    const fn = async () => "fresh";
    cached(fn, ["fresh"], { revalidate: 0 });

    expect(mockUnstableCache).toHaveBeenCalledWith(
      fn,
      ["fresh"],
      { revalidate: 0, tags: ["fresh"] }
    );
  });
});
