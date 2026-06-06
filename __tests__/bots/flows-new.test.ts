/**
 * Tests for STARTUP_ECOSYSTEM_FLOW and ADVISOR_PORTAL_FLOW.
 *
 * Each flow's step logic is tested in isolation using a stubbed Playwright Page,
 * mirroring the user-lifecycle test pattern.
 */

import { describe, it, expect, vi } from "vitest";
import { runFlow } from "../../bots/flows/runner";
import { STARTUP_ECOSYSTEM_FLOW } from "../../bots/flows/startup-portal";
import { ADVISOR_PORTAL_FLOW } from "../../bots/flows/advisor-portal";
import { FindingStore } from "../../bots/findings/store";
import type { FlowStepContext } from "../../bots/flows/types";
import type { BotConfig } from "../../bots/config";

// ── Minimal stubs ─────────────────────────────────────────────────────────────

const LONG_TEXT = "Some page content with enough text to comfortably pass all the body-length checks (this is definitely over 50 characters).";

function makePage(overrides: Partial<Record<string, unknown>> = {}): FlowStepContext["page"] {
  return {
    goto: vi.fn().mockResolvedValue({ status: () => 200 }),
    url: vi.fn().mockReturnValue("http://localhost:3000/"),
    waitForLoadState: vi.fn().mockResolvedValue(null),
    waitForTimeout: vi.fn().mockResolvedValue(null),
    locator: vi.fn().mockReturnValue({
      count: vi.fn().mockResolvedValue(0), // default: nothing found (avoids hasError=true)
      first: vi.fn().mockReturnThis(),
      innerText: vi.fn().mockResolvedValue(LONG_TEXT),
    }),
    evaluate: vi.fn().mockResolvedValue([]),
    ...overrides,
  } as unknown as FlowStepContext["page"];
}

function locatorWith(count: number, text = LONG_TEXT) {
  return {
    count: vi.fn().mockResolvedValue(count),
    first: vi.fn().mockReturnThis(),
    innerText: vi.fn().mockResolvedValue(text),
  };
}

function makeConfig(overrides: Partial<BotConfig> = {}): BotConfig {
  return {
    baseUrl: "http://localhost:3000",
    host: "localhost",
    targetClass: "sandbox",
    concurrency: 1,
    maxStepsPerSession: 40,
    aiTokenBudget: 0,
    aiCostBudgetUsd: 0,
    mockAi: true,
    allowDestructive: false,
    prodOverride: false,
    ignoreHttpsErrors: false,
    runDir: ".runs/test",
    runId: "test-run",
    ...overrides,
  };
}

// ── STARTUP_ECOSYSTEM_FLOW ────────────────────────────────────────────────────

describe("STARTUP_ECOSYSTEM_FLOW", () => {
  it("has the expected step names in order", () => {
    expect(STARTUP_ECOSYSTEM_FLOW.steps.map((s) => s.name)).toEqual([
      "startups-hub",
      "startups-for-you",
      "startups-listings",
      "startup-signup-render",
      "startup-portal-gate",
    ]);
  });

  it("exports a non-empty name and description", () => {
    expect(STARTUP_ECOSYSTEM_FLOW.name).toBeTruthy();
    expect(STARTUP_ECOSYSTEM_FLOW.description).toBeTruthy();
  });

  it("all steps pass on a clean happy-path run", async () => {
    // count=0 → hasError=false in for-you step
    // url returns /auth/login so portal-gate sees a valid auth redirect
    const page = makePage({
      url: vi.fn().mockReturnValue("http://localhost:3000/auth/login"),
    });
    const store = new FindingStore();
    const results = await runFlow(STARTUP_ECOSYSTEM_FLOW, page, store, "startup-ecosystem", makeConfig());
    expect(results.every((r) => r.status === "pass")).toBe(true);
    expect(store.all().filter((f) => f.severity === "critical" || f.severity === "high")).toHaveLength(0);
  });

  it("throws and records a finding when startups-hub returns 500", async () => {
    const page = makePage({
      goto: vi.fn().mockResolvedValue({ status: () => 500 }),
    });
    const store = new FindingStore();
    const results = await runFlow(STARTUP_ECOSYSTEM_FLOW, page, store, "test", makeConfig());
    expect(results[0]?.status).toBe("fail");
    expect(results[0]?.detail).toContain("500");
  });

  it("records a medium finding for startups-for-you 404 and does not throw", async () => {
    const goto = vi.fn()
      .mockResolvedValueOnce({ status: () => 200 }) // startups-hub
      .mockResolvedValueOnce({ status: () => 404 }) // startups-for-you
      .mockResolvedValue({ status: () => 200 });    // rest

    const page = makePage({ goto });
    const store = new FindingStore();
    const results = await runFlow(STARTUP_ECOSYSTEM_FLOW, page, store, "test", makeConfig());

    expect(results[1]?.status).toBe("pass"); // 404 handled gracefully — no throw
    const findings = store.all().filter((f) => f.title.includes("for-you returned 404"));
    expect(findings.length).toBeGreaterThan(0);
    expect(findings[0]?.severity).toBe("medium");
    expect(findings[0]?.category).toBe("http-error");
  });

  it("startup-portal-gate: records a medium finding when redirect goes to unexpected URL", async () => {
    // Stay at /startup-portal with empty body → high finding
    const page = makePage({
      url: vi.fn().mockReturnValue("http://localhost:3000/some-unexpected-place"),
    });
    const store = new FindingStore();
    const results = await runFlow(STARTUP_ECOSYSTEM_FLOW, page, store, "test", makeConfig());

    const gateFinding = store.all().find((f) =>
      f.category === "flow-failure" && f.title.includes("startup-portal redirected to unexpected"),
    );
    expect(gateFinding).toBeDefined();
    expect(gateFinding?.severity).toBe("medium");
    expect(results[4]?.status).toBe("pass"); // step doesn't throw
  });

  it("startup-portal-gate: no finding when redirect goes to /auth/login", async () => {
    const page = makePage({
      url: vi.fn().mockReturnValue("http://localhost:3000/auth/login"),
    });
    const store = new FindingStore();

    await runFlow(STARTUP_ECOSYSTEM_FLOW, page, store, "test", makeConfig());

    const gateFinding = store.all().find((f) =>
      f.category === "flow-failure" && f.title.includes("startup-portal"),
    );
    expect(gateFinding).toBeUndefined();
  });

  it("throws when startup-portal returns 500", async () => {
    const goto = vi.fn()
      .mockResolvedValueOnce({ status: () => 200 }) // hub
      .mockResolvedValueOnce({ status: () => 200 }) // for-you
      .mockResolvedValueOnce({ status: () => 200 }) // listings
      .mockResolvedValueOnce({ status: () => 200 }) // signup
      .mockResolvedValueOnce({ status: () => 500 }); // portal gate

    const page = makePage({ goto });
    const store = new FindingStore();
    const results = await runFlow(STARTUP_ECOSYSTEM_FLOW, page, store, "test", makeConfig());

    expect(results[4]?.status).toBe("fail");
    expect(results[4]?.detail).toContain("500");
  });
});

// ── ADVISOR_PORTAL_FLOW ───────────────────────────────────────────────────────

describe("ADVISOR_PORTAL_FLOW", () => {
  it("has the expected step names in order", () => {
    expect(ADVISOR_PORTAL_FLOW.steps.map((s) => s.name)).toEqual([
      "advisor-portal-login-render",
      "advisor-portal-login-fields",
      "advisor-portal-health",
      "advisor-directory-render",
      "advisor-find-render",
    ]);
  });

  it("exports a non-empty name and description", () => {
    expect(ADVISOR_PORTAL_FLOW.name).toBeTruthy();
    expect(ADVISOR_PORTAL_FLOW.description).toBeTruthy();
  });

  it("all steps pass on a clean happy-path run", async () => {
    // count=1 satisfies: email input, password-tab button, find-advisor interactive check
    const page = makePage({
      url: vi.fn().mockReturnValue("http://localhost:3000/advisor-portal"),
      locator: vi.fn().mockReturnValue(locatorWith(1)),
    });
    const store = new FindingStore();
    const results = await runFlow(ADVISOR_PORTAL_FLOW, page, store, "advisor-portal", makeConfig());
    expect(results.every((r) => r.status === "pass")).toBe(true);
    expect(store.all().filter((f) => f.severity === "critical" || f.severity === "high")).toHaveLength(0);
  });

  it("throws when advisor-portal returns 500", async () => {
    const page = makePage({
      goto: vi.fn().mockResolvedValue({ status: () => 500 }),
    });
    const store = new FindingStore();
    const results = await runFlow(ADVISOR_PORTAL_FLOW, page, store, "test", makeConfig());
    expect(results[0]?.status).toBe("fail");
    expect(results[0]?.detail).toContain("500");
  });

  it("records a high finding and throws when email input is missing from login form", async () => {
    // count=0 → email input missing → high finding + step throws
    const page = makePage({
      url: vi.fn().mockReturnValue("http://localhost:3000/advisor-portal"),
      locator: vi.fn().mockReturnValue(locatorWith(0)),
    });
    const store = new FindingStore();
    const results = await runFlow(ADVISOR_PORTAL_FLOW, page, store, "test", makeConfig());

    expect(results[1]?.status).toBe("fail"); // fields step throws
    const emailFinding = store.all().find(
      (f) => f.severity === "high" && f.title.includes("email input missing"),
    );
    expect(emailFinding).toBeDefined();
    // Password tab missing is now medium (not high) — form defaults to magic-link correctly
    const tabFinding = store.all().find(
      (f) => f.severity === "medium" && f.title.includes("password tab missing"),
    );
    expect(tabFinding).toBeDefined();
  });

  it("records a low finding for advisor-portal/health 404 and does not throw", async () => {
    const goto = vi.fn()
      .mockResolvedValueOnce({ status: () => 200 }) // login-render
      .mockResolvedValueOnce({ status: () => 404 }) // health
      .mockResolvedValue({ status: () => 200 });    // rest

    const page = makePage({
      goto,
      url: vi.fn().mockReturnValue("http://localhost:3000/advisor-portal"),
      locator: vi.fn().mockReturnValue(locatorWith(1)),
    });
    const store = new FindingStore();
    const results = await runFlow(ADVISOR_PORTAL_FLOW, page, store, "test", makeConfig());

    expect(results[2]?.status).toBe("pass"); // health step doesn't throw on 404
    const healthFinding = store.all().find((f) => f.title.includes("health returned 404"));
    expect(healthFinding).toBeDefined();
    expect(healthFinding?.severity).toBe("low");
  });

  it("throws when advisor-portal/health returns 500", async () => {
    const goto = vi.fn()
      .mockResolvedValueOnce({ status: () => 200 }) // login-render
      .mockResolvedValueOnce({ status: () => 500 }) // health 500
      .mockResolvedValue({ status: () => 200 });

    const page = makePage({
      goto,
      url: vi.fn().mockReturnValue("http://localhost:3000/advisor-portal"),
      locator: vi.fn().mockReturnValue(locatorWith(1)),
    });
    const store = new FindingStore();
    const results = await runFlow(ADVISOR_PORTAL_FLOW, page, store, "test", makeConfig());
    expect(results[2]?.status).toBe("fail");
  });

  it("records a medium finding when find-advisor page has no interactive elements", async () => {
    // count=0 → hasInteractive=false; innerText="" → hasContent=false
    const page = makePage({
      url: vi.fn().mockReturnValue("http://localhost:3000/advisor-portal"),
      locator: vi.fn().mockReturnValue(locatorWith(0, "")),
    });
    const store = new FindingStore();
    await runFlow(ADVISOR_PORTAL_FLOW, page, store, "test", makeConfig());

    // login-fields step will also fail since count=0 (no email/password fields)
    // find-advisor step (step 5) should either pass or fail — key is the finding exists
    const emptyFinding = store.all().find(
      (f) => f.severity === "medium" && f.category === "dead-end" && f.title.includes("find-advisor"),
    );
    expect(emptyFinding).toBeDefined();
  });

  it("records a medium finding when advisor-portal redirects to unexpected URL", async () => {
    // url returns something other than an advisor-portal path
    const page = makePage({
      url: vi.fn().mockReturnValue("http://localhost:3000/some-other-page"),
      locator: vi.fn().mockReturnValue(locatorWith(1)),
    });
    const store = new FindingStore();
    const results = await runFlow(ADVISOR_PORTAL_FLOW, page, store, "test", makeConfig());

    const redirectFinding = store.all().find(
      (f) => f.severity === "medium" && f.title.includes("redirected unexpectedly"),
    );
    expect(redirectFinding).toBeDefined();
    expect(results[0]?.status).toBe("pass"); // doesn't throw
  });
});
