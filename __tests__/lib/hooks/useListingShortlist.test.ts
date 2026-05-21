/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useListingShortlist } from "@/lib/hooks/useListingShortlist";

const STORAGE_KEY = "invest_listing_shortlist_v1";

// ── localStorage stub ─────────────────────────────────────────────────────────

const store: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => store[key] ?? null),
  setItem: vi.fn((key: string, val: string) => {
    store[key] = val;
  }),
  removeItem: vi.fn((key: string) => {
    delete store[key];
  }),
  clear: vi.fn(() => {
    Object.keys(store).forEach((k) => delete store[k]);
  }),
};

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
  Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useListingShortlist", () => {
  it("starts empty when nothing is stored", () => {
    const { result } = renderHook(() => useListingShortlist());
    expect(result.current.slugs).toEqual([]);
    expect(result.current.count).toBe(0);
    expect(result.current.max).toBe(4);
  });

  it("hydrates from localStorage on mount", () => {
    store[STORAGE_KEY] = JSON.stringify(["a", "b"]);
    const { result } = renderHook(() => useListingShortlist());
    expect(result.current.slugs).toEqual(["a", "b"]);
    expect(result.current.count).toBe(2);
  });

  it("ignores non-string entries when hydrating", () => {
    store[STORAGE_KEY] = JSON.stringify(["a", 5, null, "b", { x: 1 }]);
    const { result } = renderHook(() => useListingShortlist());
    expect(result.current.slugs).toEqual(["a", "b"]);
  });

  it("treats malformed JSON as empty", () => {
    store[STORAGE_KEY] = "{not valid json";
    const { result } = renderHook(() => useListingShortlist());
    expect(result.current.slugs).toEqual([]);
  });

  it("treats a non-array stored value as empty", () => {
    store[STORAGE_KEY] = JSON.stringify({ foo: "bar" });
    const { result } = renderHook(() => useListingShortlist());
    expect(result.current.slugs).toEqual([]);
  });

  it("toggle adds a slug and persists it", () => {
    const { result } = renderHook(() => useListingShortlist());
    act(() => result.current.toggle("broker-x"));
    expect(result.current.slugs).toEqual(["broker-x"]);
    expect(result.current.count).toBe(1);
    expect(JSON.parse(store[STORAGE_KEY]!)).toEqual(["broker-x"]);
  });

  it("toggle removes a slug that is already present", () => {
    const { result } = renderHook(() => useListingShortlist());
    act(() => result.current.toggle("broker-x"));
    act(() => result.current.toggle("broker-x"));
    expect(result.current.slugs).toEqual([]);
    expect(JSON.parse(store[STORAGE_KEY]!)).toEqual([]);
  });

  it("has() reflects membership", () => {
    const { result } = renderHook(() => useListingShortlist());
    expect(result.current.has("broker-x")).toBe(false);
    act(() => result.current.toggle("broker-x"));
    expect(result.current.has("broker-x")).toBe(true);
  });

  it("enforces the MAX_SHORTLIST cap of 4", () => {
    const { result } = renderHook(() => useListingShortlist());
    act(() => {
      result.current.toggle("a");
    });
    act(() => result.current.toggle("b"));
    act(() => result.current.toggle("c"));
    act(() => result.current.toggle("d"));
    act(() => result.current.toggle("e"));
    expect(result.current.count).toBe(4);
    expect(result.current.slugs).toEqual(["a", "b", "c", "d"]);
    expect(result.current.has("e")).toBe(false);
  });

  it("can still remove an item once at the cap", () => {
    const { result } = renderHook(() => useListingShortlist());
    act(() => result.current.toggle("a"));
    act(() => result.current.toggle("b"));
    act(() => result.current.toggle("c"));
    act(() => result.current.toggle("d"));
    act(() => result.current.toggle("b")); // remove
    expect(result.current.slugs).toEqual(["a", "c", "d"]);
    // now a new add succeeds
    act(() => result.current.toggle("e"));
    expect(result.current.slugs).toEqual(["a", "c", "d", "e"]);
  });

  it("clear() empties the shortlist and persists empty", () => {
    const { result } = renderHook(() => useListingShortlist());
    act(() => result.current.toggle("a"));
    act(() => result.current.toggle("b"));
    act(() => result.current.clear());
    expect(result.current.slugs).toEqual([]);
    expect(result.current.count).toBe(0);
    expect(JSON.parse(store[STORAGE_KEY]!)).toEqual([]);
  });

  it("dispatches a CustomEvent so other instances stay in sync", () => {
    const { result: a } = renderHook(() => useListingShortlist());
    const { result: b } = renderHook(() => useListingShortlist());
    act(() => a.current.toggle("shared-slug"));
    // the second hook listens for the change event and updates
    expect(b.current.slugs).toEqual(["shared-slug"]);
  });

  it("silently ignores a localStorage write failure", () => {
    localStorageMock.setItem.mockImplementationOnce(() => {
      throw new Error("quota");
    });
    const { result } = renderHook(() => useListingShortlist());
    expect(() => act(() => result.current.toggle("a"))).not.toThrow();
    // state still updates even though persistence threw
    expect(result.current.slugs).toEqual(["a"]);
  });
});
