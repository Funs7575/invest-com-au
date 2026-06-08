import { describe, it, expect } from "vitest";
import {
  isFetchFailure,
  anyFetchFailed,
} from "@/lib/advisor-portal/load-state";

function ok(): PromiseSettledResult<Response> {
  return { status: "fulfilled", value: { ok: true } as Response };
}
function notOk(): PromiseSettledResult<Response> {
  return { status: "fulfilled", value: { ok: false } as Response };
}
function rejected(): PromiseSettledResult<Response> {
  return { status: "rejected", reason: new Error("network down") };
}

describe("isFetchFailure", () => {
  it("treats a rejected fetch (network error) as a failure", () => {
    expect(isFetchFailure(rejected())).toBe(true);
  });

  it("treats a non-OK response as a failure", () => {
    expect(isFetchFailure(notOk())).toBe(true);
  });

  it("treats a fulfilled 2xx response as a success", () => {
    expect(isFetchFailure(ok())).toBe(false);
  });
});

describe("anyFetchFailed", () => {
  it("is false when every fetch succeeded", () => {
    expect(anyFetchFailed([ok(), ok()])).toBe(false);
  });

  it("is true when one fetch returned a non-OK status", () => {
    expect(anyFetchFailed([ok(), notOk()])).toBe(true);
  });

  it("is true when one fetch rejected", () => {
    expect(anyFetchFailed([rejected(), ok()])).toBe(true);
  });

  it("is false for an empty list (nothing failed)", () => {
    expect(anyFetchFailed([])).toBe(false);
  });
});
