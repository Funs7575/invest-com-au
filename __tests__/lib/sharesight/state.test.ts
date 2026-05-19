import { describe, it, expect } from "vitest";
import { signState, verifyState } from "@/lib/sharesight/state";

const SECRET = "test-secret-bytes-1234567890-abcd-efgh";
const UID = "00000000-0000-0000-0000-000000000001";

describe("sharesight signed state", () => {
  it("round-trips a freshly signed state", () => {
    const s = signState(UID, SECRET);
    const v = verifyState(s, SECRET);
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.payload.uid).toBe(UID);
  });

  it("returns missing for undefined / empty input", () => {
    expect(verifyState(undefined, SECRET)).toEqual({ ok: false, reason: "missing" });
    expect(verifyState("", SECRET)).toEqual({ ok: false, reason: "missing" });
  });

  it("returns malformed for non-two-part input", () => {
    expect(verifyState("only-one-part", SECRET)).toEqual({ ok: false, reason: "malformed" });
    expect(verifyState("a.b.c", SECRET)).toEqual({ ok: false, reason: "malformed" });
  });

  it("returns bad_signature when the HMAC doesn't match", () => {
    const s = signState(UID, SECRET);
    const [payloadB64, hmacB64] = s.split(".");
    // Force a deterministic single-byte flip in the HMAC component so we
    // never accidentally swap-for-the-same value (which would round-trip).
    const flipped = hmacB64!.startsWith("A")
      ? "B" + hmacB64!.slice(1)
      : "A" + hmacB64!.slice(1);
    const tampered = `${payloadB64}.${flipped}`;
    const v = verifyState(tampered, SECRET);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe("bad_signature");
  });

  it("returns bad_signature when the wrong secret is used", () => {
    const s = signState(UID, SECRET);
    const v = verifyState(s, "different-secret");
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe("bad_signature");
  });

  it("returns expired after the TTL has passed (15 min default)", () => {
    const past = Date.now() - 16 * 60 * 1000;
    const s = signState(UID, SECRET, past);
    const v = verifyState(s, SECRET);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.reason).toBe("expired");
  });

  it("two signs of the same uid produce different nonces (replay-resistant)", () => {
    const a = signState(UID, SECRET);
    const b = signState(UID, SECRET);
    expect(a).not.toEqual(b);
  });
});
