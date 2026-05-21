/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";

const { mockReplace, paramsRef } = vi.hoisted(() => ({
  mockReplace: vi.fn(),
  paramsRef: { current: new URLSearchParams() },
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: mockReplace, push: vi.fn(), prefetch: vi.fn() }),
  usePathname: () => "/advisors",
  useSearchParams: () => paramsRef.current,
}));

import { useDirectoryParams } from "@/lib/hooks/useDirectoryParams";

describe("useDirectoryParams", () => {
  beforeEach(() => {
    mockReplace.mockClear();
    paramsRef.current = new URLSearchParams();
  });

  it("sets a param and replaces the URL on the current path", () => {
    const { result } = renderHook(() => useDirectoryParams());
    result.current.setParams({ state: "NSW" });
    expect(mockReplace).toHaveBeenCalledWith("/advisors?state=NSW", { scroll: false });
  });

  it("deletes a param when the value is empty", () => {
    paramsRef.current = new URLSearchParams("state=NSW&sort=name");
    const { result } = renderHook(() => useDirectoryParams());
    result.current.setParams({ state: "" });
    expect(mockReplace).toHaveBeenCalledWith("/advisors?sort=name", { scroll: false });
  });

  it("preserves unrelated existing params", () => {
    paramsRef.current = new URLSearchParams("utm=x");
    const { result } = renderHook(() => useDirectoryParams());
    result.current.setParams({ type: "financial_planner" });
    const url = mockReplace.mock.calls.at(-1)?.[0] as string;
    expect(url).toContain("utm=x");
    expect(url).toContain("type=financial_planner");
  });

  it("drops the query string entirely when no params remain", () => {
    paramsRef.current = new URLSearchParams("state=NSW");
    const { result } = renderHook(() => useDirectoryParams());
    result.current.setParams({ state: "" });
    expect(mockReplace).toHaveBeenCalledWith("/advisors", { scroll: false });
  });

  it("clears only the given keys", () => {
    paramsRef.current = new URLSearchParams("state=NSW&sort=name&utm=x");
    const { result } = renderHook(() => useDirectoryParams());
    result.current.clearParams(["state", "sort"]);
    expect(mockReplace.mock.calls.at(-1)?.[0]).toBe("/advisors?utm=x");
  });

  it("clearParams() with no args removes the whole query string", () => {
    paramsRef.current = new URLSearchParams("state=NSW&sort=name");
    const { result } = renderHook(() => useDirectoryParams());
    result.current.clearParams();
    expect(mockReplace).toHaveBeenCalledWith("/advisors", { scroll: false });
  });
});
