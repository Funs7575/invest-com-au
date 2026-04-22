import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { requireCronAuth } from "@/lib/cron-auth";

/**
 * requireCronAuth is the single gate on every /api/cron/* route.
 * A regression here exposes every cron to public execution, so the
 * invariants are worth locking in tests even though the function is
 * only ~20 lines of logic.
 */

function makeReq(headers: Record<string, string> = {}) {
  return {
    headers: {
      get(name: string): string | null {
        const lower = name.toLowerCase();
        for (const [k, v] of Object.entries(headers)) {
          if (k.toLowerCase() === lower) return v;
        }
        return null;
      },
    },
  };
}

const GOOD_SECRET = "a".repeat(16); // 16+ chars required

describe("requireCronAuth", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    process.env.CRON_SECRET = GOOD_SECRET;
  });

  afterEach(() => {
    if (originalSecret === undefined) delete process.env.CRON_SECRET;
    else process.env.CRON_SECRET = originalSecret;
  });

  it("returns null (authorised) when the Bearer token matches CRON_SECRET exactly", () => {
    const result = requireCronAuth(
      makeReq({ authorization: `Bearer ${GOOD_SECRET}` }),
    );
    expect(result).toBeNull();
  });

  it("returns 401 when the Bearer token is wrong", async () => {
    const result = requireCronAuth(
      makeReq({ authorization: "Bearer wrong-secret-wrong-secret" }),
    );
    expect(result).not.toBeNull();
    expect(result!.status).toBe(401);
    const json = await result!.json();
    expect(json).toEqual({ error: "Unauthorized" });
  });

  it("returns 401 when the authorization header is missing entirely", async () => {
    const result = requireCronAuth(makeReq({}));
    expect(result!.status).toBe(401);
    const json = await result!.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 401 when the header has a matching secret but a wrong scheme (Basic vs Bearer)", async () => {
    const result = requireCronAuth(
      makeReq({ authorization: `Basic ${GOOD_SECRET}` }),
    );
    expect(result!.status).toBe(401);
  });

  it("returns 401 when the header is the literal 'Bearer ' prefix with no secret", async () => {
    const result = requireCronAuth(makeReq({ authorization: "Bearer " }));
    expect(result!.status).toBe(401);
  });

  it("fail-closes with 500 when CRON_SECRET is unset (misconfiguration, not an auth failure)", async () => {
    delete process.env.CRON_SECRET;
    const result = requireCronAuth(
      makeReq({ authorization: `Bearer ${GOOD_SECRET}` }),
    );
    expect(result!.status).toBe(500);
    const json = await result!.json();
    expect(json).toEqual({ error: "Cron endpoint misconfigured" });
  });

  it("fail-closes with 500 when CRON_SECRET is empty-string", async () => {
    process.env.CRON_SECRET = "";
    const result = requireCronAuth(
      makeReq({ authorization: "Bearer " }),
    );
    expect(result!.status).toBe(500);
  });

  it("fail-closes with 500 when CRON_SECRET is shorter than the 16-char floor", async () => {
    // The 16-char floor guards against the operator setting a weak
    // secret — not strictly a format check, a policy check.
    process.env.CRON_SECRET = "short15charsxxx"; // 15 chars
    const result = requireCronAuth(
      makeReq({ authorization: "Bearer short15charsxxx" }),
    );
    expect(result!.status).toBe(500);
  });

  it("accepts the exact 16-char boundary (floor is >=16, not >16)", () => {
    const boundary = "z".repeat(16);
    process.env.CRON_SECRET = boundary;
    const result = requireCronAuth(
      makeReq({ authorization: `Bearer ${boundary}` }),
    );
    expect(result).toBeNull();
  });

  it("length mismatch is rejected fast (safeEqual early-returns on len diff)", async () => {
    // Can't observe 'fast' from outside, but the contract is: a
    // length-mismatched header still returns 401, never a crash.
    const result = requireCronAuth(
      makeReq({ authorization: "Bearer tiny" }),
    );
    expect(result!.status).toBe(401);
  });

  it("is case-sensitive on the header value (safeEqual is exact byte compare)", async () => {
    // GOOD_SECRET is lowercase 'a's; uppercase should not match.
    const result = requireCronAuth(
      makeReq({ authorization: `Bearer ${"A".repeat(16)}` }),
    );
    expect(result!.status).toBe(401);
  });
});
