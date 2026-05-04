import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import type { NextRequest } from "next/server";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: vi.fn(() => null),
}));

vi.mock("@/lib/admin", () => ({
  ADMIN_EMAIL: "admin@invest.com.au",
}));

type SendEmailResult = { ok: boolean; error?: string };
const mockSendEmail = vi.fn<(...args: unknown[]) => Promise<SendEmailResult>>(
  async () => ({ ok: true }),
);
vi.mock("@/lib/resend", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
}));

import { GET, maxDuration } from "@/app/api/cron/check-secret-rotation/route";
import { requireCronAuth } from "@/lib/cron-auth";

function makeReq(): NextRequest {
  return new Request("http://localhost/api/cron/check-secret-rotation") as unknown as NextRequest;
}

// Compute a date string N days ago from now.
function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
}

const SECRET_ENV_VARS = [
  "CRON_SECRET_ROTATED_AT",
  "INTERNAL_API_KEY_ROTATED_AT",
  "REVALIDATE_SECRET_ROTATED_AT",
  "SUPABASE_SERVICE_ROLE_KEY_ROTATED_AT",
  "RESEND_API_KEY_ROTATED_AT",
  "STRIPE_SECRET_KEY_ROTATED_AT",
  "STRIPE_WEBHOOK_SECRET_ROTATED_AT",
];

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("GET /api/cron/check-secret-rotation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendEmail.mockResolvedValue({ ok: true });
    // Clear all rotation env vars.
    for (const v of SECRET_ENV_VARS) delete process.env[v];
    delete process.env.OPS_ALERT_EMAIL;
  });

  afterAll(() => { vi.restoreAllMocks(); });

  it("exports maxDuration=30", () => {
    expect(maxDuration).toBe(30);
  });

  it("returns 401 when requireCronAuth rejects", async () => {
    vi.mocked(requireCronAuth).mockReturnValueOnce(
      new Response(JSON.stringify({ error: "Unauthorised" }), { status: 401 }) as never,
    );
    const res = await GET(makeReq());
    expect(res.status).toBe(401);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("returns ok=true with no email when all secrets are within window", async () => {
    // Set all secrets to 1 day ago (well within any rotation window).
    for (const v of SECRET_ENV_VARS) process.env[v] = daysAgo(1);

    const res = await GET(makeReq());
    const body = await res.json() as { ok: boolean; message?: string };
    expect(res.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.message).toMatch(/within rotation window/i);
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("flags untracked secrets (missing _ROTATED_AT env var) and sends email", async () => {
    // Set only some secrets — leave the rest untracked.
    process.env.CRON_SECRET_ROTATED_AT = daysAgo(1);
    process.env.INTERNAL_API_KEY_ROTATED_AT = daysAgo(1);
    // REVALIDATE_SECRET, SUPABASE_SERVICE_ROLE_KEY, etc. are untracked.

    const res = await GET(makeReq());
    const body = await res.json() as { ok: boolean; alerted: number };
    expect(body.ok).toBe(true);
    expect(body.alerted).toBeGreaterThan(0);
    expect(mockSendEmail).toHaveBeenCalledOnce();

    const call = mockSendEmail.mock.calls[0]?.[0] as { to: string; subject: string; html: string };
    expect(call.subject).toMatch(/Action Required/i);
    expect(call.html).toMatch(/UNTRACKED/);
  });

  it("flags overdue secrets (past rotation window) and sends email", async () => {
    // CRON_SECRET window is 90 days — set it to 100 days ago.
    for (const v of SECRET_ENV_VARS) process.env[v] = daysAgo(1); // all ok initially
    process.env.CRON_SECRET_ROTATED_AT = daysAgo(100);

    const res = await GET(makeReq());
    const body = await res.json() as { ok: boolean; alerted: number; statuses: { name: string; status: string }[] };
    expect(body.ok).toBe(true);
    expect(body.alerted).toBe(1);

    const overdueEntry = body.statuses.find((s) => s.name === "CRON_SECRET");
    expect(overdueEntry?.status).toBe("overdue");

    const call = mockSendEmail.mock.calls[0]?.[0] as { html: string };
    expect(call.html).toMatch(/OVERDUE/);
  });

  it("flags due-soon secrets (within 14-day lead window) and sends email", async () => {
    // CRON_SECRET window = 90 days; 80 days ago → 10 days remaining → due-soon.
    for (const v of SECRET_ENV_VARS) process.env[v] = daysAgo(1);
    process.env.CRON_SECRET_ROTATED_AT = daysAgo(80);

    const res = await GET(makeReq());
    const body = await res.json() as { ok: boolean; alerted: number; statuses: { name: string; status: string }[] };
    expect(body.alerted).toBe(1);

    const entry = body.statuses.find((s) => s.name === "CRON_SECRET");
    expect(entry?.status).toBe("due-soon");

    const call = mockSendEmail.mock.calls[0]?.[0] as { html: string };
    expect(call.html).toMatch(/DUE SOON/);
  });

  it("treats an invalid _ROTATED_AT date as untracked", async () => {
    for (const v of SECRET_ENV_VARS) process.env[v] = daysAgo(1);
    process.env.CRON_SECRET_ROTATED_AT = "not-a-date";

    const res = await GET(makeReq());
    const body = await res.json() as { statuses: { name: string; status: string }[] };
    const entry = body.statuses.find((s) => s.name === "CRON_SECRET");
    expect(entry?.status).toBe("untracked");
  });

  it("sends alert to OPS_ALERT_EMAIL when set, else falls back to ADMIN_EMAIL", async () => {
    // Leave secrets untracked to trigger an alert.
    process.env.OPS_ALERT_EMAIL = "ops@example.com";

    await GET(makeReq());
    const call = mockSendEmail.mock.calls[0]?.[0] as { to: string };
    expect(call.to).toBe("ops@example.com");
  });

  it("falls back to ADMIN_EMAIL when OPS_ALERT_EMAIL is not set", async () => {
    delete process.env.OPS_ALERT_EMAIL;
    // Leave secrets untracked to trigger an alert.

    await GET(makeReq());
    const call = mockSendEmail.mock.calls[0]?.[0] as { to: string };
    expect(call.to).toBe("admin@invest.com.au");
  });

  it("reports multiple secrets needing action in one email", async () => {
    // Only set two secrets as ok; leave 5 untracked.
    process.env.CRON_SECRET_ROTATED_AT = daysAgo(1);
    process.env.INTERNAL_API_KEY_ROTATED_AT = daysAgo(1);

    const res = await GET(makeReq());
    const body = await res.json() as { alerted: number };
    expect(body.alerted).toBe(5);
    expect(mockSendEmail).toHaveBeenCalledOnce();

    const call = mockSendEmail.mock.calls[0]?.[0] as { subject: string };
    expect(call.subject).toMatch(/5 secrets/);
  });
});
