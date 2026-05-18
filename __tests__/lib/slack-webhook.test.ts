import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

import { postToSlack } from "@/lib/slack-webhook";

const originalFetch = globalThis.fetch;

beforeEach(() => {
  vi.unstubAllEnvs();
  // CI stubs SLACK_WEBHOOK_* to empty; explicit clear here so tests run
  // identically locally and on CI per CLAUDE.md gotcha note.
  vi.stubEnv("SLACK_WEBHOOK_FEE_CHANGES", "");
  vi.stubEnv("SLACK_WEBHOOK_OPS_ALERTS", "");
  vi.stubEnv("SLACK_WEBHOOK_SLO_ALERTS", "");
  vi.stubEnv("SLACK_WEBHOOK_DEFAULT", "");
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("postToSlack", () => {
  it("returns ok:false when no webhook configured", async () => {
    const res = await postToSlack({ channel: "fee-changes", text: "hi" });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("No webhook");
  });

  it("falls back to SLACK_WEBHOOK_DEFAULT when channel-specific var missing", async () => {
    vi.stubEnv("SLACK_WEBHOOK_DEFAULT", "https://hooks.slack.com/services/default");
    const fetchMock = vi.fn<typeof fetch>(async () => new Response("ok", { status: 200 }));
    globalThis.fetch = fetchMock;

    const res = await postToSlack({ channel: "fee-changes", text: "hi" });
    expect(res.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const call = fetchMock.mock.calls[0];
    expect(call?.[0]).toBe("https://hooks.slack.com/services/default");
  });

  it("uses channel-specific var when set", async () => {
    vi.stubEnv("SLACK_WEBHOOK_DEFAULT", "https://hooks.slack.com/services/default");
    vi.stubEnv("SLACK_WEBHOOK_OPS_ALERTS", "https://hooks.slack.com/services/ops");
    const fetchMock = vi.fn<typeof fetch>(async () => new Response("ok", { status: 200 }));
    globalThis.fetch = fetchMock;

    const res = await postToSlack({ channel: "ops-alerts", text: "ops" });
    expect(res.ok).toBe(true);
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://hooks.slack.com/services/ops");
  });

  it("returns ok:false on HTTP failure", async () => {
    vi.stubEnv("SLACK_WEBHOOK_DEFAULT", "https://hooks.slack.com/services/default");
    globalThis.fetch = vi.fn(async () => new Response("boom", { status: 500 })) as unknown as typeof fetch;

    const res = await postToSlack({ channel: "default", text: "hi" });
    expect(res.ok).toBe(false);
    expect(res.error).toContain("HTTP 500");
  });

  it("returns ok:false on thrown fetch (network/abort)", async () => {
    vi.stubEnv("SLACK_WEBHOOK_DEFAULT", "https://hooks.slack.com/services/default");
    globalThis.fetch = vi.fn(async () => {
      throw new Error("timeout");
    }) as unknown as typeof fetch;

    const res = await postToSlack({ channel: "default", text: "hi" });
    expect(res.ok).toBe(false);
    expect(res.error).toBeTruthy();
  });
});
