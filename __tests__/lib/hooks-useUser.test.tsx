/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";

let getUserImpl: () => Promise<{ data: { user: unknown } }> = () =>
  Promise.resolve({ data: { user: null } });
let onAuthStateChangeCb:
  | ((event: string, session: { user: unknown } | null) => void)
  | null = null;
const unsubscribe = vi.fn();

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: () => getUserImpl(),
      onAuthStateChange: (cb: typeof onAuthStateChangeCb) => {
        onAuthStateChangeCb = cb;
        return { data: { subscription: { unsubscribe } } };
      },
    },
  })),
}));

import { useUser } from "@/lib/hooks/useUser";

describe("useUser", () => {
  beforeEach(() => {
    getUserImpl = () => Promise.resolve({ data: { user: null } });
    onAuthStateChangeCb = null;
    unsubscribe.mockClear();
  });

  it("starts in loading state with null user", async () => {
    const { result } = renderHook(() => useUser());
    expect(result.current.loading).toBe(true);
    expect(result.current.user).toBeNull();
    // Let pending promises resolve so we don't leak into the next test
    await waitFor(() => expect(result.current.loading).toBe(false));
  });

  it("settles with null user when no session", async () => {
    getUserImpl = () => Promise.resolve({ data: { user: null } });
    const { result } = renderHook(() => useUser());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
  });

  it("settles with the fetched user when authenticated", async () => {
    const user = { id: "u1", email: "u@x.com" };
    getUserImpl = () => Promise.resolve({ data: { user } });
    const { result } = renderHook(() => useUser());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toEqual(user);
  });

  it("treats a thrown getUser as logged-out (doesn't hang loading)", async () => {
    getUserImpl = () => Promise.reject(new Error("auth service down"));
    const { result } = renderHook(() => useUser());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.user).toBeNull();
  });

  it("upgrades state when onAuthStateChange fires", async () => {
    const { result } = renderHook(() => useUser());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const freshUser = { id: "u2", email: "x@y.com" };
    act(() => {
      onAuthStateChangeCb?.("SIGNED_IN", { user: freshUser });
    });
    expect(result.current.user).toEqual(freshUser);
  });

  it("unsubscribes on unmount", async () => {
    const { unmount } = renderHook(() => useUser());
    await waitFor(() => expect(unsubscribe).not.toHaveBeenCalled());
    unmount();
    expect(unsubscribe).toHaveBeenCalled();
  });
});
