/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

// Control useUser output per test
const userState: {
  user: { id: string; email: string } | null;
  loading: boolean;
} = { user: { id: "u1", email: "u@x.com" }, loading: false };

vi.mock("@/lib/hooks/useUser", () => ({
  useUser: () => userState,
}));

// Control course_purchases maybeSingle output
let coursePurchaseResult: { data: unknown; error: unknown } = {
  data: null,
  error: null,
};
let maybeSingleThrows = false;

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            limit: () => ({
              maybeSingle: async () => {
                if (maybeSingleThrows) throw new Error("query failed");
                return coursePurchaseResult;
              },
            }),
          }),
        }),
      }),
    })),
  })),
}));

import { useCourseAccess } from "@/lib/hooks/useCourseAccess";

describe("useCourseAccess", () => {
  beforeEach(() => {
    userState.user = { id: "u1", email: "u@x.com" };
    userState.loading = false;
    coursePurchaseResult = { data: null, error: null };
    maybeSingleThrows = false;
  });

  it("returns hasCourse=false + loading=false for unauthenticated user", async () => {
    userState.user = null;
    const { result } = renderHook(() => useCourseAccess());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasCourse).toBe(false);
  });

  it("stays loading while the useUser hook is still loading", () => {
    userState.loading = true;
    const { result } = renderHook(() => useCourseAccess());
    expect(result.current.loading).toBe(true);
  });

  it("returns hasCourse=true when a purchase row exists", async () => {
    coursePurchaseResult = { data: { id: 7 }, error: null };
    const { result } = renderHook(() => useCourseAccess());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasCourse).toBe(true);
  });

  it("returns hasCourse=false when no row exists", async () => {
    coursePurchaseResult = { data: null, error: null };
    const { result } = renderHook(() => useCourseAccess());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasCourse).toBe(false);
  });

  it("treats thrown queries as no access (graceful degrade)", async () => {
    maybeSingleThrows = true;
    const { result } = renderHook(() => useCourseAccess());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasCourse).toBe(false);
  });

  it("defaults course slug to 'investing-101'", async () => {
    coursePurchaseResult = { data: { id: 1 }, error: null };
    const { result } = renderHook(() => useCourseAccess());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasCourse).toBe(true);
  });

  it("accepts an explicit course slug", async () => {
    coursePurchaseResult = { data: { id: 1 }, error: null };
    const { result } = renderHook(() => useCourseAccess("advanced-options"));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.hasCourse).toBe(true);
  });
});
