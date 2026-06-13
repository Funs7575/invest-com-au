import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import {
  signAdvisorEmbedToken,
  verifyAdvisorEmbedToken,
  advisorEmbedSigningAvailable,
  ADVISOR_EMBED_TOKEN_PREFIX,
} from "@/lib/widget/advisor-embed-token";

const TEST_SECRET = "0123456789abcdef0123456789abcdef0123456789abcdef"; // 48 chars

describe("advisor-embed-token", () => {
  let originalDedicated: string | undefined;
  let originalServiceRole: string | undefined;

  beforeAll(() => {
    originalDedicated = process.env.ADVISOR_EMBED_TOKEN_SECRET;
    originalServiceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  afterAll(() => {
    if (originalDedicated === undefined) delete process.env.ADVISOR_EMBED_TOKEN_SECRET;
    else process.env.ADVISOR_EMBED_TOKEN_SECRET = originalDedicated;
    if (originalServiceRole === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    else process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceRole;
  });

  beforeEach(() => {
    process.env.ADVISOR_EMBED_TOKEN_SECRET = TEST_SECRET;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  });

  it("reports signing available with a dedicated secret", () => {
    expect(advisorEmbedSigningAvailable()).toBe(true);
  });

  it("round-trips a signed token (id + slug preserved)", () => {
    const token = signAdvisorEmbedToken({ professionalId: 42, slug: "jane-smith-cfp" });
    expect(token.startsWith(`${ADVISOR_EMBED_TOKEN_PREFIX}.`)).toBe(true);
    const result = verifyAdvisorEmbedToken(token, { expectedSlug: "jane-smith-cfp" });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.professionalId).toBe(42);
      expect(result.slug).toBe("jane-smith-cfp");
    }
  });

  it("normalises slug to lowercase + trims when signing", () => {
    const token = signAdvisorEmbedToken({ professionalId: 7, slug: "  Jane-Smith-CFP  " });
    const result = verifyAdvisorEmbedToken(token, { expectedSlug: "jane-smith-cfp" });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.slug).toBe("jane-smith-cfp");
  });

  it("rejects a missing token", () => {
    expect(verifyAdvisorEmbedToken(undefined)).toEqual({ ok: false, reason: "missing" });
    expect(verifyAdvisorEmbedToken(null)).toEqual({ ok: false, reason: "missing" });
    expect(verifyAdvisorEmbedToken("")).toEqual({ ok: false, reason: "missing" });
  });

  it("rejects a malformed token (wrong part count)", () => {
    expect(verifyAdvisorEmbedToken("garbage")).toEqual({ ok: false, reason: "malformed" });
    expect(verifyAdvisorEmbedToken("a.b.c.d")).toEqual({ ok: false, reason: "malformed" });
  });

  it("rejects a wrong prefix", () => {
    const token = signAdvisorEmbedToken({ professionalId: 1, slug: "x" });
    const tampered = token.replace(ADVISOR_EMBED_TOKEN_PREFIX, "aet9");
    expect(verifyAdvisorEmbedToken(tampered)).toEqual({ ok: false, reason: "malformed" });
  });

  it("rejects a tampered signature (constant-time compare)", () => {
    const token = signAdvisorEmbedToken({ professionalId: 1, slug: "x" });
    const parts = token.split(".");
    // Flip the last char of the HMAC segment.
    const sig = parts[2]!;
    const flipped = sig.slice(0, -1) + (sig.endsWith("A") ? "B" : "A");
    const tampered = `${parts[0]}.${parts[1]}.${flipped}`;
    const result = verifyAdvisorEmbedToken(tampered);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("bad_signature");
  });

  it("rejects a token whose payload was swapped (signature no longer matches)", () => {
    const a = signAdvisorEmbedToken({ professionalId: 1, slug: "alice" });
    const b = signAdvisorEmbedToken({ professionalId: 2, slug: "bob" });
    // Splice alice's payload onto bob's signature.
    const spliced = `${a.split(".")[0]}.${a.split(".")[1]}.${b.split(".")[2]}`;
    const result = verifyAdvisorEmbedToken(spliced);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("bad_signature");
  });

  it("rejects a slug mismatch (token minted for A cannot be replayed against B)", () => {
    const token = signAdvisorEmbedToken({ professionalId: 1, slug: "advisor-a" });
    const result = verifyAdvisorEmbedToken(token, { expectedSlug: "advisor-b" });
    expect(result).toEqual({ ok: false, reason: "slug_mismatch" });
  });

  it("derives a key from the service-role key when no dedicated secret is set", () => {
    delete process.env.ADVISOR_EMBED_TOKEN_SECRET;
    process.env.SUPABASE_SERVICE_ROLE_KEY = TEST_SECRET;
    expect(advisorEmbedSigningAvailable()).toBe(true);
    const token = signAdvisorEmbedToken({ professionalId: 5, slug: "derived" });
    const result = verifyAdvisorEmbedToken(token, { expectedSlug: "derived" });
    expect(result.ok).toBe(true);
  });

  it("rotating the dedicated secret invalidates existing tokens (platform-wide revocation)", () => {
    const token = signAdvisorEmbedToken({ professionalId: 5, slug: "rotated" });
    process.env.ADVISOR_EMBED_TOKEN_SECRET = "ffffffffffffffffffffffffffffffffffffffffffffffff";
    const result = verifyAdvisorEmbedToken(token, { expectedSlug: "rotated" });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("bad_signature");
  });

  it("refuses to sign and reports unavailable with no secret present", () => {
    delete process.env.ADVISOR_EMBED_TOKEN_SECRET;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(advisorEmbedSigningAvailable()).toBe(false);
    expect(() => signAdvisorEmbedToken({ professionalId: 1, slug: "x" })).toThrow();
    expect(verifyAdvisorEmbedToken("aet1.x.y")).toEqual({ ok: false, reason: "no_secret" });
  });
});
