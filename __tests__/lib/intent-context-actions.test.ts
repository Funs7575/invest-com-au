import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockSet, mockDelete, mockCookies } = vi.hoisted(() => {
  const set = vi.fn();
  const del = vi.fn();
  return {
    mockSet: set,
    mockDelete: del,
    mockCookies: vi.fn(async () => ({ set, delete: del })),
  };
});

vi.mock("next/headers", () => ({
  cookies: mockCookies,
}));

import {
  setIntentCountryAction,
  clearIntentCountryAction,
} from "@/lib/intent-context-actions";
import {
  INTENT_COUNTRY_COOKIE,
  INTENT_COUNTRY_TTL_SECONDS,
  isKnownIntentCountry,
} from "@/lib/intent-context";

// A real, known intent code (sanity-checked against the source of truth).
const KNOWN_CODE = "uk";

beforeEach(() => {
  mockSet.mockClear();
  mockDelete.mockClear();
});

describe("setIntentCountryAction", () => {
  it("uses a code that is genuinely known to the registry", () => {
    expect(isKnownIntentCountry(KNOWN_CODE)).toBe(true);
  });

  it("early-returns for an unknown code without touching cookies", async () => {
    expect(isKnownIntentCountry("zz")).toBe(false);
    await setIntentCountryAction("zz");
    expect(mockSet).not.toHaveBeenCalled();
  });

  it("sets the intent cookie with the expected options for a known code", async () => {
    await setIntentCountryAction(KNOWN_CODE);
    expect(mockSet).toHaveBeenCalledTimes(1);
    expect(mockSet).toHaveBeenCalledWith(INTENT_COUNTRY_COOKIE, KNOWN_CODE, {
      maxAge: INTENT_COUNTRY_TTL_SECONDS,
      httpOnly: false,
      sameSite: "lax",
      path: "/",
    });
  });
});

describe("clearIntentCountryAction", () => {
  it("deletes the intent cookie", async () => {
    await clearIntentCountryAction();
    expect(mockDelete).toHaveBeenCalledTimes(1);
    expect(mockDelete).toHaveBeenCalledWith(INTENT_COUNTRY_COOKIE);
  });
});
