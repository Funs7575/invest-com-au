import { describe, it, expect } from "vitest";
import {
  isProdHost,
  resolveTargetClass,
  loadConfig,
  assertTargetAllowed,
} from "../../bots/config";

describe("isProdHost", () => {
  it.each([
    ["invest.com.au", true],
    ["www.invest.com.au", true],
    ["staging.invest.com.au", true],
    ["invest.com.au:443", true],
    ["my-preview.vercel.app", false],
    ["localhost", false],
    ["localhost:3000", false],
  ])("%s -> %s", (host, expected) => {
    expect(isProdHost(host)).toBe(expected);
  });
});

describe("resolveTargetClass", () => {
  it("treats localhost as sandbox", () => {
    expect(resolveTargetClass("localhost:3000")).toBe("sandbox");
    expect(resolveTargetClass("127.0.0.1:3000")).toBe("sandbox");
  });
  it("treats remote hosts as protected by default", () => {
    expect(resolveTargetClass("my-preview.vercel.app")).toBe("protected");
  });
  it("honours an explicit override", () => {
    expect(resolveTargetClass("localhost", "protected")).toBe("protected");
    expect(resolveTargetClass("my-preview.vercel.app", "sandbox")).toBe("sandbox");
  });
});

describe("loadConfig", () => {
  it("defaults to a local sandbox target", () => {
    const cfg = loadConfig({ baseUrl: "http://localhost:3000" });
    expect(cfg.host).toBe("localhost:3000");
    expect(cfg.targetClass).toBe("sandbox");
    expect(cfg.runDir.startsWith("bots/.runs/")).toBe(true);
    expect(cfg.aiCostBudgetUsd).toBeGreaterThanOrEqual(0);
    expect(cfg.ignoreHttpsErrors).toBe(false);
  });
  it("derives a deterministic runId from the clock", () => {
    const cfg = loadConfig({ baseUrl: "http://localhost:3000" }, new Date("2026-05-29T12:34:56Z"));
    expect(cfg.runId).toContain("2026-05-29");
  });
  it("respects explicit overrides", () => {
    const cfg = loadConfig({ baseUrl: "https://x", concurrency: 12, aiCostBudgetUsd: 50 });
    expect(cfg.concurrency).toBe(12);
    expect(cfg.aiCostBudgetUsd).toBe(50);
  });
});

describe("assertTargetAllowed", () => {
  it("throws for a prod host without override", () => {
    const cfg = loadConfig({ baseUrl: "https://invest.com.au", prodOverride: false });
    expect(() => assertTargetAllowed(cfg)).toThrow(/production host/i);
  });
  it("allows a prod host with the explicit override", () => {
    const cfg = loadConfig({ baseUrl: "https://invest.com.au", prodOverride: true });
    expect(() => assertTargetAllowed(cfg)).not.toThrow();
  });
  it("allows non-prod hosts", () => {
    const cfg = loadConfig({ baseUrl: "http://localhost:3000" });
    expect(() => assertTargetAllowed(cfg)).not.toThrow();
  });
});
