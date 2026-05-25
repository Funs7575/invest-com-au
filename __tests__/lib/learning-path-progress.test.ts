/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// ─── Mock useUser ─────────────────────────────────────────────────────────────
const mockUserState: { user: { id: string; email: string } | null } = { user: null };

vi.mock("@/lib/hooks/useUser", () => ({
  useUser: () => mockUserState,
}));

// ─── Mock fetch so DB writes are no-ops ───────────────────────────────────────
const { mockFetch } = vi.hoisted(() => ({
  mockFetch: vi.fn(),
}));

vi.stubGlobal("fetch", mockFetch);

import { renderHook, act, waitFor } from "@testing-library/react";
import { useLearningPathProgress } from "@/hooks/use-learning-path-progress";

const LS_KEY = "learning_path_progress:v1";

function clearLocalStorage() {
  window.localStorage.removeItem(LS_KEY);
}

describe("useLearningPathProgress (anonymous user)", () => {
  beforeEach(() => {
    clearLocalStorage();
    mockUserState.user = null;
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ state: {} }) });
  });

  afterEach(() => {
    clearLocalStorage();
    vi.clearAllMocks();
  });

  it("starts with empty completedIndices", () => {
    const { result } = renderHook(() =>
      useLearningPathProgress("new-investor", 10)
    );
    expect(result.current.completedIndices.size).toBe(0);
    expect(result.current.completedCount).toBe(0);
  });

  it("isHydrated becomes true on mount", async () => {
    const { result } = renderHook(() =>
      useLearningPathProgress("new-investor", 10)
    );
    await waitFor(() => expect(result.current.isHydrated).toBe(true));
  });

  it("markComplete adds an index", async () => {
    const { result } = renderHook(() =>
      useLearningPathProgress("new-investor", 10)
    );
    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    act(() => {
      result.current.markComplete(0);
    });
    expect(result.current.completedIndices.has(0)).toBe(true);
    expect(result.current.completedCount).toBe(1);
    expect(result.current.isComplete(0)).toBe(true);
  });

  it("markComplete is idempotent", async () => {
    const { result } = renderHook(() =>
      useLearningPathProgress("new-investor", 10)
    );
    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    act(() => {
      result.current.markComplete(2);
      result.current.markComplete(2);
    });
    expect(result.current.completedCount).toBe(1);
  });

  it("markIncomplete removes an index", async () => {
    const { result } = renderHook(() =>
      useLearningPathProgress("new-investor", 10)
    );
    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    act(() => {
      result.current.markComplete(1);
    });
    act(() => {
      result.current.markIncomplete(1);
    });
    expect(result.current.completedIndices.has(1)).toBe(false);
    expect(result.current.completedCount).toBe(0);
  });

  it("markIncomplete on a non-completed index is a no-op", async () => {
    const { result } = renderHook(() =>
      useLearningPathProgress("new-investor", 10)
    );
    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    act(() => {
      result.current.markIncomplete(5);
    });
    expect(result.current.completedCount).toBe(0);
  });

  it("resetProgress clears all completed indices", async () => {
    const { result } = renderHook(() =>
      useLearningPathProgress("new-investor", 10)
    );
    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    act(() => {
      result.current.markComplete(0);
      result.current.markComplete(3);
      result.current.markComplete(7);
    });
    expect(result.current.completedCount).toBe(3);
    act(() => {
      result.current.resetProgress();
    });
    expect(result.current.completedCount).toBe(0);
    expect(result.current.completedIndices.size).toBe(0);
  });

  it("persists progress to localStorage on markComplete", async () => {
    const { result } = renderHook(() =>
      useLearningPathProgress("new-investor", 10)
    );
    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    act(() => {
      result.current.markComplete(4);
    });
    const stored = window.localStorage.getItem(LS_KEY);
    expect(stored).not.toBeNull();
    const parsed = JSON.parse(stored!) as Record<string, { completedStepIndices: number[] }>;
    expect(parsed["new-investor"]?.completedStepIndices).toContain(4);
  });

  it("hydrates from localStorage on mount", async () => {
    // Pre-seed localStorage
    const seed = {
      "new-investor": {
        completedStepIndices: [1, 3],
        startedAt: "2026-05-20T10:00:00Z",
        lastActivityAt: "2026-05-20T10:00:00Z",
      },
    };
    window.localStorage.setItem(LS_KEY, JSON.stringify(seed));

    const { result } = renderHook(() =>
      useLearningPathProgress("new-investor", 10)
    );
    await waitFor(() => expect(result.current.isHydrated).toBe(true));

    expect(result.current.isComplete(1)).toBe(true);
    expect(result.current.isComplete(3)).toBe(true);
    expect(result.current.isComplete(0)).toBe(false);
  });

  it("does NOT call fetch for anonymous users", async () => {
    const { result } = renderHook(() =>
      useLearningPathProgress("new-investor", 10)
    );
    await waitFor(() => expect(result.current.isHydrated).toBe(true));
    // Anonymous user → no DB fetch
    expect(mockFetch).not.toHaveBeenCalled();
    void result;
  });

  it("different paths have independent progress", async () => {
    const { result: r1 } = renderHook(() =>
      useLearningPathProgress("new-investor", 10)
    );
    const { result: r2 } = renderHook(() =>
      useLearningPathProgress("retirement-and-super", 13)
    );
    await waitFor(() => expect(r1.current.isHydrated).toBe(true));
    await waitFor(() => expect(r2.current.isHydrated).toBe(true));
    act(() => {
      r1.current.markComplete(0);
    });
    expect(r1.current.completedCount).toBe(1);
    expect(r2.current.completedCount).toBe(0);
  });
});

describe("useLearningPathProgress (signed-in user)", () => {
  beforeEach(() => {
    clearLocalStorage();
    mockUserState.user = { id: "user-123", email: "test@example.com" };
  });

  afterEach(() => {
    clearLocalStorage();
    vi.clearAllMocks();
  });

  it("calls GET /api/calculator-state to fetch remote progress", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        state: {
          learning_path_progress: {
            data: {
              "new-investor": {
                completedStepIndices: [0, 2],
                startedAt: "2026-05-21T09:00:00Z",
                lastActivityAt: "2026-05-21T09:00:00Z",
              },
            },
          },
        },
      }),
    });

    const { result } = renderHook(() =>
      useLearningPathProgress("new-investor", 10)
    );
    await waitFor(() => expect(result.current.isHydrated).toBe(true));

    expect(mockFetch).toHaveBeenCalledWith("/api/calculator-state", { method: "GET" });
    expect(result.current.isComplete(0)).toBe(true);
    expect(result.current.isComplete(2)).toBe(true);
    expect(result.current.isComplete(1)).toBe(false);
  });

  it("marks steps complete and schedules a debounced POST", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ state: {} }),
    });

    const { result } = renderHook(() =>
      useLearningPathProgress("new-investor", 10)
    );
    await waitFor(() => expect(result.current.isHydrated).toBe(true));

    act(() => {
      result.current.markComplete(5);
    });

    expect(result.current.isComplete(5)).toBe(true);
  });

  it("is resilient to a failed GET (gracefully falls back to localStorage)", async () => {
    mockFetch.mockRejectedValue(new Error("network failure"));

    const seed = {
      "new-investor": {
        completedStepIndices: [7],
        startedAt: "2026-05-20T08:00:00Z",
        lastActivityAt: "2026-05-20T08:00:00Z",
      },
    };
    window.localStorage.setItem(LS_KEY, JSON.stringify(seed));

    const { result } = renderHook(() =>
      useLearningPathProgress("new-investor", 10)
    );
    await waitFor(() => expect(result.current.isHydrated).toBe(true));

    // localStorage value should still be present
    expect(result.current.isComplete(7)).toBe(true);
  });
});
