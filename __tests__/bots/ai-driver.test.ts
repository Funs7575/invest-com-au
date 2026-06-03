import { describe, it, expect } from "vitest";
import { runAiSession } from "../../bots/ai/driver";
import type { LlmClient, PageDriver, PageObservation, LlmDecision } from "../../bots/ai/types";
import { FindingStore } from "../../bots/findings/store";
import { CostLedger } from "../../bots/ai/cost";

class FakeDriver implements PageDriver {
  calls: string[] = [];
  obs: PageObservation;
  failNavigate: boolean;
  constructor(obs?: PageObservation, failNavigate = false) {
    this.obs = obs ?? { url: "/x", title: "X", elements: [{ ref: "e1", role: "button", name: "Go" }] };
    this.failNavigate = failNavigate;
  }
  async observe(): Promise<PageObservation> {
    return this.obs;
  }
  async click(ref: string): Promise<void> {
    this.calls.push("click:" + ref);
  }
  async fill(ref: string, text: string): Promise<void> {
    this.calls.push("fill:" + ref + ":" + text);
  }
  async scroll(direction: "up" | "down"): Promise<void> {
    this.calls.push("scroll:" + direction);
  }
  async navigate(path: string): Promise<void> {
    if (this.failNavigate) throw new Error("nav boom");
    this.calls.push("nav:" + path);
  }
}

function fakeLlm(
  queue: Array<{ rawAction: unknown; usage?: { inputTokens: number; outputTokens: number } }>,
): LlmClient {
  let i = 0;
  return async (): Promise<LlmDecision> => {
    const item = queue[Math.min(i, queue.length - 1)];
    i++;
    if (!item) throw new Error("no llm response queued");
    return {
      rawAction: item.rawAction,
      usage: item.usage ?? { inputTokens: 10, outputTokens: 5 },
      model: "claude-haiku-4-5",
    };
  };
}

const base = {
  persona: "tester",
  goal: "do the thing",
  startPath: "/start",
  maxSteps: 10,
};

describe("runAiSession", () => {
  it("walks click → report_issue → finish and logs the reported issue", async () => {
    const driver = new FakeDriver();
    const store = new FindingStore();
    const llm = fakeLlm([
      { rawAction: { type: "click", ref: "e1" } },
      {
        rawAction: {
          type: "report_issue",
          severity: "high",
          category: "ux",
          title: "Confusing CTA",
          detail: "Two buttons say Continue",
        },
      },
      { rawAction: { type: "finish", outcome: "success" } },
    ]);

    const res = await runAiSession({ ...base, driver, llm, store, ledger: new CostLedger(0) });

    expect(res.stopReason).toBe("finished");
    expect(res.outcome).toBe("success");
    expect(res.issuesReported).toBe(1);
    expect(store.size).toBe(1);
    expect(store.all()[0]?.category).toBe("ux");
    expect(driver.calls).toContain("nav:/start");
    expect(driver.calls).toContain("click:e1");
  });

  it("stops when the spend budget is exhausted", async () => {
    const driver = new FakeDriver();
    const store = new FindingStore();
    // Tiny budget; one big call blows it.
    const ledger = new CostLedger(0.0000001);
    const llm = fakeLlm([
      { rawAction: { type: "scroll", direction: "down" }, usage: { inputTokens: 1_000_000, outputTokens: 1000 } },
    ]);

    const res = await runAiSession({ ...base, driver, llm, store, ledger });
    expect(res.stopReason).toBe("budget");
  });

  it("feeds invalid actions back and recovers", async () => {
    const driver = new FakeDriver();
    const store = new FindingStore();
    const llm = fakeLlm([
      { rawAction: { type: "eval", code: "hack()" } }, // invalid
      { rawAction: { type: "finish", outcome: "success" } },
    ]);
    const res = await runAiSession({ ...base, driver, llm, store, ledger: new CostLedger(0) });
    expect(res.stopReason).toBe("finished");
    expect(store.size).toBe(0); // invalid action logged nothing
  });

  it("stops at the step limit", async () => {
    const driver = new FakeDriver();
    const store = new FindingStore();
    const llm = fakeLlm([{ rawAction: { type: "scroll", direction: "down" } }]); // never finishes
    const res = await runAiSession({ ...base, maxSteps: 3, driver, llm, store, ledger: new CostLedger(0) });
    expect(res.stopReason).toBe("max_steps");
    expect(res.steps).toBe(3);
  });

  it("records a flow-failure when the start page won't open", async () => {
    const driver = new FakeDriver(undefined, true); // navigate throws
    const store = new FindingStore();
    const llm = fakeLlm([{ rawAction: { type: "finish", outcome: "success" } }]);
    const res = await runAiSession({ ...base, driver, llm, store, ledger: new CostLedger(0) });
    expect(res.stopReason).toBe("error");
    expect(store.all()[0]?.category).toBe("flow-failure");
  });
});
