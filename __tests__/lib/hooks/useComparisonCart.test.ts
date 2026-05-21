/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";

// ── useShortlist mock (composed dependency, NOT the module under test) ─────────
// useComparisonCart is the unit under test; it composes useShortlist, which in
// turn depends on useUser + fetch + Supabase. Mock the composed hook with a
// small stateful fake so we exercise the cart's broker-delegation path.

const shortlistState: { slugs: string[] } = { slugs: [] };
const shortlistMock = {
  add: vi.fn((slug: string) => {
    if (!shortlistState.slugs.includes(slug)) shortlistState.slugs.push(slug);
  }),
  remove: vi.fn((slug: string) => {
    shortlistState.slugs = shortlistState.slugs.filter((s) => s !== slug);
  }),
};

vi.mock("@/lib/hooks/useShortlist", () => ({
  useShortlist: () => ({ ...shortlistMock, slugs: shortlistState.slugs }),
}));

import {
  useComparisonCart,
  CART_MAX_TOTAL,
} from "@/lib/hooks/useComparisonCart";

const NON_BROKER_KEY = "invest_cart_non_broker";

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
  shortlistState.slugs = [];
  delete store[NON_BROKER_KEY];
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

describe("useComparisonCart", () => {
  it("exposes a max-total of 6", () => {
    expect(CART_MAX_TOTAL).toBe(6);
  });

  it("starts empty", () => {
    const { result } = renderHook(() => useComparisonCart());
    expect(result.current.items).toEqual([]);
    expect(result.current.count).toBe(0);
    expect(result.current.isFull).toBe(false);
  });

  it("hydrates non-broker items from localStorage", () => {
    store[NON_BROKER_KEY] = JSON.stringify([
      { kind: "etf", ref: "VAS", addedAt: "2026-01-01T00:00:00Z" },
    ]);
    const { result } = renderHook(() => useComparisonCart());
    expect(result.current.items).toEqual([
      { kind: "etf", ref: "VAS", addedAt: "2026-01-01T00:00:00Z" },
    ]);
    expect(result.current.count).toBe(1);
  });

  it("filters out malformed / broker-kind entries when hydrating", () => {
    store[NON_BROKER_KEY] = JSON.stringify([
      { kind: "etf", ref: "VAS", addedAt: "2026-01-01T00:00:00Z" }, // valid
      { kind: "broker", ref: "x", addedAt: "2026-01-01T00:00:00Z" }, // wrong layer
      { kind: "etf", ref: 5, addedAt: "2026-01-01T00:00:00Z" }, // bad ref
      { kind: "etf", ref: "Y" }, // missing addedAt
      "garbage",
      null,
    ]);
    const { result } = renderHook(() => useComparisonCart());
    expect(result.current.items).toEqual([
      { kind: "etf", ref: "VAS", addedAt: "2026-01-01T00:00:00Z" },
    ]);
  });

  it("treats malformed JSON / non-array as empty", () => {
    store[NON_BROKER_KEY] = "not json";
    const { result } = renderHook(() => useComparisonCart());
    expect(result.current.items).toEqual([]);
  });

  it("adds a non-broker item, stamps addedAt, and persists", () => {
    const { result } = renderHook(() => useComparisonCart());
    let res!: { ok: boolean; reason?: string };
    act(() => {
      res = result.current.add({ kind: "etf", ref: "VAS", label: "Vanguard" });
    });
    expect(res.ok).toBe(true);
    expect(result.current.items).toHaveLength(1);
    const item = result.current.items[0]!;
    expect(item.kind).toBe("etf");
    expect(item.ref).toBe("VAS");
    expect(item.label).toBe("Vanguard");
    expect(typeof item.addedAt).toBe("string");
    expect(Number.isNaN(Date.parse(item.addedAt))).toBe(false);
    expect(JSON.parse(store[NON_BROKER_KEY]!)).toHaveLength(1);
  });

  it("add is idempotent for an item already present", () => {
    const { result } = renderHook(() => useComparisonCart());
    act(() => {
      result.current.add({ kind: "etf", ref: "VAS" });
    });
    let res!: { ok: boolean };
    act(() => {
      res = result.current.add({ kind: "etf", ref: "VAS" });
    });
    expect(res.ok).toBe(true);
    expect(result.current.items).toHaveLength(1);
  });

  it("delegates broker adds to the shortlist hook", () => {
    const { result } = renderHook(() => useComparisonCart());
    let res!: { ok: boolean };
    act(() => {
      res = result.current.add({ kind: "broker", ref: "stake" });
    });
    expect(res.ok).toBe(true);
    expect(shortlistMock.add).toHaveBeenCalledWith("stake");
    // broker items are not written to the non-broker localStorage layer
    expect(store[NON_BROKER_KEY]).toBeUndefined();
  });

  it("composes broker shortlist + non-broker layer in the unified view", () => {
    shortlistState.slugs = ["stake", "pearler"];
    store[NON_BROKER_KEY] = JSON.stringify([
      { kind: "advisor", ref: "jane", addedAt: "2026-01-01T00:00:00Z" },
    ]);
    const { result } = renderHook(() => useComparisonCart());
    expect(result.current.count).toBe(3);
    const kinds = result.current.items.map((i) => i.kind);
    expect(kinds).toEqual(["broker", "broker", "advisor"]);
    const brokerItem = result.current.items.find((i) => i.kind === "broker")!;
    expect(brokerItem.addedAt).toBe("1970-01-01T00:00:00Z");
  });

  it("has() matches on both kind and ref", () => {
    store[NON_BROKER_KEY] = JSON.stringify([
      { kind: "etf", ref: "VAS", addedAt: "2026-01-01T00:00:00Z" },
    ]);
    shortlistState.slugs = ["stake"];
    const { result } = renderHook(() => useComparisonCart());
    expect(result.current.has({ kind: "etf", ref: "VAS" })).toBe(true);
    expect(result.current.has({ kind: "broker", ref: "stake" })).toBe(true);
    expect(result.current.has({ kind: "advisor", ref: "VAS" })).toBe(false);
    expect(result.current.has({ kind: "etf", ref: "nope" })).toBe(false);
  });

  it("rejects an add once the cart is full", () => {
    store[NON_BROKER_KEY] = JSON.stringify(
      Array.from({ length: CART_MAX_TOTAL }, (_, i) => ({
        kind: "etf",
        ref: `etf-${i}`,
        addedAt: "2026-01-01T00:00:00Z",
      })),
    );
    const { result } = renderHook(() => useComparisonCart());
    expect(result.current.isFull).toBe(true);
    let res!: { ok: boolean; reason?: string };
    act(() => {
      res = result.current.add({ kind: "etf", ref: "overflow" });
    });
    expect(res.ok).toBe(false);
    expect(res.reason).toContain("full");
    expect(result.current.count).toBe(CART_MAX_TOTAL);
  });

  it("removes a non-broker item and persists", () => {
    store[NON_BROKER_KEY] = JSON.stringify([
      { kind: "etf", ref: "VAS", addedAt: "2026-01-01T00:00:00Z" },
      { kind: "advisor", ref: "jane", addedAt: "2026-01-02T00:00:00Z" },
    ]);
    const { result } = renderHook(() => useComparisonCart());
    act(() => result.current.remove({ kind: "etf", ref: "VAS" }));
    expect(result.current.items).toEqual([
      { kind: "advisor", ref: "jane", addedAt: "2026-01-02T00:00:00Z" },
    ]);
    expect(JSON.parse(store[NON_BROKER_KEY]!)).toHaveLength(1);
  });

  it("delegates broker removes to the shortlist hook", () => {
    shortlistState.slugs = ["stake"];
    const { result } = renderHook(() => useComparisonCart());
    act(() => result.current.remove({ kind: "broker", ref: "stake" }));
    expect(shortlistMock.remove).toHaveBeenCalledWith("stake");
  });

  it("clear() empties only the non-broker layer, leaving broker shortlist intact", () => {
    shortlistState.slugs = ["stake"];
    store[NON_BROKER_KEY] = JSON.stringify([
      { kind: "etf", ref: "VAS", addedAt: "2026-01-01T00:00:00Z" },
    ]);
    const { result } = renderHook(() => useComparisonCart());
    act(() => result.current.clear());
    // non-broker gone, broker remains
    expect(result.current.items.map((i) => i.kind)).toEqual(["broker"]);
    expect(JSON.parse(store[NON_BROKER_KEY]!)).toEqual([]);
    expect(shortlistMock.remove).not.toHaveBeenCalled();
  });
});
