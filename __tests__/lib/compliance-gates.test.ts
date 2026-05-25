import { describe, it, expect, afterEach, vi } from "vitest";
import { startupRaisesEnabled } from "@/lib/compliance-gates";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("startupRaisesEnabled", () => {
  it("is false when the env var is unset", () => {
    vi.stubEnv("STARTUP_RAISES_ENABLED", "");
    expect(startupRaisesEnabled()).toBe(false);
  });

  it("is false for any value other than 'true'", () => {
    vi.stubEnv("STARTUP_RAISES_ENABLED", "1");
    expect(startupRaisesEnabled()).toBe(false);
    vi.stubEnv("STARTUP_RAISES_ENABLED", "yes");
    expect(startupRaisesEnabled()).toBe(false);
    vi.stubEnv("STARTUP_RAISES_ENABLED", "TRUE");
    expect(startupRaisesEnabled()).toBe(false);
  });

  it("is true only when exactly 'true'", () => {
    vi.stubEnv("STARTUP_RAISES_ENABLED", "true");
    expect(startupRaisesEnabled()).toBe(true);
  });
});
