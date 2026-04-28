import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

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

import { sendCap80Alert } from "@/lib/ai-cost-alerts";

describe("sendCap80Alert", () => {
  let savedEnv: string | undefined;
  let savedFallback: string | undefined;

  beforeEach(() => {
    vi.clearAllMocks();
    sendEmailMock.mockResolvedValue({ ok: true });
    savedEnv = process.env.OPS_ALERT_EMAIL;
    savedFallback = process.env.SUPPORT_EMAIL;
    delete process.env.OPS_ALERT_EMAIL;
    delete process.env.SUPPORT_EMAIL;
  });

  afterEach(() => {
    if (savedEnv === undefined) delete process.env.OPS_ALERT_EMAIL;
    else process.env.OPS_ALERT_EMAIL = savedEnv;
    if (savedFallback === undefined) delete process.env.SUPPORT_EMAIL;
    else process.env.SUPPORT_EMAIL = savedFallback;
  });

  it("returns ok:false when no recipient is configured (no send attempted)", async () => {
    const r = await sendCap80Alert({
      routeLabel: "concierge chatbot",
      subjectId: "ip:abcd",
      subjectType: "public_session",
      newSubjectMicros: 4_000_000,
      capMicros: 5_000_000,
    });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("no_recipient");
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("falls back to SUPPORT_EMAIL when OPS_ALERT_EMAIL is unset", async () => {
    process.env.SUPPORT_EMAIL = "support@invest.com.au";
    await sendCap80Alert({
      routeLabel: "admin AI agent",
      subjectId: "admin@invest.com.au",
      subjectType: "admin_user",
      newSubjectMicros: 40_000_000,
      capMicros: 50_000_000,
    });
    expect(sendEmailMock).toHaveBeenCalledTimes(1);
    expect(sendEmailMock.mock.calls[0][0].to).toBe("support@invest.com.au");
  });

  it("renders a subject + html body containing surface, subject, and percent", async () => {
    process.env.OPS_ALERT_EMAIL = "ops@invest.com.au";
    await sendCap80Alert({
      routeLabel: "admin AI agent",
      subjectId: "finn@invest.com.au",
      subjectType: "admin_user",
      newSubjectMicros: 40_000_000,
      capMicros: 50_000_000,
    });
    const arg = sendEmailMock.mock.calls[0][0] as {
      to: string;
      subject: string;
      html: string;
    };
    expect(arg.to).toBe("ops@invest.com.au");
    expect(arg.subject).toContain("AI cap 80%");
    expect(arg.subject).toContain("admin AI agent");
    expect(arg.subject).toContain("finn@invest.com.au");
    expect(arg.html).toContain("admin AI agent");
    expect(arg.html).toContain("$40.00");
    expect(arg.html).toContain("$50.00");
    expect(arg.html).toContain("80%");
  });

  it("truncates the public IP key in the rendered display (privacy)", async () => {
    process.env.OPS_ALERT_EMAIL = "ops@invest.com.au";
    await sendCap80Alert({
      routeLabel: "concierge chatbot",
      subjectId: "203.0.113.45.full.ip.string.kept-internal",
      subjectType: "public_session",
      newSubjectMicros: 4_000_000,
      capMicros: 5_000_000,
    });
    const arg = sendEmailMock.mock.calls[0][0] as {
      subject: string;
      html: string;
    };
    expect(arg.subject).toContain("session 203.0.113.45");
    // Full string must not appear in the subject (privacy guardrail).
    expect(arg.subject).not.toContain("kept-internal");
  });

  it("escapes HTML in the rendered subject identifier (XSS guard)", async () => {
    process.env.OPS_ALERT_EMAIL = "ops@invest.com.au";
    await sendCap80Alert({
      routeLabel: "concierge chatbot",
      subjectId: "<script>alert(1)</script>",
      subjectType: "admin_user",
      newSubjectMicros: 4_000_000,
      capMicros: 5_000_000,
    });
    const arg = sendEmailMock.mock.calls[0][0] as { html: string };
    expect(arg.html).not.toContain("<script>alert");
    expect(arg.html).toContain("&lt;script&gt;");
  });
});
