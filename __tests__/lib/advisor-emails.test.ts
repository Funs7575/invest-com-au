import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────

vi.mock("@/lib/admin", () => ({
  ADMIN_EMAIL: "admin@invest.com.au",
}));

const sendEmailMock = vi.fn(
  async (_args: { to: string; subject: string; html: string; from: string }) => ({
    ok: true,
  }),
);

vi.mock("@/lib/resend", () => ({
  sendEmail: (args: { to: string; subject: string; html: string; from: string }) =>
    sendEmailMock(args),
}));

import {
  sendApplicationConfirmation,
  sendApplicationApproved,
  sendApplicationRejected,
  sendFirmInvitation,
  sendLeadConfirmationToUser,
  sendAdminNotification,
  sendReviewRequest,
} from "@/lib/advisor-emails";

// ─── Tests ───────────────────────────────────────────────────────────

describe("advisor-emails", () => {
  beforeEach(() => {
    sendEmailMock.mockClear();
    sendEmailMock.mockResolvedValue({ ok: true });
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe("short-circuits when `to` is empty", () => {
    it("sendApplicationConfirmation returns false + does not call sendEmail", async () => {
      const ok = await sendApplicationConfirmation("", "Jane Doe", "individual");
      expect(ok).toBe(false);
      expect(sendEmailMock).not.toHaveBeenCalled();
    });

    it("sendApplicationApproved returns false when email missing", async () => {
      const ok = await sendApplicationApproved("", "Jane", "https://x");
      expect(ok).toBe(false);
    });

    it("sendReviewRequest returns false when email missing", async () => {
      const ok = await sendReviewRequest("", "Jane", "Adv", "slug");
      expect(ok).toBe(false);
    });
  });

  describe("sendApplicationConfirmation", () => {
    it("uses an individual-specific subject and body when accountType=individual", async () => {
      await sendApplicationConfirmation("a@b.com", "Jane Doe", "individual");
      expect(sendEmailMock).toHaveBeenCalledOnce();
      const call = sendEmailMock.mock.calls[0]?.[0];
      expect(call?.subject).toMatch(/Application received/i);
      expect(call?.to).toBe("a@b.com");
      expect(call?.html).toContain("Jane"); // first name
      expect(call?.html).toContain("an individual advisor");
    });

    it("uses firm-specific copy when accountType=firm", async () => {
      await sendApplicationConfirmation("a@b.com", "Jane Doe", "firm");
      const call = sendEmailMock.mock.calls[0]?.[0];
      expect(call?.html).toContain("a firm");
      expect(call?.html).toContain("firm profile");
    });
  });

  describe("sendApplicationApproved", () => {
    it("embeds the login url and first name", async () => {
      await sendApplicationApproved(
        "a@b.com",
        "Jane Doe",
        "https://invest.com.au/login?t=abc",
      );
      const call = sendEmailMock.mock.calls[0]?.[0];
      expect(call?.html).toContain("https://invest.com.au/login?t=abc");
      expect(call?.html).toContain("Jane");
    });
  });

  describe("sendApplicationRejected", () => {
    it("omits the reason block when reason is not provided", async () => {
      await sendApplicationRejected("a@b.com", "Jane Doe");
      const call = sendEmailMock.mock.calls[0]?.[0];
      expect(call?.html).not.toContain("Reason:");
    });

    it("includes the reason block when a reason is provided", async () => {
      await sendApplicationRejected("a@b.com", "Jane Doe", "Unverifiable AFS number");
      const call = sendEmailMock.mock.calls[0]?.[0];
      expect(call?.html).toContain("Reason:");
      expect(call?.html).toContain("Unverifiable AFS number");
    });
  });

  describe("sendFirmInvitation", () => {
    it("uses a 'Hi there' greeting when inviteeName is undefined", async () => {
      await sendFirmInvitation(
        "new@firm.com",
        undefined,
        "Acme Advisers",
        "Paul",
        "https://x/accept",
      );
      const call = sendEmailMock.mock.calls[0]?.[0];
      expect(call?.html).toContain("Hi there");
      expect(call?.subject).toBe(
        "Paul invited you to join Acme Advisers on Invest.com.au",
      );
    });

    it("uses the invitee's first name when provided", async () => {
      await sendFirmInvitation(
        "new@firm.com",
        "Lydia Smith",
        "Acme",
        "Paul",
        "https://x/accept",
      );
      const call = sendEmailMock.mock.calls[0]?.[0];
      expect(call?.html).toContain("Hi Lydia");
    });
  });

  describe("sendLeadConfirmationToUser", () => {
    it("titlecases the advisor type and includes the firm when present", async () => {
      await sendLeadConfirmationToUser(
        "user@x.com",
        "Jordan Reed",
        "Sam Smith",
        "financial_planner",
        "Acme Advisers",
      );
      const call = sendEmailMock.mock.calls[0]?.[0];
      expect(call?.subject).toContain("Sam Smith");
      expect(call?.html).toContain("Financial Planner");
      expect(call?.html).toContain("Acme Advisers");
      expect(call?.html).toContain("Jordan");
    });

    it("omits the firm block when advisorFirm is null", async () => {
      await sendLeadConfirmationToUser(
        "user@x.com",
        "Jordan",
        "Sam",
        "tax_agent",
        null,
      );
      const call = sendEmailMock.mock.calls[0]?.[0];
      // Firm block is rendered only when advisorFirm truthy
      expect(call?.html).not.toMatch(/firm[^<]*<\/p>/);
    });
  });

  describe("sendAdminNotification", () => {
    it("sends to ADMIN_EMAIL with the provided subject", async () => {
      await sendAdminNotification("An important thing", "Body content here");
      const call = sendEmailMock.mock.calls[0]?.[0];
      expect(call?.to).toBe("admin@invest.com.au");
      expect(call?.subject).toBe("An important thing");
      expect(call?.html).toContain("Body content here");
    });
  });

  describe("sendReviewRequest", () => {
    it("embeds the advisor slug in the review URL", async () => {
      await sendReviewRequest("user@x.com", "Jordan", "Sam", "sam-the-advisor");
      const call = sendEmailMock.mock.calls[0]?.[0];
      expect(call?.html).toContain(
        "https://invest.com.au/advisor/sam-the-advisor#reviews",
      );
      // URL-encodes the email in the unsubscribe link
      expect(call?.html).toContain(encodeURIComponent("user@x.com"));
    });
  });

  describe("propagates the resend `ok` flag to the caller", () => {
    it("returns false when sendEmail returns ok:false", async () => {
      sendEmailMock.mockResolvedValueOnce({ ok: false });
      const ok = await sendApplicationConfirmation(
        "a@b.com",
        "Jane",
        "individual",
      );
      expect(ok).toBe(false);
    });

    it("returns true when sendEmail returns ok:true", async () => {
      sendEmailMock.mockResolvedValueOnce({ ok: true });
      const ok = await sendApplicationConfirmation(
        "a@b.com",
        "Jane",
        "individual",
      );
      expect(ok).toBe(true);
    });
  });
});
