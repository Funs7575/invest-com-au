/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { scrub, usePersistentForm } from "@/lib/form-persistence";

describe("scrub (pure)", () => {
  it("keeps regular fields intact", () => {
    expect(scrub({ name: "Jane", age: 30 }, [])).toEqual({
      name: "Jane",
      age: 30,
    });
  });

  it("drops fields matching built-in sensitive patterns", () => {
    const res = scrub(
      {
        name: "Jane",
        password: "pw",
        api_token: "tk",
        cardNumber: "123",
        secret_key: "s",
        cvv: "999",
        ssn: "111",
        tfn: "222",
        account_number: "333",
        bsb: "444",
      },
      [],
    );
    expect(res).toEqual({ name: "Jane" });
  });

  it("drops extra sensitive fields from options", () => {
    const res = scrub({ name: "Jane", internalId: "x" }, ["internalId"]);
    expect(res).toEqual({ name: "Jane" });
  });

  it("is case-insensitive on pattern matching", () => {
    expect(scrub({ Password: "x", PASSWORD: "y" }, [])).toEqual({});
  });

  it("preserves non-string values", () => {
    expect(
      scrub({ name: "x", age: 30, active: true, nested: { a: 1 } }, []),
    ).toEqual({ name: "x", age: 30, active: true, nested: { a: 1 } });
  });
});

describe("usePersistentForm", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("returns the initial value on first mount + hydrated=true", () => {
    const { result } = renderHook(() =>
      usePersistentForm({ name: "", email: "" }, { formKey: "t1" }),
    );
    expect(result.current.value).toEqual({ name: "", email: "" });
    expect(result.current.hydrated).toBe(true);
  });

  it("writes setValue updates to localStorage (scrubbed)", () => {
    const { result } = renderHook(() =>
      usePersistentForm(
        { name: "", email: "", password: "" },
        { formKey: "t2" },
      ),
    );
    act(() => {
      result.current.setValue({
        name: "Jane",
        email: "j@x.com",
        password: "secret",
      });
    });
    const raw = localStorage.getItem("form:t2:v1");
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    // password stripped before persist
    expect(parsed.data).toEqual({ name: "Jane", email: "j@x.com" });
    expect(parsed.savedAt).toEqual(expect.any(Number));
  });

  it("hydrates persisted state on second mount", () => {
    localStorage.setItem(
      "form:t3:v1",
      JSON.stringify({
        savedAt: Date.now(),
        data: { name: "Jane", email: "j@x.com" },
      }),
    );
    const { result } = renderHook(() =>
      usePersistentForm({ name: "", email: "" }, { formKey: "t3" }),
    );
    expect(result.current.value).toEqual({ name: "Jane", email: "j@x.com" });
  });

  it("discards stale state older than maxAgeHours", () => {
    const threeDaysAgo = Date.now() - 73 * 60 * 60 * 1000;
    localStorage.setItem(
      "form:t4:v1",
      JSON.stringify({ savedAt: threeDaysAgo, data: { name: "Jane" } }),
    );
    const { result } = renderHook(() =>
      usePersistentForm({ name: "" }, { formKey: "t4", maxAgeHours: 72 }),
    );
    expect(result.current.value).toEqual({ name: "" });
    expect(localStorage.getItem("form:t4:v1")).toBeNull();
  });

  it("versioning: different versions do not collide", () => {
    localStorage.setItem(
      "form:t5:v1",
      JSON.stringify({ savedAt: Date.now(), data: { name: "OldSchema" } }),
    );
    const { result } = renderHook(() =>
      usePersistentForm({ name: "" }, { formKey: "t5", version: 2 }),
    );
    // v2 ignores v1 data entirely
    expect(result.current.value).toEqual({ name: "" });
  });

  it("reset() clears the state and removes storage", () => {
    const { result } = renderHook(() =>
      usePersistentForm({ name: "" }, { formKey: "t6" }),
    );
    act(() => {
      result.current.setValue({ name: "Jane" });
    });
    expect(localStorage.getItem("form:t6:v1")).not.toBeNull();
    act(() => {
      result.current.reset();
    });
    expect(result.current.value).toEqual({ name: "" });
    expect(localStorage.getItem("form:t6:v1")).toBeNull();
  });

  it("setValue accepts a function updater", () => {
    const { result } = renderHook(() =>
      usePersistentForm({ count: 0 }, { formKey: "t7" }),
    );
    act(() => {
      result.current.setValue((prev) => ({ count: prev.count + 1 }));
    });
    act(() => {
      result.current.setValue((prev) => ({ count: prev.count + 1 }));
    });
    expect(result.current.value).toEqual({ count: 2 });
  });

  it("tolerates corrupt persisted JSON", () => {
    localStorage.setItem("form:t8:v1", "{not json");
    const { result } = renderHook(() =>
      usePersistentForm({ name: "" }, { formKey: "t8" }),
    );
    expect(result.current.value).toEqual({ name: "" });
    expect(result.current.hydrated).toBe(true);
  });

  it("honours extra sensitiveFields option", () => {
    const { result } = renderHook(() =>
      usePersistentForm<{ name: string; secret_note: string }>(
        { name: "", secret_note: "" },
        { formKey: "t9", sensitiveFields: ["secret_note"] },
      ),
    );
    act(() => {
      result.current.setValue({ name: "Jane", secret_note: "hidden" });
    });
    const parsed = JSON.parse(localStorage.getItem("form:t9:v1")!);
    expect(parsed.data.secret_note).toBeUndefined();
    expect(parsed.data.name).toBe("Jane");
  });
});
