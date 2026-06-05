import { describe, it, expect, vi } from "vitest";
import { runFlow } from "../../bots/flows/runner";
import { USER_LIFECYCLE_FLOW } from "../../bots/flows/user-lifecycle";
import { FindingStore } from "../../bots/findings/store";
import type { Flow, FlowStep, FlowStepContext } from "../../bots/flows/types";
import type { BotConfig } from "../../bots/config";

// ── Minimal stubs ────────────────────────────────────────────────────────────

function makePage(overrides: Partial<Record<string, unknown>> = {}): FlowStepContext["page"] {
  return {
    goto: vi.fn().mockResolvedValue({ status: () => 200 }),
    url: vi.fn().mockReturnValue("http://localhost:3000/"),
    waitForSelector: vi.fn().mockResolvedValue(null),
    waitForLoadState: vi.fn().mockResolvedValue(null),
    waitForFunction: vi.fn().mockResolvedValue(null),
    waitForTimeout: vi.fn().mockResolvedValue(null),
    locator: vi.fn().mockReturnValue({
      count: vi.fn().mockResolvedValue(0),
      first: vi.fn().mockReturnThis(),
      filter: vi.fn().mockReturnThis(),
      innerText: vi.fn().mockResolvedValue("Hello world this is content for the dashboard"),
      fill: vi.fn().mockResolvedValue(null),
      click: vi.fn().mockResolvedValue(null),
      scrollIntoViewIfNeeded: vi.fn().mockResolvedValue(null),
    }),
    getByRole: vi.fn().mockReturnValue({
      count: vi.fn().mockResolvedValue(0),
      click: vi.fn().mockResolvedValue(null),
    }),
    ...overrides,
  } as unknown as FlowStepContext["page"];
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

// ── Runner tests ─────────────────────────────────────────────────────────────

describe("runFlow", () => {
  it("returns pass for steps that resolve", async () => {
    const flow: Flow = {
      name: "test",
      description: "test flow",
      steps: [
        { name: "step-a", run: vi.fn().mockResolvedValue(undefined) },
        { name: "step-b", run: vi.fn().mockResolvedValue(undefined) },
      ],
    };
    const store = new FindingStore();
    const page = makePage();
    const results = await runFlow(flow, page, store, "test-persona", makeConfig());

    expect(results).toHaveLength(2);
    expect(results[0]?.status).toBe("pass");
    expect(results[1]?.status).toBe("pass");
  });

  it("records a flow-failure finding and marks the step failed when a step throws", async () => {
    const flow: Flow = {
      name: "test",
      description: "test flow",
      steps: [
        {
          name: "bad-step",
          run: vi.fn().mockRejectedValue(new Error("something broke")),
        },
        { name: "good-step", run: vi.fn().mockResolvedValue(undefined) },
      ],
    };
    const store = new FindingStore();
    const page = makePage();
    const results = await runFlow(flow, page, store, "test-persona", makeConfig());

    expect(results[0]?.status).toBe("fail");
    expect(results[0]?.detail).toContain("something broke");
    // Execution continued — the second step still ran.
    expect(results[1]?.status).toBe("pass");

    const findings = store.all();
    expect(findings.some((f) => f.category === "flow-failure")).toBe(true);
    expect(findings.some((f) => f.title.includes("bad-step"))).toBe(true);
  });

  it("continues past multiple failing steps", async () => {
    const flow: Flow = {
      name: "test",
      description: "multi-fail",
      steps: [
        { name: "s1", run: vi.fn().mockRejectedValue(new Error("fail 1")) },
        { name: "s2", run: vi.fn().mockRejectedValue(new Error("fail 2")) },
        { name: "s3", run: vi.fn().mockResolvedValue(undefined) },
      ],
    };
    const store = new FindingStore();
    const results = await runFlow(flow, makePage(), store, "p", makeConfig());

    expect(results.map((r) => r.status)).toEqual(["fail", "fail", "pass"]);
  });

  it("deduplicates repeated flow-failure findings by signatureKey", async () => {
    const step: FlowStep = {
      name: "same-step",
      run: vi.fn().mockRejectedValue(new Error("oops")),
    };
    const flow: Flow = { name: "dup-test", description: "", steps: [step, step] };
    const store = new FindingStore();
    await runFlow(flow, makePage(), store, "p", makeConfig());

    const regressions = store.all().filter((f) => f.category === "flow-failure");
    // Same step → same signatureKey → deduplicated to one finding.
    expect(regressions).toHaveLength(1);
    expect(regressions[0]?.occurrences).toBe(2);
  });
});

// ── USER_LIFECYCLE_FLOW shape ────────────────────────────────────────────────

describe("USER_LIFECYCLE_FLOW", () => {
  it("has the expected step names in order", () => {
    expect(USER_LIFECYCLE_FLOW.steps.map((s) => s.name)).toEqual([
      "quiz-initial-render",
      "quiz-flow",
      "account-dashboard",
      "account-holdings",
      "account-bookmarks",
      "advisor-enquiry",
      "account-notifications",
    ]);
  });

  it("exports a non-empty name and description", () => {
    expect(USER_LIFECYCLE_FLOW.name).toBeTruthy();
    expect(USER_LIFECYCLE_FLOW.description).toBeTruthy();
  });

  it("quiz-flow step records an info finding and returns on protected target", async () => {
    const quizFlowStep = USER_LIFECYCLE_FLOW.steps.find((s) => s.name === "quiz-flow");
    expect(quizFlowStep).toBeDefined();

    const store = new FindingStore();
    const page = makePage();

    // Should NOT throw on protected — it notes the skip and returns.
    await expect(
      quizFlowStep!.run({ page, store, persona: "test", config: makeConfig({ targetClass: "protected" }) }),
    ).resolves.toBeUndefined();

    const findings = store.all();
    const skipFinding = findings.find(
      (f) => f.category === "flow-failure" && f.severity === "info" && f.title.includes("skipped on protected"),
    );
    expect(skipFinding).toBeDefined();
  });

  it("account-notifications step throws and records a finding when page redirects to login", async () => {
    const step = USER_LIFECYCLE_FLOW.steps.find((s) => s.name === "account-notifications");
    expect(step).toBeDefined();

    const store = new FindingStore();
    const addSpy = vi.spyOn(store, "add");

    // Simulate post-navigation auth redirect: goto returns 200 but url() is the login page.
    const page = makePage({
      url: vi.fn().mockReturnValue("http://localhost:3000/auth/login?next=/account/notifications"),
    });

    await expect(
      step!.run({ page, store, persona: "test", config: makeConfig() }),
    ).rejects.toThrow("redirected to login");

    expect(addSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        category: "flow-failure",
        title: expect.stringContaining("auth state lost"),
      }),
    );
  });
});
