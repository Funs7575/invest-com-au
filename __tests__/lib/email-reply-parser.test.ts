import { describe, it, expect } from "vitest";

import { extractReplyText, extractEmailAddress } from "@/lib/email-reply-parser";
import { BRIEF_MESSAGE_MAX_BODY_LENGTH } from "@/lib/brief-messages";

describe("lib/email-reply-parser", () => {
  // ─── extractReplyText: real-world-shaped fixtures ──────────────────

  describe("extractReplyText", () => {
    it("strips Gmail desktop quoted history", () => {
      const text = [
        "Thanks Sarah, Tuesday at 2pm works for me.",
        "",
        "On Tue, 9 Jun 2026 at 14:02, Sarah Chen <sarah@firm.example.com> wrote:",
        "> Hi Tom,",
        "> Are you free Tuesday or Wednesday for a call?",
        "> Sarah",
      ].join("\n");
      expect(extractReplyText({ text })).toBe(
        "Thanks Sarah, Tuesday at 2pm works for me.",
      );
    });

    it("strips Gmail mobile attribution (comma date format)", () => {
      const text = [
        "Yes, send it through.",
        "",
        "On Tue, Jun 9, 2026, 2:02 PM Sarah Chen <sarah@firm.example.com> wrote:",
        "> Should I send the engagement letter?",
      ].join("\n");
      expect(extractReplyText({ text })).toBe("Yes, send it through.");
    });

    it("strips the wrapped two-line Apple Mail attribution", () => {
      const text = [
        "Sounds good — looking forward to it.",
        "",
        "On 9 Jun 2026, at 2:02 pm, Sarah Chen <sarah@firm.example.com>",
        "wrote:",
        "",
        "Hi Tom, are you free Tuesday?",
      ].join("\n");
      expect(extractReplyText({ text })).toBe("Sounds good — looking forward to it.");
    });

    it("strips an Outlook desktop -----Original Message----- block", () => {
      const text = [
        "Confirmed — I'll send the documents over this afternoon.",
        "",
        "-----Original Message-----",
        "From: Sarah Chen <sarah@firm.example.com>",
        "Sent: Tuesday, 9 June 2026 2:02 PM",
        "To: Tom Jones <tom@example.com>",
        "Subject: Re: Your Match Request",
        "",
        "Hi Tom, please send the trust deed when you can.",
      ].join("\n");
      expect(extractReplyText({ text })).toBe(
        "Confirmed — I'll send the documents over this afternoon.",
      );
    });

    it("strips an Outlook web underscore divider", () => {
      const text = [
        "Works for me.",
        "",
        "________________________________",
        "From: Sarah Chen <sarah@firm.example.com>",
        "Sent: Tuesday, June 9, 2026 2:02 PM",
        "To: Tom Jones",
        "Subject: Re: Your Match Request",
      ].join("\n");
      expect(extractReplyText({ text })).toBe("Works for me.");
    });

    it("strips a bare From:/Sent:/To: header block with no divider", () => {
      const text = [
        "Yes please, book it in.",
        "",
        "From: Sarah Chen",
        "Sent: Tuesday 2:02 PM",
        "To: Tom Jones",
      ].join("\n");
      expect(extractReplyText({ text })).toBe("Yes please, book it in.");
    });

    it("strips a bold-wrapped Outlook header block (*From:* form)", () => {
      const text = [
        "All good on my end.",
        "",
        "*From:* Sarah Chen <sarah@firm.example.com>",
        "*Sent:* Tuesday, June 9, 2026 2:02 PM",
        "*Subject:* Re: Your Match Request",
      ].join("\n");
      expect(extractReplyText({ text })).toBe("All good on my end.");
    });

    it("strips a forwarded-message marker", () => {
      const text = [
        "FYI — see below.",
        "",
        "---------- Forwarded message ---------",
        "From: Someone <someone@example.com>",
      ].join("\n");
      expect(extractReplyText({ text })).toBe("FYI — see below.");
    });

    it("cuts at the RFC 3676 signature delimiter (-- )", () => {
      const text = [
        "See you then.",
        "",
        "-- ",
        "Tom Jones",
        "0400 000 000",
      ].join("\n");
      expect(extractReplyText({ text })).toBe("See you then.");
    });

    it("cuts at a bare -- signature delimiter without trailing space", () => {
      const text = ["See you then.", "--", "Tom"].join("\n");
      expect(extractReplyText({ text })).toBe("See you then.");
    });

    it('cuts at "Sent from my iPhone"', () => {
      const text = [
        "Tuesday suits.",
        "",
        "Sent from my iPhone",
        "",
        "On 9 Jun 2026, at 2:02 pm, Sarah Chen <sarah@firm.example.com> wrote:",
        "> Are you free Tuesday?",
      ].join("\n");
      expect(extractReplyText({ text })).toBe("Tuesday suits.");
    });

    it('cuts at "Get Outlook for iOS"', () => {
      const text = ["Approved.", "", "Get Outlook for iOS"].join("\n");
      expect(extractReplyText({ text })).toBe("Approved.");
    });

    it("drops interleaved quoted lines while keeping fresh text", () => {
      const text = [
        "> Are you free Tuesday?",
        "Tuesday works.",
        "> Or Wednesday?",
        "Wednesday does not.",
      ].join("\n");
      expect(extractReplyText({ text })).toBe("Tuesday works.\nWednesday does not.");
    });

    it("returns empty string for a quote-only email", () => {
      const text = ["> old message line one", "> old message line two"].join("\n");
      expect(extractReplyText({ text })).toBe("");
    });

    it("returns empty string for empty / missing input", () => {
      expect(extractReplyText({})).toBe("");
      expect(extractReplyText({ text: "   ", html: null })).toBe("");
      expect(extractReplyText({ text: null, html: "" })).toBe("");
    });

    it("falls back to HTML, removing Gmail blockquote history", () => {
      const html =
        '<div dir="ltr">Thanks, that works for me.<br></div><br>' +
        '<div class="gmail_quote">On Tue, 9 Jun 2026 at 14:02, Sarah Chen ' +
        "&lt;sarah@firm.example.com&gt; wrote:<br>" +
        '<blockquote class="gmail_quote">Hi Tom,<div>Are you free Tuesday?' +
        "<blockquote>even deeper history</blockquote></div></blockquote></div>";
      expect(extractReplyText({ html })).toBe("Thanks, that works for me.");
    });

    it("decodes basic HTML entities in the fallback", () => {
      const html = "<p>Fees &amp; charges look fine &#39;as is&#39; &lt;ok&gt;.</p>";
      expect(extractReplyText({ html })).toBe("Fees & charges look fine 'as is' <ok>.");
    });

    it("ignores style/script content in the HTML fallback", () => {
      const html =
        "<style>.a{color:red}</style><script>alert(1)</script><p>Just this.</p>";
      expect(extractReplyText({ html })).toBe("Just this.");
    });

    it("prefers the text part when both text and html exist", () => {
      expect(
        extractReplyText({ text: "Plain wins.", html: "<p>HTML loses.</p>" }),
      ).toBe("Plain wins.");
    });

    it("handles CRLF line endings", () => {
      const text = "Done.\r\n\r\nOn Tue, 9 Jun 2026 at 14:02, S <s@f.com> wrote:\r\n> hi";
      expect(extractReplyText({ text })).toBe("Done.");
    });

    it("preserves multi-paragraph replies and collapses 3+ blank lines", () => {
      const text = [
        "First paragraph.",
        "",
        "",
        "",
        "Second paragraph,",
        "still the same thought.",
      ].join("\n");
      expect(extractReplyText({ text })).toBe(
        "First paragraph.\n\nSecond paragraph,\nstill the same thought.",
      );
    });

    it("caps the extracted body at the chat API max length", () => {
      const text = "a".repeat(BRIEF_MESSAGE_MAX_BODY_LENGTH + 2_000);
      const result = extractReplyText({ text });
      expect(result.length).toBe(BRIEF_MESSAGE_MAX_BODY_LENGTH);
    });

    it('does NOT cut a sentence that merely starts with "On"', () => {
      const text = [
        "On reflection, the fixed-fee option is better.",
        "Let me know if that changes the quote.",
      ].join("\n");
      expect(extractReplyText({ text })).toBe(
        "On reflection, the fixed-fee option is better.\nLet me know if that changes the quote.",
      );
    });

    it('does NOT cut a body line starting with "From:" unless header lines follow', () => {
      const text = [
        "From: my perspective this all looks right.",
        "Happy to proceed.",
      ].join("\n");
      expect(extractReplyText({ text })).toBe(
        "From: my perspective this all looks right.\nHappy to proceed.",
      );
    });
  });

  // ─── extractEmailAddress ───────────────────────────────────────────

  describe("extractEmailAddress", () => {
    it('parses "Display Name <user@host>"', () => {
      expect(extractEmailAddress("Sarah Chen <Sarah@Firm.Example.com>")).toBe(
        "sarah@firm.example.com",
      );
    });

    it("parses a bare address", () => {
      expect(extractEmailAddress("tom@example.com")).toBe("tom@example.com");
    });

    it("prefers the angle-bracketed address over text in the display name", () => {
      expect(
        extractEmailAddress('"fake@phish.example" <real@example.com>'),
      ).toBe("real@example.com");
    });

    it("returns null when nothing address-shaped exists", () => {
      expect(extractEmailAddress("not an email")).toBeNull();
      expect(extractEmailAddress("")).toBeNull();
      expect(extractEmailAddress(null)).toBeNull();
      expect(extractEmailAddress(undefined)).toBeNull();
    });
  });
});
