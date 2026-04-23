/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

const userState: {
  user: { id: string; email: string } | null;
  loading: boolean;
} = { user: { id: "u1", email: "u@x.com" }, loading: false };

vi.mock("@/lib/hooks/useUser", () => ({
  useUser: () => userState,
}));

let subResult: { data: unknown } = { data: null };

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: () => ({
        eq: () => ({
          in: () => ({
            order: () => ({
              limit: () => ({
                maybeSingle: async () => subResult,
              }),
            }),
          }),
        }),
      }),
    })),
  })),
}));

import { useSubscription } from "@/lib/hooks/useSubscription";

describe("useSubscription", () => {
  beforeEach(() => {
    userState.user = { id: "u1", email: "u@x.com" };
    userState.loading = false;
    subResult = { data: null };
  });

  it("returns null subscription + isPro=false for unauthenticated", async () => {
    userState.user = null;
    const { result } = renderHook(() => useSubscription());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.subscription).toBeNull();
    expect(result.current.isPro).toBe(false);
  });

  it("returns the subscription row when active", async () => {
    subResult = { data: { id: 1, status: "active" } };
    const { result } = renderHook(() => useSubscription());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.subscription).toEqual({ id: 1, status: "active" });
    expect(result.current.isPro).toBe(true);
  });

  it("isPro=true for trialing status", async () => {
    subResult = { data: { id: 2, status: "trialing" } };
    const { result } = renderHook(() => useSubscription());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.isPro).toBe(true);
  });

  it("isPro=false for past_due (still returned, but not Pro)", async () => {
    subResult = { data: { id: 3, status: "past_due" } };
    const { result } = renderHook(() => useSubscription());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.subscription?.status).toBe("past_due");
    expect(result.current.isPro).toBe(false);
  });

  it("optimisticUpdate patches the subscription locally", async () => {
    subResult = {
      data: { id: 1, status: "active", cancel_at_period_end: false },
    };
    const { result } = renderHook(() => useSubscription());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => {
      result.current.optimisticUpdate({ cancel_at_period_end: true });
    });
    expect(result.current.subscription?.cancel_at_period_end).toBe(true);
  });

  it("optimisticUpdate is a no-op when subscription is null", async () => {
    userState.user = null;
    const { result } = renderHook(() => useSubscription());
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => {
      result.current.optimisticUpdate({ cancel_at_period_end: true });
    });
    expect(result.current.subscription).toBeNull();
  });

  it("refresh() re-fetches the subscription row", async () => {
    subResult = { data: { id: 1, status: "active" } };
    const { result } = renderHook(() => useSubscription());
    await waitFor(() => expect(result.current.loading).toBe(false));

    subResult = { data: { id: 1, status: "canceled" } };
    await act(async () => {
      await result.current.refresh();
    });
    expect(result.current.subscription?.status).toBe("canceled");
  });
});
