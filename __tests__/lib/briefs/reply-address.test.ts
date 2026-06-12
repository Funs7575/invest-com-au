import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import {
  buildBriefReplyAddress,
  verifyBriefReplyAddress,
  verifyBriefReplyRecipients,
  DEFAULT_REPLY_DOMAIN,
  getReplyDomain,
} from "@/lib/briefs/reply-address";

const SECRET = "unit-test-reply-secret-with-plenty-of-entropy";
const DOMAIN = "reply.test.invest.com.au";

describe("lib/briefs/reply-address", () => {
  beforeEach(() => {
    vi.stubEnv("BRIEF_REPLY_SECRET", SECRET);
    vi.stubEnv("BRIEF_REPLY_DOMAIN", DOMAIN);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  // ─── Generation ────────────────────────────────────────────────────

  describe("buildBriefReplyAddress", () => {
    it("builds brief+<id>.<24-hex-sig>@<domain>", () => {
      const address = buildBriefReplyAddress(42);
      expect(address).toMatch(
        new RegExp(`^brief\\+42\\.[a-f0-9]{24}@${DOMAIN.replace(/\./g, "\\.")}$`),
      );
    });

    it("is deterministic for the same brief id", () => {
      expect(buildBriefReplyAddress(42)).toBe(buildBriefReplyAddress(42));
    });

    it("produces different signatures for different brief ids", () => {
      const a = buildBriefReplyAddress(42);
      const b = buildBriefReplyAddress(43);
      expect(a).not.toBe(b);
      const sigOf = (addr: string | null) => addr?.split(".")[1];
      expect(sigOf(a)).not.toBe(sigOf(b));
    });

    it("keeps the local part within the RFC 5321 64-char cap for huge ids", () => {
      const address = buildBriefReplyAddress(999_999_999_999);
      expect(address).not.toBeNull();
      const localPart = (address as string).split("@")[0] as string;
      expect(localPart.length).toBeLessThanOrEqual(64);
    });

    it("falls back to the default domain when BRIEF_REPLY_DOMAIN is unset", () => {
      vi.stubEnv("BRIEF_REPLY_DOMAIN", "");
      expect(getReplyDomain()).toBe(DEFAULT_REPLY_DOMAIN);
      expect(buildBriefReplyAddress(7)).toContain(`@${DEFAULT_REPLY_DOMAIN}`);
    });

    it("returns null when BRIEF_REPLY_SECRET is unset", () => {
      vi.stubEnv("BRIEF_REPLY_SECRET", "");
      expect(buildBriefReplyAddress(42)).toBeNull();
    });

    it.each([0, -5, 1.5, NaN, 1_000_000_000_000])(
      "returns null for invalid brief id %s",
      (id) => {
        expect(buildBriefReplyAddress(id as number)).toBeNull();
      },
    );
  });

  // ─── Verification ──────────────────────────────────────────────────

  describe("verifyBriefReplyAddress", () => {
    it("round-trips a generated address", () => {
      const address = buildBriefReplyAddress(42) as string;
      expect(verifyBriefReplyAddress(address)).toEqual({ ok: true, briefId: 42 });
    });

    it("accepts case-mangled addresses (clients may title-case recipients)", () => {
      const address = (buildBriefReplyAddress(42) as string).toUpperCase();
      expect(verifyBriefReplyAddress(address)).toEqual({ ok: true, briefId: 42 });
    });

    it("accepts an angle-bracketed address with whitespace", () => {
      const address = buildBriefReplyAddress(42) as string;
      expect(verifyBriefReplyAddress(`  <${address}>  `)).toEqual({
        ok: true,
        briefId: 42,
      });
    });

    it("rejects a tampered signature (single flipped hex char)", () => {
      const address = buildBriefReplyAddress(42) as string;
      const [local, domain] = address.split("@") as [string, string];
      const lastChar = local.slice(-1);
      const flipped = local.slice(0, -1) + (lastChar === "a" ? "b" : "a");
      expect(verifyBriefReplyAddress(`${flipped}@${domain}`)).toEqual({
        ok: false,
        reason: "bad_signature",
      });
    });

    it("rejects a truncated signature as malformed", () => {
      const address = buildBriefReplyAddress(42) as string;
      const [local, domain] = address.split("@") as [string, string];
      expect(verifyBriefReplyAddress(`${local.slice(0, -4)}@${domain}`)).toEqual({
        ok: false,
        reason: "malformed",
      });
    });

    it("rejects a valid signature replayed against a different brief id", () => {
      const address = buildBriefReplyAddress(42) as string;
      const swapped = address.replace("brief+42.", "brief+43.");
      expect(verifyBriefReplyAddress(swapped)).toEqual({
        ok: false,
        reason: "bad_signature",
      });
    });

    it("rejects non-canonical ids with leading zeros", () => {
      const address = buildBriefReplyAddress(42) as string;
      const padded = address.replace("brief+42.", "brief+042.");
      expect(verifyBriefReplyAddress(padded)).toEqual({
        ok: false,
        reason: "malformed",
      });
    });

    it("rejects the right local part on the wrong domain", () => {
      const address = buildBriefReplyAddress(42) as string;
      const local = address.split("@")[0] as string;
      expect(verifyBriefReplyAddress(`${local}@evil.example.com`)).toEqual({
        ok: false,
        reason: "wrong_domain",
      });
    });

    it("rejects addresses minted under a different secret", () => {
      const address = buildBriefReplyAddress(42) as string;
      vi.stubEnv("BRIEF_REPLY_SECRET", "rotated-secret");
      expect(verifyBriefReplyAddress(address)).toEqual({
        ok: false,
        reason: "bad_signature",
      });
    });

    it("fails closed when BRIEF_REPLY_SECRET is unset", () => {
      const address = buildBriefReplyAddress(42) as string;
      vi.stubEnv("BRIEF_REPLY_SECRET", "");
      expect(verifyBriefReplyAddress(address)).toEqual({
        ok: false,
        reason: "no_secret",
      });
    });

    it.each([
      "plain-string",
      "@nodomain",
      "nolocal@",
      "hello@reply.test.invest.com.au",
      "brief+notanumber.abcdefabcdefabcdefabcdef@reply.test.invest.com.au",
      "brief+42@reply.test.invest.com.au",
      "brief+42.ZZZZZZZZZZZZZZZZZZZZZZZZ@reply.test.invest.com.au",
    ])("rejects malformed address %s", (address) => {
      const result = verifyBriefReplyAddress(address);
      expect(result.ok).toBe(false);
    });
  });

  // ─── Recipient-list scanning ───────────────────────────────────────

  describe("verifyBriefReplyRecipients", () => {
    it("finds our address among unrelated recipients", () => {
      const address = buildBriefReplyAddress(42) as string;
      expect(
        verifyBriefReplyRecipients(["someone@else.com", address, "x@y.com"]),
      ).toEqual({ ok: true, briefId: 42 });
    });

    it("returns no_reply_address when nothing looks like ours", () => {
      expect(verifyBriefReplyRecipients(["a@b.com", "c@d.com"])).toEqual({
        ok: false,
        reason: "no_reply_address",
      });
    });

    it("returns no_reply_address for an empty list", () => {
      expect(verifyBriefReplyRecipients([])).toEqual({
        ok: false,
        reason: "no_reply_address",
      });
    });

    it("flags a tampered candidate as bad_signature", () => {
      const address = buildBriefReplyAddress(42) as string;
      const tampered = address.replace("brief+42.", "brief+43.");
      expect(verifyBriefReplyRecipients(["a@b.com", tampered])).toEqual({
        ok: false,
        reason: "bad_signature",
      });
    });

    it("flags a wrong-domain candidate as bad_signature", () => {
      const address = buildBriefReplyAddress(42) as string;
      const local = address.split("@")[0] as string;
      expect(verifyBriefReplyRecipients([`${local}@evil.example.com`])).toEqual({
        ok: false,
        reason: "bad_signature",
      });
    });

    it("fails closed with no_secret when the secret is unset", () => {
      vi.stubEnv("BRIEF_REPLY_SECRET", "");
      expect(verifyBriefReplyRecipients(["whatever@x.com"])).toEqual({
        ok: false,
        reason: "no_secret",
      });
    });
  });
});
