import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ─── Mocks ────────────────────────────────────────────────────────

const sendEmailMock = vi.fn();
vi.mock("@/lib/resend", () => ({
  sendEmail: (...args: unknown[]) => sendEmailMock(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

// Stateful Supabase mock for slo_incidents table
let existingOpen: { id: number }[] = [];
let insertError: { message: string } | null = null;
const insertCalls: unknown[] = [];
const updateData: unknown[] = [];

const mockFrom = vi.fn((_table: string) => {
  const selectChain = {
    select: () => selectChain,
    eq: () => selectChain,
    limit: () => Promise.resolve({ data: existingOpen }),
  };
  const updateChain = {
    eq: () => updateChain,
  };
  return {
    select: () => selectChain,
    insert: (row: unknown) => {
      insertCalls.push(row);
      return Promise.resolve({ error: insertError });
    },
    update: (data: unknown) => {
      updateData.push(data);
      return updateChain;
    },
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import {
  evaluateSlo,
  openIncident,
  resolveIncident,
  type SloDefinition,
  type SloEvaluation,
  type SloMeasurement,
} from "@/lib/slo";

// ─── Helpers ──────────────────────────────────────────────────────

function makeDef(overrides: Partial<SloDefinition> = {}): SloDefinition {
  return {
    name: "lead_delivery_p95_ms",
    service: "lead-queue",
    metric: "queue_age_minutes",
    target: 0.99,
    comparator: ">=",
    window_minutes: 60,
    ...overrides,
  };
}

const meas: SloMeasurement = { value: 0.94, context: { total: 10, ok: 9 } };

const warnEval: SloEvaluation = {
  breached: true,
  severity: "warn",
  reason: "measured 0.94 >= 0.99 failed (gap 5%)",
};

const pageEval: SloEvaluation = {
  breached: true,
  severity: "page",
  reason: "measured 0.4 >= 0.99 failed (gap 59%)",
};

const okEval: SloEvaluation = {
  breached: false,
  severity: "warn",
  reason: "within_target",
};

// Saved env vars
const ENV_KEYS = [
  "SLACK_ALERT_WEBHOOK_URL",
  "OPS_ALERT_EMAIL",
  "SUPPORT_EMAIL",
  "PAGERDUTY_ROUTING_KEY",
];
const savedEnv: Record<string, string | undefined> = {};

// ─── evaluateSlo (pure — no mocks needed) ─────────────────────────

describe("evaluateSlo — success_rate >= 0.99", () => {
  it("within target → no breach", () => {
    const r = evaluateSlo(makeDef(), { value: 0.995 });
    expect(r.breached).toBe(false);
    expect(r.reason).toBe("within_target");
  });

  it("slightly below target → warn", () => {
    const r = evaluateSlo(makeDef(), { value: 0.96 });
    expect(r.breached).toBe(true);
    expect(r.severity).toBe("warn");
  });

  it("way below target → page", () => {
    const r = evaluateSlo(makeDef(), { value: 0.4 });
    expect(r.breached).toBe(true);
    expect(r.severity).toBe("page");
  });
});

describe("evaluateSlo — other comparators", () => {
  it("< target for queue age", () => {
    const r = evaluateSlo(
      makeDef({ metric: "queue_age", target: 15, comparator: "<" }),
      { value: 20 },
    );
    expect(r.breached).toBe(true);
  });

  it("<= passes when equal", () => {
    const r = evaluateSlo(
      makeDef({ metric: "latency", target: 1000, comparator: "<=" }),
      { value: 1000 },
    );
    expect(r.breached).toBe(false);
  });

  it("> passes when strictly greater", () => {
    const r = evaluateSlo(
      makeDef({ metric: "ok_count", target: 5, comparator: ">" }),
      { value: 6 },
    );
    expect(r.breached).toBe(false);
  });

  it("> fails when equal", () => {
    const r = evaluateSlo(
      makeDef({ metric: "ok_count", target: 5, comparator: ">" }),
      { value: 5 },
    );
    expect(r.breached).toBe(true);
  });
});

describe("evaluateSlo — severity tier", () => {
  it("page when gap >= 50%", () => {
    const r = evaluateSlo(
      makeDef({ target: 100, comparator: ">=" }),
      { value: 40 },
    );
    expect(r.severity).toBe("page");
  });

  it("warn when gap < 50%", () => {
    const r = evaluateSlo(
      makeDef({ target: 100, comparator: ">=" }),
      { value: 70 },
    );
    expect(r.severity).toBe("warn");
  });
});

// ─── openIncident ─────────────────────────────────────────────────

describe("openIncident", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    existingOpen = [];
    insertError = null;
    insertCalls.length = 0;
    updateData.length = 0;
    fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    sendEmailMock.mockResolvedValue({ ok: true });
    // Save and clear env
    for (const k of ENV_KEYS) {
      savedEnv[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    for (const k of ENV_KEYS) {
      if (savedEnv[k] === undefined) delete process.env[k];
      else process.env[k] = savedEnv[k];
    }
  });

  it("returns early when evaluation is not breached — no DB calls", async () => {
    await openIncident(makeDef(), meas, okEval);
    expect(mockFrom).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("dedup: skips insert when open incident already exists", async () => {
    existingOpen = [{ id: 42 }];
    await openIncident(makeDef(), meas, warnEval);
    expect(insertCalls).toHaveLength(0);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("returns early on DB insert error — no notifications fired", async () => {
    insertError = { message: "connection refused" };
    process.env.SLACK_ALERT_WEBHOOK_URL = "https://hooks.slack.com/test";
    process.env.OPS_ALERT_EMAIL = "ops@invest.com.au";
    await openIncident(makeDef(), meas, warnEval);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("warn breach: Slack + email called; PagerDuty NOT called", async () => {
    process.env.SLACK_ALERT_WEBHOOK_URL = "https://hooks.slack.com/warn-test";
    process.env.OPS_ALERT_EMAIL = "ops@invest.com.au";
    process.env.PAGERDUTY_ROUTING_KEY = "pk_key";
    await openIncident(makeDef(), meas, warnEval);
    // fetch called exactly once for Slack (PD is severity=page only)
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("https://hooks.slack.com/warn-test");
    // email called once
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it("page breach: Slack + email + PagerDuty all called", async () => {
    process.env.SLACK_ALERT_WEBHOOK_URL = "https://hooks.slack.com/page-test";
    process.env.OPS_ALERT_EMAIL = "ops@invest.com.au";
    process.env.PAGERDUTY_ROUTING_KEY = "pk_key";
    await openIncident(makeDef(), meas, pageEval);
    expect(fetchMock).toHaveBeenCalledTimes(2); // Slack + PagerDuty
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    const pdCall = fetchMock.mock.calls.find((c) =>
      (c[0] as string).includes("pagerduty"),
    );
    expect(pdCall).toBeDefined();
  });

  it("no SLACK_ALERT_WEBHOOK_URL → fetch not called; email still fires", async () => {
    process.env.OPS_ALERT_EMAIL = "ops@invest.com.au";
    await openIncident(makeDef(), meas, warnEval);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
  });

  it("no OPS_ALERT_EMAIL / SUPPORT_EMAIL → sendEmail not called; Slack still fires", async () => {
    process.env.SLACK_ALERT_WEBHOOK_URL = "https://hooks.slack.com/test";
    await openIncident(makeDef(), meas, warnEval);
    expect(sendEmailMock).not.toHaveBeenCalled();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to SUPPORT_EMAIL when OPS_ALERT_EMAIL is absent", async () => {
    process.env.SUPPORT_EMAIL = "support@invest.com.au";
    await openIncident(makeDef(), meas, warnEval);
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock.mock.calls[0][0].to).toBe("support@invest.com.au");
  });

  it("page breach + no PAGERDUTY_ROUTING_KEY → only Slack + email", async () => {
    process.env.SLACK_ALERT_WEBHOOK_URL = "https://hooks.slack.com/test";
    process.env.OPS_ALERT_EMAIL = "ops@invest.com.au";
    await openIncident(makeDef(), meas, pageEval);
    expect(fetchMock).toHaveBeenCalledTimes(1); // Slack only
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).not.toContain("pagerduty");
  });

  it("Slack fetch throws → error swallowed, openIncident resolves cleanly", async () => {
    process.env.SLACK_ALERT_WEBHOOK_URL = "https://hooks.slack.com/test";
    fetchMock.mockRejectedValueOnce(new Error("network failure"));
    await expect(openIncident(makeDef(), meas, warnEval)).resolves.toBeUndefined();
  });

  it("email subject contains SLO name and severity label", async () => {
    process.env.OPS_ALERT_EMAIL = "ops@invest.com.au";
    await openIncident(makeDef(), meas, pageEval);
    const { subject, html, to } = sendEmailMock.mock.calls[0][0] as {
      subject: string;
      html: string;
      to: string;
    };
    expect(to).toBe("ops@invest.com.au");
    expect(subject).toContain("lead_delivery_p95_ms");
    expect(subject.toLowerCase()).toContain("page");
    expect(html).toContain("lead-queue"); // service name
    expect(html).toContain(String(meas.value)); // measured value
  });

  it("DB insert receives correct fields", async () => {
    await openIncident(makeDef(), meas, warnEval);
    expect(insertCalls).toHaveLength(1);
    const row = insertCalls[0] as Record<string, unknown>;
    expect(row.slo_name).toBe("lead_delivery_p95_ms");
    expect(row.service).toBe("lead-queue");
    expect(row.severity).toBe("warn");
    expect(row.measured_value).toBe(0.94);
    expect(row.target_value).toBe(0.99);
  });
});

// ─── resolveIncident ──────────────────────────────────────────────

describe("resolveIncident", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    updateData.length = 0;
    fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);
    for (const k of ENV_KEYS) {
      savedEnv[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    for (const k of ENV_KEYS) {
      if (savedEnv[k] === undefined) delete process.env[k];
      else process.env[k] = savedEnv[k];
    }
  });

  it("calls DB update with status=resolved and resolved_at timestamp", async () => {
    await resolveIncident("lead_delivery_p95_ms");
    expect(updateData).toHaveLength(1);
    const data = updateData[0] as Record<string, unknown>;
    expect(data.status).toBe("resolved");
    expect(typeof data.resolved_at).toBe("string");
    // resolved_at should be a recent ISO timestamp
    const ts = new Date(data.resolved_at as string).getTime();
    expect(Date.now() - ts).toBeLessThan(5_000);
  });

  it("no PAGERDUTY_ROUTING_KEY → no PagerDuty resolve fetch", async () => {
    await resolveIncident("lead_delivery_p95_ms");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("PAGERDUTY_ROUTING_KEY set → sends resolve event with correct dedup_key", async () => {
    process.env.PAGERDUTY_ROUTING_KEY = "pk_test_key";
    await resolveIncident("lead_delivery_p95_ms");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, opts] = fetchMock.mock.calls[0] as [
      string,
      { body: string },
    ];
    expect(url).toContain("pagerduty.com");
    const body = JSON.parse(opts.body) as Record<string, unknown>;
    expect(body.event_action).toBe("resolve");
    expect(body.dedup_key).toBe("slo:lead_delivery_p95_ms");
    expect(body.routing_key).toBe("pk_test_key");
  });

  it("PD resolve fetch throws → swallowed, resolveIncident still resolves", async () => {
    process.env.PAGERDUTY_ROUTING_KEY = "pk_test_key";
    fetchMock.mockRejectedValueOnce(new Error("PD down"));
    await expect(resolveIncident("lead_delivery_p95_ms")).resolves.toBeUndefined();
  });
});
