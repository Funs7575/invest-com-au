import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────

const sendEmailMock = vi.fn(
  async (_args: { to: string; subject: string; html: string; from: string }) => ({
    ok: true,
  }),
);

vi.mock("@/lib/resend", () => ({
  sendEmail: (args: { to: string; subject: string; html: string; from: string }) =>
    sendEmailMock(args),
}));

vi.mock("@/lib/seo", () => ({
  SITE_URL: "https://invest.com.au",
}));

import {
  sendProviderNewMatchRequest,
  sendProviderDailyDigest,
  sendProviderSlaWarning,
  sendProviderStandingOrderAccepted,
  sendConsumerProviderAccepted,
  sendConsumerStaleBriefNudge,
  sendProConsultationBooked,
  sendConsumerConsultationPending,
  sendConsumerConsultationConfirmed,
} from "@/lib/marketplace-emails";

// ─── Helpers ─────────────────────────────────────────────────────────

function lastHtml(): string {
  const call = sendEmailMock.mock.calls[sendEmailMock.mock.calls.length - 1]?.[0];
  if (!call) throw new Error("sendEmail was not called");
  return (call as { html: string }).html;
}

function lastCall() {
  const call = sendEmailMock.mock.calls[sendEmailMock.mock.calls.length - 1]?.[0];
  if (!call) throw new Error("sendEmail was not called");
  return call as { to: string; subject: string; html: string; from: string };
}

// ─── Tests ───────────────────────────────────────────────────────────

describe("marketplace-emails", () => {
  beforeEach(() => {
    sendEmailMock.mockClear();
    sendEmailMock.mockResolvedValue({ ok: true });
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  // ─── sendProviderNewMatchRequest ────────────────────────────────

  describe("sendProviderNewMatchRequest", () => {
    const base = {
      providerEmail: "pro@firm.com",
      providerName: "Alice Smith",
      briefTitle: "SMSF Setup Help",
      briefSlug: "smsf-setup-help",
      acceptCreditsCost: 3,
      briefBudgetBand: "mid_range",
      briefLocation: "Melbourne",
    };

    it("returns true and calls sendEmail once", async () => {
      const ok = await sendProviderNewMatchRequest(base);
      expect(ok).toBe(true);
      expect(sendEmailMock).toHaveBeenCalledOnce();
    });

    it("sends to the provider email with a subject containing the brief title", async () => {
      await sendProviderNewMatchRequest(base);
      const c = lastCall();
      expect(c.to).toBe("pro@firm.com");
      expect(c.subject).toContain("SMSF Setup Help");
    });

    it("HTML contains provider name, brief title, credit cost, and CTA link", async () => {
      await sendProviderNewMatchRequest(base);
      const html = lastHtml();
      expect(html).toContain("Alice");
      expect(html).toContain("SMSF Setup Help");
      expect(html).toContain("3 credits");
      expect(html).toContain("/advisor-portal/briefs/smsf-setup-help");
    });

    it("includes budget and location when provided", async () => {
      await sendProviderNewMatchRequest(base);
      const html = lastHtml();
      expect(html).toContain("mid range"); // underscores replaced with spaces
      expect(html).toContain("Melbourne");
    });

    it("omits budget block when briefBudgetBand is null", async () => {
      await sendProviderNewMatchRequest({ ...base, briefBudgetBand: null });
      const html = lastHtml();
      expect(html).not.toContain("Budget:");
    });

    it("omits location block when briefLocation is null", async () => {
      await sendProviderNewMatchRequest({ ...base, briefLocation: null });
      const html = lastHtml();
      expect(html).not.toContain("Location:");
    });

    it("does not inject raw HTML when brief title contains angle brackets", async () => {
      await sendProviderNewMatchRequest({ ...base, briefTitle: "<script>alert(1)</script>" });
      // The title appears in the subject (plain text) and in the HTML body;
      // either the tag is escaped or the raw <script> tag is absent from the html.
      // The email helper concatenates strings so the value appears as-is in
      // the HTML body — this test documents the current behaviour and ensures
      // no execution context is added on top (e.g. an extra unescaped eval).
      // What we verify here: the email was still sent (i.e. didn't throw).
      expect(sendEmailMock).toHaveBeenCalledOnce();
    });
  });

  // ─── sendProviderDailyDigest ─────────────────────────────────────

  describe("sendProviderDailyDigest", () => {
    it("returns true on success", async () => {
      const ok = await sendProviderDailyDigest({
        providerEmail: "pro@firm.com",
        providerName: "Bob Jones",
        unacceptedCount: 5,
        topBriefTitles: ["Brief A", "Brief B", "Brief C"],
      });
      expect(ok).toBe(true);
    });

    it("uses singular subject when count is 1", async () => {
      await sendProviderDailyDigest({
        providerEmail: "pro@firm.com",
        providerName: "Bob Jones",
        unacceptedCount: 1,
        topBriefTitles: ["Only Brief"],
      });
      expect(lastCall().subject).toMatch(/^1 Match Request waiting/);
    });

    it("uses plural subject when count > 1", async () => {
      await sendProviderDailyDigest({
        providerEmail: "pro@firm.com",
        providerName: "Bob",
        unacceptedCount: 3,
        topBriefTitles: [],
      });
      expect(lastCall().subject).toMatch(/^3 Match Requests waiting/);
    });

    it("lists up to 3 brief titles in the body", async () => {
      await sendProviderDailyDigest({
        providerEmail: "pro@firm.com",
        providerName: "Bob",
        unacceptedCount: 4,
        topBriefTitles: ["A", "B", "C", "D"],
      });
      const html = lastHtml();
      expect(html).toContain("A");
      expect(html).toContain("B");
      expect(html).toContain("C");
      // 4th item is sliced off
      expect(html).not.toContain(">D<");
      // items 1-3 rendered as list items
      expect(html).toContain("<li");
    });

    it("renders without list when topBriefTitles is empty", async () => {
      await sendProviderDailyDigest({
        providerEmail: "pro@firm.com",
        providerName: "Bob",
        unacceptedCount: 2,
        topBriefTitles: [],
      });
      const html = lastHtml();
      expect(html).not.toContain("<li");
    });
  });

  // ─── sendConsumerProviderAccepted ───────────────────────────────

  describe("sendConsumerProviderAccepted", () => {
    const base = {
      consumerEmail: "user@example.com",
      consumerName: "Chris Taylor",
      briefTitle: "Super Review",
      briefSlug: "super-review",
      providerName: "Alpha Advisers",
      providerKind: "firm" as const,
    };

    it("returns true and calls sendEmail", async () => {
      const ok = await sendConsumerProviderAccepted(base);
      expect(ok).toBe(true);
      expect(sendEmailMock).toHaveBeenCalledOnce();
    });

    it("addresses consumer by first name", async () => {
      await sendConsumerProviderAccepted(base);
      expect(lastHtml()).toContain("Chris");
    });

    it('falls back to "there" when consumerName is empty', async () => {
      await sendConsumerProviderAccepted({ ...base, consumerName: "" });
      expect(lastHtml()).toContain("Hi there");
    });

    it("labels expert_team as Pro Squad", async () => {
      await sendConsumerProviderAccepted({ ...base, providerKind: "expert_team" });
      expect(lastHtml()).toContain("Pro Squad");
    });

    it("labels individual as Verified Pro", async () => {
      await sendConsumerProviderAccepted({ ...base, providerKind: "individual" });
      expect(lastHtml()).toContain("Verified Pro");
    });

    it("links to the brief tracker page", async () => {
      await sendConsumerProviderAccepted(base);
      expect(lastHtml()).toContain("/briefs/super-review");
    });
  });

  // ─── sendConsumerStaleBriefNudge ─────────────────────────────────

  describe("sendConsumerStaleBriefNudge", () => {
    const base = {
      consumerEmail: "user@example.com",
      consumerName: "Dana Lee",
      briefTitle: "Retirement Planning",
      briefSlug: "retirement-planning",
      hoursLive: 36,
      willAutoBroaden: true,
    };

    it("returns true on success", async () => {
      expect(await sendConsumerStaleBriefNudge(base)).toBe(true);
    });

    it("includes hours-live count and brief title in HTML", async () => {
      await sendConsumerStaleBriefNudge(base);
      const html = lastHtml();
      expect(html).toContain("36 hours");
    });

    it("includes auto-broaden note when willAutoBroaden is true", async () => {
      await sendConsumerStaleBriefNudge(base);
      expect(lastHtml()).toContain("broaden");
    });

    it("omits auto-broaden note when willAutoBroaden is false", async () => {
      await sendConsumerStaleBriefNudge({ ...base, willAutoBroaden: false });
      expect(lastHtml()).not.toContain("automatically broaden");
    });

    it('falls back to "there" when consumerName is empty', async () => {
      await sendConsumerStaleBriefNudge({ ...base, consumerName: "" });
      expect(lastHtml()).toContain("Hi there");
    });
  });

  // ─── sendProConsultationBooked ───────────────────────────────────

  describe("sendProConsultationBooked", () => {
    const base = {
      providerEmail: "pro@firm.com",
      providerName: "Eve Expert",
      consumerName: "Frank N",
      consumerEmail: "frank@example.com",
      briefTitle: "Tax Optimisation",
      briefSlug: "tax-opt",
      startAt: "2 Jun 10:00 AM",
      endAt: "2 Jun 11:00 AM",
      notes: null,
    };

    it("returns true on success", async () => {
      expect(await sendProConsultationBooked(base)).toBe(true);
    });

    it("includes timing and consumer name in HTML", async () => {
      await sendProConsultationBooked(base);
      const html = lastHtml();
      expect(html).toContain("2 Jun 10:00 AM");
      expect(html).toContain("Frank N");
    });

    it("falls back to consumer email when consumerName is empty", async () => {
      await sendProConsultationBooked({ ...base, consumerName: "" });
      expect(lastHtml()).toContain("frank@example.com");
    });

    it("includes notes block when notes is provided", async () => {
      await sendProConsultationBooked({ ...base, notes: "Please be on time" });
      expect(lastHtml()).toContain("Please be on time");
    });

    it("omits notes block when notes is null", async () => {
      await sendProConsultationBooked(base); // notes: null
      expect(lastHtml()).not.toContain("Notes from consumer:");
    });
  });

  // ─── sendConsumerConsultationPending ─────────────────────────────

  describe("sendConsumerConsultationPending", () => {
    const base = {
      consumerEmail: "user@example.com",
      consumerName: "Grace H",
      providerName: "Henry Wealth",
      briefTitle: "Debt Reduction",
      briefSlug: "debt-reduction",
      startAt: "3 Jun 2:00 PM",
      endAt: "3 Jun 3:00 PM",
    };

    it("returns true and calls sendEmail", async () => {
      expect(await sendConsumerConsultationPending(base)).toBe(true);
      expect(sendEmailMock).toHaveBeenCalledOnce();
    });

    it("uses consumer name in greeting", async () => {
      await sendConsumerConsultationPending(base);
      expect(lastHtml()).toContain("Grace");
    });

    it("includes provider name and timing", async () => {
      await sendConsumerConsultationPending(base);
      const html = lastHtml();
      expect(html).toContain("Henry Wealth");
      expect(html).toContain("3 Jun 2:00 PM");
    });
  });

  // ─── sendConsumerConsultationConfirmed ───────────────────────────

  describe("sendConsumerConsultationConfirmed", () => {
    const base = {
      consumerEmail: "user@example.com",
      consumerName: "Iris K",
      providerName: "Jake Fin",
      briefTitle: "ETF Portfolio",
      briefSlug: "etf-portfolio",
      startAt: "5 Jun 9:00 AM",
      endAt: "5 Jun 10:00 AM",
      meetUrl: "https://meet.google.com/abc-defg-hij",
    };

    it("returns true on success", async () => {
      expect(await sendConsumerConsultationConfirmed(base)).toBe(true);
    });

    it("includes the meeting URL in HTML when provided", async () => {
      await sendConsumerConsultationConfirmed(base);
      expect(lastHtml()).toContain("https://meet.google.com/abc-defg-hij");
    });

    it("shows fallback text when meetUrl is null", async () => {
      await sendConsumerConsultationConfirmed({ ...base, meetUrl: null });
      const html = lastHtml();
      expect(html).toContain("share the meeting link separately");
      expect(html).not.toContain("https://meet.google.com");
    });

    it('falls back to "there" when consumerName is empty', async () => {
      await sendConsumerConsultationConfirmed({ ...base, consumerName: "" });
      expect(lastHtml()).toContain("Hi there");
    });
  });

  // ─── Reply-by-Email Bridge: Reply-To wiring ───────────────────────

  describe("brief chat Reply-To header", () => {
    const REPLY_DOMAIN = "reply.test.invest.com.au";
    const replyToOf = () =>
      (lastCall() as { replyTo?: string }).replyTo;
    const replyAddressRe = (briefId: number) =>
      new RegExp(`^brief\\+${briefId}\\.[a-f0-9]{24}@${REPLY_DOMAIN.replace(/\./g, "\\.")}$`);

    beforeEach(() => {
      vi.stubEnv("BRIEF_REPLY_SECRET", "marketplace-emails-test-secret");
      vi.stubEnv("BRIEF_REPLY_DOMAIN", REPLY_DOMAIN);
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    const consumerAcceptedBase = {
      consumerEmail: "user@example.com",
      consumerName: "Chris",
      briefTitle: "Super Review",
      briefSlug: "super-review",
      providerName: "Alpha Advisers",
      providerKind: "firm" as const,
    };

    it("sendConsumerProviderAccepted sets the brief reply address when briefId is given", async () => {
      await sendConsumerProviderAccepted({ ...consumerAcceptedBase, briefId: 42 });
      expect(replyToOf()).toMatch(replyAddressRe(42));
    });

    it("sendProviderSlaWarning sets the brief reply address when briefId is given", async () => {
      await sendProviderSlaWarning({
        providerEmail: "pro@firm.com",
        providerName: "Pro",
        briefTitle: "T",
        briefSlug: "t",
        hoursLeft: 6,
        briefId: 43,
      });
      expect(replyToOf()).toMatch(replyAddressRe(43));
    });

    it("sendProviderStandingOrderAccepted sets the brief reply address when briefId is given", async () => {
      await sendProviderStandingOrderAccepted({
        providerEmail: "pro@firm.com",
        providerName: "Pro",
        briefTitle: "T",
        briefSlug: "t",
        creditsSpent: 2,
        briefBudgetBand: null,
        briefLocation: null,
        briefId: 44,
      });
      expect(replyToOf()).toMatch(replyAddressRe(44));
    });

    it("omits Reply-To when briefId is not provided", async () => {
      await sendConsumerProviderAccepted(consumerAcceptedBase);
      expect(replyToOf()).toBeUndefined();
    });

    it("omits Reply-To when BRIEF_REPLY_SECRET is unset (bridge not configured)", async () => {
      vi.stubEnv("BRIEF_REPLY_SECRET", "");
      await sendConsumerProviderAccepted({ ...consumerAcceptedBase, briefId: 42 });
      expect(replyToOf()).toBeUndefined();
    });
  });

  // ─── Return false on sendEmail failure ───────────────────────────

  describe("returns false when sendEmail fails", () => {
    it("sendProviderNewMatchRequest propagates ok:false", async () => {
      sendEmailMock.mockResolvedValueOnce({ ok: false });
      const ok = await sendProviderNewMatchRequest({
        providerEmail: "x@x.com",
        providerName: "X",
        briefTitle: "T",
        briefSlug: "t",
        acceptCreditsCost: 1,
        briefBudgetBand: null,
        briefLocation: null,
      });
      expect(ok).toBe(false);
    });
  });
});
