/**
 * UX-unification (2026-06): /invest?category=<slug> collapses onto the
 * canonical /invest/<slug>/listings page so each sector has ONE URL.
 * These tests exercise that redirect in proxy.ts.
 */
import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@supabase/ssr", () => ({ createServerClient: vi.fn() }));
vi.mock("@/lib/admin-mfa-cookie-edge", () => ({
  verifyMfaCookieEdge: vi.fn().mockResolvedValue(false),
  MFA_COOKIE_NAME: "admin_mfa_verified",
}));

async function run(url: string) {
  const { proxy } = await import("@/proxy");
  return proxy(new NextRequest(url));
}

describe("proxy.ts — /invest?category= canonicalisation", () => {
  it("307-redirects a static-page sector to its canonical listings page", async () => {
    const res = await run("https://invest.com.au/invest?category=mining");
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "https://invest.com.au/invest/mining/listings",
    );
  });

  it("redirects a generic-route sector (no bespoke page) too", async () => {
    const res = await run("https://invest.com.au/invest?category=bullion");
    expect(res.status).toBe(307);
    expect(new URL(res.headers.get("location")!).pathname).toBe(
      "/invest/bullion/listings",
    );
  });

  it("preserves other filter params and drops the category param", async () => {
    const res = await run(
      "https://invest.com.au/invest?category=mining&state=WA&sub=lithium",
    );
    const loc = new URL(res.headers.get("location")!);
    expect(loc.pathname).toBe("/invest/mining/listings");
    expect(loc.searchParams.get("state")).toBe("WA");
    expect(loc.searchParams.get("sub")).toBe("lithium");
    expect(loc.searchParams.get("category")).toBeNull();
  });

  it("does NOT redirect category=all (the unfiltered marketplace)", async () => {
    const res = await run("https://invest.com.au/invest?category=all");
    expect(res.status).not.toBe(307);
  });

  it("does NOT redirect a non-opportunity category (e.g. a guide slug)", async () => {
    const res = await run("https://invest.com.au/invest?category=gold");
    expect(res.status).not.toBe(307);
  });

  it("does NOT redirect /invest with no category param", async () => {
    const res = await run("https://invest.com.au/invest");
    expect(res.status).not.toBe(307);
  });
});
