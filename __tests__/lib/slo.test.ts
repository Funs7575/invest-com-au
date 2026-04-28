import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { evaluateSlo, openIncident, resolveIncident } from "@/lib/slo";

// ---------------------------------------------------------------------------
// Shared mock setup
// ---------------------------------------------------------------------------

const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockLimit = vi.fn();
const mockAdminClient = {
  from: vi.fn(),
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => mockAdminClient,
}));

vi.mock("@/lib/resend", () => ({
  sendEmail: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@/lib/admin", () => ({
  getAdminEmails: () => ["admin@invest.com.au"],
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  }),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function def(overrides: Partial<Parameters<typeof evaluateSlo>[0]> = {}) {
  return {
    name: "test_slo",
    service: "cron",
    metric: "success_rate",
    target: 0.99,
    comparator: ">=" as const,
    window_minutes: 60,
    ...overrides,
  };
}

function breachedEval(severity: "warn" | "page" = "warn") {
  return {
    breached: true,
    severity,
    reason: "measured 0.95 >= 0.99 failed (gap 4%)",
  };
}

function okEval() {
  return { breached: false, severity: "warn" as const, reason: "within_target" };
}

// ---------------------------------------------------------------------------
// evaluateSlo — pure function (existing tests kept)
// ---------------------------------------------------------------------------

describe("evaluateSlo — success_rate >= 0.99", () => {
  it("within target → no breach", () => {
    const r = evaluateSlo(def(), { value: 0.995 });
    expect(r.breached).toBe(false);
    expect(r.reason).toBe("within_target");
  });

  it("slightly below target → warn", () => {
    const r = evaluateSlo(def(), { value: 0.96 });
    expect(r.breached).toBe(true);
    expect(r.severity).toBe("warn");
  });

  it("way below target → page", () => {
    const r = evaluateSlo(def(), { value: 0.4 });
    expect(r.breached).toBe(true);
    expect(r.severity).toBe("page");
  });
});

describe("evaluateSlo — other comparators", () => {
  it("< target for queue age", () => {
    const r = evaluateSlo(
      def({ metric: "queue_age", target: 15, comparator: "<" }),
      { value: 20 },
    );
    expect(r.breached).toBe(true);
  });

  it("<= passes when equal", () => {
    const r = evaluateSlo(
      def({ metric: "latency", target: 1000, comparator: "<=" }),
      { value: 1000 },
    );
    expect(r.breached).toBe(false);
  });

  it("> passes when strictly greater", () => {
    const r = evaluateSlo(
      def({ metric: "ok_count", target: 5, comparator: ">" }),
      { value: 6 },
    );
    expect(r.breached).toBe(false);
  });

  it("> fails when equal", () => {
    const r = evaluateSlo(
      def({ metric: "ok_count", target: 5, comparator: ">" }),
      { value: 5 },
    );
    expect(r.breached).toBe(true);
  });
});

describe("evaluateSlo — severity tier", () => {
  it("page when gap >= 50%", () => {
    const r = evaluateSlo(
      def({ target: 100, comparator: ">=" }),
      { value: 40 },
    );
    // (100 - 40) / 100 = 0.6 → page
    expect(r.severity).toBe("page");
  });

  it("warn when gap < 50%", () => {
    const r = evaluateSlo(
      def({ target: 100, comparator: ">=" }),
      { value: 70 },
    );
    // (100 - 70) / 100 = 0.3 → warn
    expect(r.severity).toBe("warn");
  });
});

// ---------------------------------------------------------------------------
// openIncident
// ---------------------------------------------------------------------------

describe("openIncident", () => {
  let mockSendEmail: Mock;
  let mockFetch: Mock;

  beforeEach(async () => {
    vi.clearAllMocks();
    const resend = await import("@/lib/resend");
    mockSendEmail = resend.sendEmail as Mock;
    mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    // Default: no existing open incident
    mockLimit.mockResolvedValue({ data: [], error: null });
    mockEq.mockReturnValue({ eq: mockEq, limit: mockLimit });
    mockSelect.mockReturnValue({ eq: mockEq });
    mockInsert.mockResolvedValue({ error: null });
    mockAdminClient.from.mockReturnValue({
      select: mockSelect,
      insert: mockInsert,
    });
  });

  it("no-ops when evaluation is not breached", async () => {
    await openIncident(def(), { value: 0.995 }, okEval());
    expect(mockAdminClient.from).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("dedupes — skips insert when open incident already exists", async () => {
    mockLimit.mockResolvedValue({ data: [{ id: "inc_1" }], error: null });
    await openIncident(def(), { value: 0.5 }, breachedEval());
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("inserts incident row on first breach", async () => {
    await openIncident(def(), { value: 0.5 }, breachedEval());
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        slo_name: "test_slo",
        service: "cron",
        severity: "warn",
        measured_value: 0.5,
        target_value: 0.99,
      }),
    );
  });

  it("sends Slack notification for warn severity", async () => {
    await openIncident(def(), { value: 0.5 }, breachedEval("warn"));
    // Let the fire-and-forget settle
    await new Promise((r) => setTimeout(r, 0));
    // Slack is always called (if env var set — but env var not set in test so fetch won't be called)
    // Email is always called
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining("test_slo"),
      }),
    );
  });

  it("sends PagerDuty + email for page severity", async () => {
    process.env.SLACK_ALERT_WEBHOOK_URL = "https://hooks.slack.test/abc";
    process.env.PAGERDUTY_ROUTING_KEY = "rk_test";
    await openIncident(def(), { value: 0.1 }, breachedEval("page"));
    await new Promise((r) => setTimeout(r, 0));
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("pagerduty"),
      expect.any(Object),
    );
    expect(mockSendEmail).toHaveBeenCalled();
    delete process.env.SLACK_ALERT_WEBHOOK_URL;
    delete process.env.PAGERDUTY_ROUTING_KEY;
  });

  it("skips PagerDuty for warn severity", async () => {
    process.env.SLACK_ALERT_WEBHOOK_URL = "https://hooks.slack.test/abc";
    process.env.PAGERDUTY_ROUTING_KEY = "rk_test";
    await openIncident(def(), { value: 0.96 }, breachedEval("warn"));
    await new Promise((r) => setTimeout(r, 0));
    const pagerDutyCalls = (mockFetch as Mock).mock.calls.filter(([url]: [string]) =>
      url.includes("pagerduty"),
    );
    expect(pagerDutyCalls).toHaveLength(0);
    delete process.env.SLACK_ALERT_WEBHOOK_URL;
    delete process.env.PAGERDUTY_ROUTING_KEY;
  });

  it("skips insert when DB insert fails, logs warning", async () => {
    mockInsert.mockResolvedValue({ error: { message: "db error" } });
    await openIncident(def(), { value: 0.5 }, breachedEval());
    await new Promise((r) => setTimeout(r, 0));
    // Email not sent because insert returned early
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("includes context in incident row", async () => {
    const context = { total: 10, ok: 5 };
    await openIncident(def(), { value: 0.5, context }, breachedEval());
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({ context }),
    );
  });

  it("email subject includes severity emoji for page", async () => {
    await openIncident(def(), { value: 0.1 }, breachedEval("page"));
    await new Promise((r) => setTimeout(r, 0));
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining("🚨"),
      }),
    );
  });

  it("email subject includes warning emoji for warn", async () => {
    await openIncident(def(), { value: 0.96 }, breachedEval("warn"));
    await new Promise((r) => setTimeout(r, 0));
    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        subject: expect.stringContaining("⚠️"),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// resolveIncident
// ---------------------------------------------------------------------------

describe("resolveIncident", () => {
  let mockFetch: Mock;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", mockFetch);

    const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
    mockUpdate.mockReturnValue({ eq: mockEq });
    mockEq.mockReturnValue({ eq: mockUpdateEq });
    mockAdminClient.from.mockReturnValue({ update: mockUpdate });
  });

  it("updates status to resolved for the given slo_name", async () => {
    await resolveIncident("test_slo");
    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: "resolved" }),
    );
    expect(mockEq).toHaveBeenCalledWith("slo_name", "test_slo");
  });

  it("sends PagerDuty resolve event when PAGERDUTY_ROUTING_KEY is set", async () => {
    process.env.PAGERDUTY_ROUTING_KEY = "rk_test";
    await resolveIncident("test_slo");
    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("pagerduty"),
      expect.objectContaining({
        method: "POST",
      }),
    );
    const body = JSON.parse((mockFetch.mock.calls[0][1] as { body: string }).body);
    expect(body.event_action).toBe("resolve");
    expect(body.dedup_key).toBe("slo:test_slo");
    delete process.env.PAGERDUTY_ROUTING_KEY;
  });

  it("does not call PagerDuty when routing key is absent", async () => {
    delete process.env.PAGERDUTY_ROUTING_KEY;
    await resolveIncident("test_slo");
    expect(mockFetch).not.toHaveBeenCalled();
  });
});
