import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));
vi.mock("@/lib/html-escape", () => ({
  escapeHtml: (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"),
}));
vi.mock("@/lib/stripe", () => ({
  PLANS: {
    monthly: { label: "$9/month" },
    yearly: { label: "$89/year" },
  },
}));

import {
  emailWrapper,
  buildProWelcomeEmail,
  buildCourseReceiptEmail,
  buildTrialEndingSoonEmail,
  buildConsultationConfirmationEmail,
  sendTransactionalEmail,
} from "@/lib/stripe-webhook/lib/email";

vi.stubGlobal(
  "fetch",
  vi.fn(() => Promise.resolve(new Response("{}", { status: 200 }))),
);

describe("emailWrapper", () => {
  it("includes the heading and body content", () => {
    const html = emailWrapper("Test Heading", "#ff0000", "<p>body</p>");
    expect(html).toContain("Test Heading");
    expect(html).toContain("<p>body</p>");
    expect(html).toContain("#ff0000");
  });

  it("includes the unsubscribe link", () => {
    const html = emailWrapper("H", "#000", "");
    expect(html).toContain("invest.com.au/unsubscribe");
  });
});

describe("buildProWelcomeEmail", () => {
  it("renders yearly plan label for year interval", () => {
    const html = buildProWelcomeEmail("year");
    expect(html).toContain("$89/year");
  });

  it("renders monthly plan label for month interval", () => {
    const html = buildProWelcomeEmail("month");
    expect(html).toContain("$9/month");
  });

  it("renders monthly plan label for null interval", () => {
    const html = buildProWelcomeEmail(null);
    expect(html).toContain("$9/month");
  });

  it("includes account link", () => {
    const html = buildProWelcomeEmail("month");
    expect(html).toContain("invest.com.au/account");
  });
});

describe("buildCourseReceiptEmail", () => {
  it("converts amount from cents to dollars", () => {
    const html = buildCourseReceiptEmail("My Course", "my-course", 4999);
    expect(html).toContain("49.99");
  });

  it("includes the course name", () => {
    const html = buildCourseReceiptEmail("ETF Masterclass", "etf-masterclass", 9900);
    expect(html).toContain("ETF Masterclass");
  });

  it("includes the course slug in the CTA link", () => {
    const html = buildCourseReceiptEmail("Course", "my-slug", 100);
    expect(html).toContain("courses/my-slug");
  });

  it("escapes HTML in course name", () => {
    const html = buildCourseReceiptEmail("<script>xss</script>", "safe-slug", 100);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});

describe("buildTrialEndingSoonEmail", () => {
  it("renders 'yearly' for year interval", () => {
    const html = buildTrialEndingSoonEmail("year", "31 May 2026");
    expect(html).toContain("yearly");
    expect(html).toContain("31 May 2026");
  });

  it("renders 'monthly' for non-year intervals", () => {
    const html = buildTrialEndingSoonEmail("month", "15 Jun 2026");
    expect(html).toContain("monthly");
  });

  it("renders 'monthly' for null interval", () => {
    const html = buildTrialEndingSoonEmail(null, "1 Jul 2026");
    expect(html).toContain("monthly");
  });
});

describe("buildConsultationConfirmationEmail", () => {
  it("converts amount from cents to dollars", () => {
    const html = buildConsultationConfirmationEmail("SMSF Consult", "smsf-consult", 19900);
    expect(html).toContain("199.00");
  });

  it("includes the consultation title", () => {
    const html = buildConsultationConfirmationEmail("Tax Review", "tax-review", 9900);
    expect(html).toContain("Tax Review");
  });

  it("includes the slug in the CTA link", () => {
    const html = buildConsultationConfirmationEmail("C", "my-consult-slug", 100);
    expect(html).toContain("consultations/my-consult-slug");
  });

  it("escapes HTML in consultation title", () => {
    const html = buildConsultationConfirmationEmail("<b>bold</b>", "slug", 100);
    expect(html).not.toContain("<b>bold</b>");
    expect(html).toContain("&lt;b&gt;bold&lt;/b&gt;");
  });
});

describe("sendTransactionalEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
  });

  it("does nothing when RESEND_API_KEY is not set", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    await sendTransactionalEmail("a@b.com", "Hi", "<p>body</p>");
    expect(vi.mocked(fetch)).not.toHaveBeenCalled();
  });

  it("calls Resend API with correct fields when key is set", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    await sendTransactionalEmail("user@example.com", "Subject", "<p>Hi</p>");
    expect(vi.mocked(fetch)).toHaveBeenCalledOnce();
    const [url, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    const body = JSON.parse(init.body as string) as { to: string[]; subject: string };
    expect(body.to).toContain("user@example.com");
    expect(body.subject).toBe("Subject");
  });

  it("does not throw when Resend fetch rejects (fire-and-forget)", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.mocked(fetch).mockRejectedValueOnce(new Error("network error"));
    await expect(
      sendTransactionalEmail("a@b.com", "s", "<p>h</p>"),
    ).resolves.toBeUndefined();
  });

  it("sends with custom from address when provided", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    await sendTransactionalEmail("a@b.com", "s", "<p>h</p>", "Custom <custom@example.com>");
    const [, init] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as { from: string };
    expect(body.from).toBe("Custom <custom@example.com>");
  });
});
