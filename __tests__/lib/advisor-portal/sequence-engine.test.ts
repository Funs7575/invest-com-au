import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks ──────────────────────────────────────────────────────────
const { mockSend, mockFlag, mockAdminFactory } = vi.hoisted(() => ({
  mockSend: vi.fn(),
  mockFlag: vi.fn(),
  mockAdminFactory: vi.fn(),
}));

vi.mock("@/lib/resend", () => ({
  sendEmail: mockSend,
}));
vi.mock("@/lib/feature-flags", () => ({
  isFlagEnabled: mockFlag,
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mockAdminFactory,
}));
// Keep sanitize + url real-ish but deterministic.
vi.mock("@/lib/sanitize-html", () => ({ sanitizeHtml: (s: string) => s }));
vi.mock("@/lib/url", () => ({ getSiteUrl: () => "https://invest.com.au" }));

import {
  sendSequenceStep,
  runDueEnrolments,
  runDueTaskDigest,
  runSequenceEngine,
} from "@/lib/advisor-portal/sequence-engine";

// ── A tiny fake Supabase query builder ─────────────────────────────────────
// Per-table queue of result rows for SELECTs; UPDATE/DELETE/INSERT capture calls.
type Result = { data: unknown; error: { message: string } | null };

function makeFakeClient(selects: Record<string, Result>) {
  const updates: Array<{ table: string; patch: Record<string, unknown>; id?: unknown }> = [];

  function from(table: string) {
    const builder: Record<string, unknown> = {};
    let pendingPatch: Record<string, unknown> | null = null;
    let pendingId: unknown;

    // SELECT chain — resolves to the queued result for this table.
    const selectResult = (): Result => selects[table] ?? { data: [], error: null };

    const chain = {
      select: () => chain,
      is: () => chain,
      not: () => chain,
      lt: () => chain,
      // `.in(...)` is always used as a terminal batch-load in the engine.
      in: () => Promise.resolve(selectResult()),
      eq: (col: string, val: unknown) => {
        if (col === "id") pendingId = val;
        return chain;
      },
      order: () => chain,
      limit: () => Promise.resolve(selectResult()),
      maybeSingle: () => Promise.resolve(selectResult()),
      single: () => Promise.resolve(selectResult()),
      update: (patch: Record<string, unknown>) => {
        pendingPatch = patch;
        return chain;
      },
    };

    // Make update().eq(...) terminal (returns a promise) while select().eq() stays chainable.
    const eqTerminalOrChain = (col: string, val: unknown) => {
      if (col === "id") pendingId = val;
      if (pendingPatch) {
        updates.push({ table, patch: pendingPatch, id: pendingId });
        pendingPatch = null;
        return Promise.resolve({ data: null, error: null });
      }
      return chain;
    };
    chain.eq = eqTerminalOrChain as typeof chain.eq;

    Object.assign(builder, chain);
    return builder;
  }

  return { client: { from } as never, updates };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockSend.mockResolvedValue({ ok: true });
});

// ── sendSequenceStep ───────────────────────────────────────────────────────
describe("sendSequenceStep", () => {
  const step = { sequence_id: 1, day_offset: 0, subject: "Hi {{lead_first_name}}", body: "Hello {{lead_first_name}}\nfrom {{adviser_name}}", position: 0 };
  const adviser = { id: 7, name: "Dana", email: "dana@firm.com", firm_name: "Firm Co" };
  const lead = { id: 22, professional_id: 7, user_name: "Sam Smith", user_email: "sam@x.com", status: "new" };

  it("renders merge fields, sets the adviser reply-to, and reports 'sent'", async () => {
    const send = vi.fn().mockResolvedValue({ ok: true });
    const res = await sendSequenceStep({ step, adviser, lead, send });
    expect(res.outcome).toBe("sent");
    const arg = send.mock.calls[0]![0];
    expect(arg.to).toBe("sam@x.com");
    expect(arg.subject).toBe("Hi Sam");
    expect(arg.replyTo).toBe("dana@firm.com");
    expect(arg.html).toContain("Hello Sam");
    expect(arg.html).toContain("from Dana");
    // unsubscribe footer present
    expect(arg.html).toContain("/api/unsubscribe?email=");
  });

  it("maps a suppressed send to outcome 'suppressed'", async () => {
    const send = vi.fn().mockResolvedValue({ ok: false, error: "suppressed" });
    expect((await sendSequenceStep({ step, adviser, lead, send })).outcome).toBe("suppressed");
  });

  it("maps any other failure to outcome 'failed'", async () => {
    const send = vi.fn().mockResolvedValue({ ok: false, error: "HTTP 500" });
    expect((await sendSequenceStep({ step, adviser, lead, send })).outcome).toBe("failed");
  });
});

// ── runDueEnrolments: due selection / caps / idempotency / suppression ──────
describe("runDueEnrolments", () => {
  const NOW = new Date("2026-06-12T23:00:00Z");
  const adviser = { id: 7, name: "Dana", email: "dana@firm.com", firm_name: "Firm" };
  const lead = { id: 22, professional_id: 7, user_name: "Sam", user_email: "sam@x.com", status: "new" };
  const step0 = { sequence_id: 1, day_offset: 0, subject: "s0", body: "b0", position: 0 };

  function baseSelects(enrolment: Record<string, unknown>) {
    return {
      lead_sequence_enrolments: { data: [enrolment], error: null },
      lead_sequence_steps: { data: [step0], error: null },
      professionals: { data: [adviser], error: null },
      professional_leads: { data: [lead], error: null },
    } satisfies Record<string, Result>;
  }

  it("sends a due step and advances current_step + last_sent_at", async () => {
    const enr = { id: 99, sequence_id: 1, professional_id: 7, lead_ref: 22, current_step: 0, last_sent_at: null, enrolled_at: "2026-06-12T00:00:00Z" };
    const { client, updates } = makeFakeClient(baseSelects(enr));
    const res = await runDueEnrolments(client, NOW);
    expect(res.sent).toBe(1);
    expect(mockSend).toHaveBeenCalledTimes(1);
    // The completed write also runs because it was the only (final) step.
    const advance = updates.find((u) => u.patch.current_step === 1);
    expect(advance).toBeTruthy();
    expect(advance!.patch.last_sent_at).toBe(NOW.toISOString());
    expect(advance!.patch.completed_at).toBe(NOW.toISOString());
  });

  it("does NOT send when the step's day_offset is not yet due", async () => {
    // day_offset 5 but only enrolled today → not due.
    const future = { ...baseSelects({}) };
    future.lead_sequence_steps = { data: [{ ...step0, day_offset: 5 }], error: null };
    const enr = { id: 1, sequence_id: 1, professional_id: 7, lead_ref: 22, current_step: 0, last_sent_at: null, enrolled_at: "2026-06-12T00:00:00Z" };
    future.lead_sequence_enrolments = { data: [enr], error: null };
    const { client } = makeFakeClient(future);
    const res = await runDueEnrolments(client, NOW);
    expect(res.sent).toBe(0);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("respects the ≤1-send-per-lead-per-day cap (skips when last_sent_at < 24h ago)", async () => {
    const enr = { id: 1, sequence_id: 1, professional_id: 7, lead_ref: 22, current_step: 0, last_sent_at: "2026-06-12T13:00:00Z", enrolled_at: "2026-06-10T00:00:00Z" };
    const { client } = makeFakeClient(baseSelects(enr));
    const res = await runDueEnrolments(client, NOW);
    expect(res.skippedCapped).toBe(1);
    expect(res.sent).toBe(0);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("on suppression: advances the step (no retry) but counts skippedSuppressed", async () => {
    mockSend.mockResolvedValue({ ok: false, error: "suppressed" });
    const enr = { id: 1, sequence_id: 1, professional_id: 7, lead_ref: 22, current_step: 0, last_sent_at: null, enrolled_at: "2026-06-11T00:00:00Z" };
    const { client, updates } = makeFakeClient(baseSelects(enr));
    const res = await runDueEnrolments(client, NOW);
    expect(res.skippedSuppressed).toBe(1);
    expect(res.sent).toBe(0);
    expect(updates.some((u) => u.patch.current_step === 1)).toBe(true);
  });

  it("on transient send failure: does NOT advance (retried next run)", async () => {
    mockSend.mockResolvedValue({ ok: false, error: "HTTP 500" });
    const enr = { id: 1, sequence_id: 1, professional_id: 7, lead_ref: 22, current_step: 0, last_sent_at: null, enrolled_at: "2026-06-11T00:00:00Z" };
    const { client, updates } = makeFakeClient(baseSelects(enr));
    const res = await runDueEnrolments(client, NOW);
    expect(res.failures).toBe(1);
    expect(res.sent).toBe(0);
    expect(updates.some((u) => u.patch.current_step === 1)).toBe(false);
  });

  it("completes an enrolment whose current_step ran off the end", async () => {
    const enr = { id: 1, sequence_id: 1, professional_id: 7, lead_ref: 22, current_step: 1, last_sent_at: null, enrolled_at: "2026-06-01T00:00:00Z" };
    // Only one step (index 0); current_step 1 is past the end.
    const { client, updates } = makeFakeClient(baseSelects(enr));
    const res = await runDueEnrolments(client, NOW);
    expect(res.completed).toBe(1);
    expect(mockSend).not.toHaveBeenCalled();
    expect(updates.some((u) => u.patch.completed_at)).toBe(true);
  });

  it("stops an enrolment whose lead/adviser can't be resolved (no recipient)", async () => {
    const enr = { id: 1, sequence_id: 1, professional_id: 7, lead_ref: 22, current_step: 0, last_sent_at: null, enrolled_at: "2026-06-11T00:00:00Z" };
    const sel = baseSelects(enr);
    sel.professional_leads = { data: [], error: null }; // lead purged
    const { client, updates } = makeFakeClient(sel);
    const res = await runDueEnrolments(client, NOW);
    expect(res.skippedNoRecipient).toBe(1);
    expect(updates.some((u) => u.patch.stopped_at)).toBe(true);
  });

  it("returns all-zero when there are no active enrolments", async () => {
    const { client } = makeFakeClient({ lead_sequence_enrolments: { data: [], error: null } });
    const res = await runDueEnrolments(client, NOW);
    expect(res).toMatchObject({ enrolmentsConsidered: 0, sent: 0 });
    expect(mockSend).not.toHaveBeenCalled();
  });
});

// ── runDueTaskDigest: preference gating ────────────────────────────────────
describe("runDueTaskDigest", () => {
  const NOW = new Date("2026-06-12T23:00:00Z");
  const task = { id: 1, professional_id: 7, lead_ref: 22, title: "Call Sam", due_at: "2026-06-12T09:00:00Z" };

  it("sends one digest per adviser who has not opted out", async () => {
    const { client } = makeFakeClient({
      lead_tasks: { data: [task], error: null },
      professionals: { data: [{ id: 7, name: "Dana", email: "dana@firm.com", digest_opt_out: false }], error: null },
    });
    const res = await runDueTaskDigest(client, NOW);
    expect(res.digestsSent).toBe(1);
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("skips advisers with digest_opt_out = true", async () => {
    const { client } = makeFakeClient({
      lead_tasks: { data: [task], error: null },
      professionals: { data: [{ id: 7, name: "Dana", email: "dana@firm.com", digest_opt_out: true }], error: null },
    });
    const res = await runDueTaskDigest(client, NOW);
    expect(res.optedOut).toBe(1);
    expect(res.digestsSent).toBe(0);
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("does nothing when no tasks are due", async () => {
    const { client } = makeFakeClient({ lead_tasks: { data: [], error: null } });
    const res = await runDueTaskDigest(client, NOW);
    expect(res.digestsSent).toBe(0);
  });

  it("escapes adviser-authored task titles in the digest HTML", async () => {
    const { client } = makeFakeClient({
      lead_tasks: { data: [{ ...task, title: "<script>x</script>" }], error: null },
      professionals: { data: [{ id: 7, name: "Dana", email: "dana@firm.com", digest_opt_out: false }], error: null },
    });
    await runDueTaskDigest(client, NOW);
    const html = mockSend.mock.calls[0]![0].html as string;
    expect(html).not.toContain("<script>x");
    expect(html).toContain("&lt;script&gt;");
  });
});

// ── runSequenceEngine: flag-off no-op ──────────────────────────────────────
describe("runSequenceEngine — flag gating", () => {
  it("no-ops without touching the DB when the flag is off", async () => {
    mockFlag.mockResolvedValue(false);
    const res = await runSequenceEngine({ now: new Date("2026-06-12T23:00:00Z") });
    expect(res.flagEnabled).toBe(false);
    expect(res.engine).toBeNull();
    expect(res.digest).toBeNull();
    expect(mockAdminFactory).not.toHaveBeenCalled();
    expect(mockSend).not.toHaveBeenCalled();
  });

  it("runs the engine (and digest only at the digest hour) when the flag is on", async () => {
    mockFlag.mockResolvedValue(true);
    const { client } = makeFakeClient({ lead_sequence_enrolments: { data: [], error: null }, lead_tasks: { data: [], error: null } });
    mockAdminFactory.mockReturnValue(client);
    // digestHourUtc defaults to 23; NOW is 23:00 UTC → digest runs.
    const res = await runSequenceEngine({ now: new Date("2026-06-12T23:30:00Z") });
    expect(res.flagEnabled).toBe(true);
    expect(res.engine).not.toBeNull();
    expect(res.digest).not.toBeNull();
  });

  it("skips the digest outside the digest hour", async () => {
    mockFlag.mockResolvedValue(true);
    const { client } = makeFakeClient({ lead_sequence_enrolments: { data: [], error: null } });
    mockAdminFactory.mockReturnValue(client);
    const res = await runSequenceEngine({ now: new Date("2026-06-12T10:00:00Z"), digestHourUtc: 23 });
    expect(res.digest).toBeNull();
  });
});
