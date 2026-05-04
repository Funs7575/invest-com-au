/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

// ── useUser mock ──────────────────────────────────────────────────────────────

const userState: {
  user: { id: string; email: string } | null;
  loading: boolean;
} = { user: null, loading: false };

vi.mock("@/lib/hooks/useUser", () => ({
  useUser: () => userState,
}));

// ── imports after mocks ───────────────────────────────────────────────────────

import { useShortlist } from "@/lib/hooks/useShortlist";
import { useAdvisorShortlist } from "@/lib/hooks/useAdvisorShortlist";

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

// ── setup ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  userState.user = null;
  userState.loading = false;
  localStorageMock.clear();
  vi.clearAllMocks();
  Object.defineProperty(window, "localStorage", {
    value: localStorageMock,
    writable: true,
    configurable: true,
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ slugs: [] }),
      }),
    ),
  );
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ════════════════════════════════════════════════════════════════════════════
// useShortlist
// ════════════════════════════════════════════════════════════════════════════

describe("useShortlist", () => {
  it("initialises with empty slugs", () => {
    const { result } = renderHook(() => useShortlist());
    expect(result.current.slugs).toEqual([]);
    expect(result.current.count).toBe(0);
  });

  it("hydrates from localStorage on mount", async () => {
    store["invest_shortlist"] = JSON.stringify(["commsec", "stake"]);
    const { result } = renderHook(() => useShortlist());
    await waitFor(() => expect(result.current.count).toBe(2));
    expect(result.current.slugs).toEqual(["commsec", "stake"]);
  });

  it("ignores malformed localStorage value", async () => {
    store["invest_shortlist"] = "not-json{{{";
    const { result } = renderHook(() => useShortlist());
    // Malformed: stays empty
    expect(result.current.slugs).toEqual([]);
  });

  it("ignores non-array localStorage value", async () => {
    store["invest_shortlist"] = JSON.stringify({ slugs: ["commsec"] });
    const { result } = renderHook(() => useShortlist());
    expect(result.current.slugs).toEqual([]);
  });

  it("toggle adds a slug not yet in the list", async () => {
    const { result } = renderHook(() => useShortlist());
    act(() => {
      result.current.toggle("stake");
    });
    expect(result.current.slugs).toContain("stake");
    expect(result.current.count).toBe(1);
  });

  it("toggle removes a slug already in the list", async () => {
    store["invest_shortlist"] = JSON.stringify(["commsec", "stake"]);
    const { result } = renderHook(() => useShortlist());
    await waitFor(() => expect(result.current.count).toBe(2));
    act(() => {
      result.current.toggle("commsec");
    });
    expect(result.current.slugs).not.toContain("commsec");
    expect(result.current.count).toBe(1);
  });

  it("toggle is a no-op when at MAX_SHORTLIST (8)", async () => {
    const initial = ["a", "b", "c", "d", "e", "f", "g", "h"];
    store["invest_shortlist"] = JSON.stringify(initial);
    const { result } = renderHook(() => useShortlist());
    await waitFor(() => expect(result.current.count).toBe(8));
    act(() => {
      result.current.toggle("new-slug");
    });
    expect(result.current.count).toBe(8);
    expect(result.current.slugs).not.toContain("new-slug");
  });

  it("has() returns true for a slug in the list", async () => {
    store["invest_shortlist"] = JSON.stringify(["commsec"]);
    const { result } = renderHook(() => useShortlist());
    await waitFor(() => expect(result.current.count).toBe(1));
    expect(result.current.has("commsec")).toBe(true);
    expect(result.current.has("stake")).toBe(false);
  });

  it("clear() empties the list", async () => {
    store["invest_shortlist"] = JSON.stringify(["commsec", "stake"]);
    const { result } = renderHook(() => useShortlist());
    await waitFor(() => expect(result.current.count).toBe(2));
    act(() => {
      result.current.clear();
    });
    expect(result.current.slugs).toEqual([]);
    expect(result.current.count).toBe(0);
  });

  it("clear() persists empty list to localStorage", async () => {
    store["invest_shortlist"] = JSON.stringify(["commsec"]);
    const { result } = renderHook(() => useShortlist());
    await waitFor(() => expect(result.current.count).toBe(1));
    act(() => {
      result.current.clear();
    });
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "invest_shortlist",
      "[]",
    );
  });

  it("listens to shortlist-change events from other components", async () => {
    const { result } = renderHook(() => useShortlist());
    act(() => {
      window.dispatchEvent(
        new CustomEvent("shortlist-change", { detail: ["commsec", "stake"] }),
      );
    });
    expect(result.current.slugs).toEqual(["commsec", "stake"]);
  });

  it("syncs with server when user logs in (calls GET /api/sync-shortlist)", async () => {
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ slugs: ["commsec"] }),
      }),
    );
    vi.stubGlobal("fetch", mockFetch);

    const { rerender } = renderHook(() => useShortlist());

    // Simulate login
    act(() => {
      userState.user = { id: "u1", email: "u@x.com" };
    });
    rerender();

    await waitFor(() =>
      expect(mockFetch).toHaveBeenCalledWith("/api/sync-shortlist"),
    );
  });

  it("merges remote and local slugs on login (remote first)", async () => {
    store["invest_shortlist"] = JSON.stringify(["local-only"]);
    const mockFetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ slugs: ["remote-first"] }),
      }),
    );
    vi.stubGlobal("fetch", mockFetch);

    userState.user = { id: "u1", email: "u@x.com" };
    const { result } = renderHook(() => useShortlist());

    await waitFor(() => expect(result.current.slugs).toContain("remote-first"));
    expect(result.current.slugs).toContain("local-only");
    // remote should appear before local in the merged list
    const remoteIdx = result.current.slugs.indexOf("remote-first");
    const localIdx = result.current.slugs.indexOf("local-only");
    expect(remoteIdx).toBeLessThan(localIdx);
  });

  it("does not call sync when user is null (logged out)", async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);

    userState.user = null;
    renderHook(() => useShortlist());

    // Wait a tick for effects
    await new Promise((r) => setTimeout(r, 20));
    expect(mockFetch).not.toHaveBeenCalledWith("/api/sync-shortlist");
  });
});

// ════════════════════════════════════════════════════════════════════════════
// useAdvisorShortlist
// ════════════════════════════════════════════════════════════════════════════

describe("useAdvisorShortlist", () => {
  it("initialises with empty slugs and max=4", () => {
    const { result } = renderHook(() => useAdvisorShortlist());
    expect(result.current.slugs).toEqual([]);
    expect(result.current.count).toBe(0);
    expect(result.current.max).toBe(4);
  });

  it("hydrates from localStorage on mount", async () => {
    store["invest_advisor_shortlist"] = JSON.stringify(["advisor-a", "advisor-b"]);
    const { result } = renderHook(() => useAdvisorShortlist());
    await waitFor(() => expect(result.current.count).toBe(2));
    expect(result.current.slugs).toEqual(["advisor-a", "advisor-b"]);
  });

  it("ignores malformed localStorage value", () => {
    store["invest_advisor_shortlist"] = "not-json{";
    const { result } = renderHook(() => useAdvisorShortlist());
    expect(result.current.slugs).toEqual([]);
  });

  it("toggle adds a slug not yet in the list", () => {
    const { result } = renderHook(() => useAdvisorShortlist());
    act(() => {
      result.current.toggle("advisor-x");
    });
    expect(result.current.slugs).toContain("advisor-x");
    expect(result.current.count).toBe(1);
  });

  it("toggle removes a slug already in the list", async () => {
    store["invest_advisor_shortlist"] = JSON.stringify(["advisor-a", "advisor-b"]);
    const { result } = renderHook(() => useAdvisorShortlist());
    await waitFor(() => expect(result.current.count).toBe(2));
    act(() => {
      result.current.toggle("advisor-a");
    });
    expect(result.current.slugs).not.toContain("advisor-a");
    expect(result.current.count).toBe(1);
  });

  it("toggle is a no-op when at MAX_SHORTLIST (4)", async () => {
    store["invest_advisor_shortlist"] = JSON.stringify(["a", "b", "c", "d"]);
    const { result } = renderHook(() => useAdvisorShortlist());
    await waitFor(() => expect(result.current.count).toBe(4));
    act(() => {
      result.current.toggle("new-advisor");
    });
    expect(result.current.count).toBe(4);
    expect(result.current.slugs).not.toContain("new-advisor");
  });

  it("has() returns correct boolean", async () => {
    store["invest_advisor_shortlist"] = JSON.stringify(["advisor-a"]);
    const { result } = renderHook(() => useAdvisorShortlist());
    await waitFor(() => expect(result.current.count).toBe(1));
    expect(result.current.has("advisor-a")).toBe(true);
    expect(result.current.has("advisor-z")).toBe(false);
  });

  it("clear() empties the list and writes [] to localStorage", async () => {
    store["invest_advisor_shortlist"] = JSON.stringify(["advisor-a"]);
    const { result } = renderHook(() => useAdvisorShortlist());
    await waitFor(() => expect(result.current.count).toBe(1));
    act(() => {
      result.current.clear();
    });
    expect(result.current.slugs).toEqual([]);
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "invest_advisor_shortlist",
      "[]",
    );
  });

  it("listens to advisor-shortlist-change events from other components", () => {
    const { result } = renderHook(() => useAdvisorShortlist());
    act(() => {
      window.dispatchEvent(
        new CustomEvent("advisor-shortlist-change", {
          detail: ["advisor-a", "advisor-b"],
        }),
      );
    });
    expect(result.current.slugs).toEqual(["advisor-a", "advisor-b"]);
  });

  it("persist dispatches advisor-shortlist-change event on toggle", () => {
    const listener = vi.fn();
    window.addEventListener("advisor-shortlist-change", listener);

    const { result } = renderHook(() => useAdvisorShortlist());
    act(() => {
      result.current.toggle("advisor-x");
    });

    expect(listener).toHaveBeenCalledOnce();
    const event = listener.mock.calls[0]![0] as CustomEvent;
    expect(event.detail).toContain("advisor-x");

    window.removeEventListener("advisor-shortlist-change", listener);
  });
});
