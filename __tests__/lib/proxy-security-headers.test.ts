/**
 * TT-02: Verify security headers emitted by proxy.ts on every public request.
 *
 * Tests run against a public path so Supabase auth is never invoked;
 * only the header-setting code path is exercised.
 */
import { describe, it, expect, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(),
}));

vi.mock("@/lib/admin-mfa-cookie-edge", () => ({
  verifyMfaCookieEdge: vi.fn().mockResolvedValue(false),
  MFA_COOKIE_NAME: "admin_mfa_verified",
}));

async function getHeaders(pathname = "/") {
  const { proxy } = await import("@/proxy");
  const req = new NextRequest(`https://invest.com.au${pathname}`);
  const res = await proxy(req);
  return res.headers;
}

describe("proxy.ts — security headers (TT-02)", () => {
  it("sets HSTS with preload and includeSubDomains", async () => {
    const headers = await getHeaders();
    const hsts = headers.get("Strict-Transport-Security");
    expect(hsts).toContain("max-age=63072000");
    expect(hsts).toContain("includeSubDomains");
    expect(hsts).toContain("preload");
  });

  it("sets X-Frame-Options to DENY", async () => {
    const headers = await getHeaders();
    expect(headers.get("X-Frame-Options")).toBe("DENY");
  });

  it("sets X-Content-Type-Options to nosniff", async () => {
    const headers = await getHeaders();
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("sets Referrer-Policy", async () => {
    const headers = await getHeaders();
    expect(headers.get("Referrer-Policy")).toBe(
      "strict-origin-when-cross-origin"
    );
  });

  it("sets Cross-Origin-Opener-Policy for Spectre isolation", async () => {
    const headers = await getHeaders();
    expect(headers.get("Cross-Origin-Opener-Policy")).toBe(
      "same-origin-allow-popups"
    );
  });

  it("Permissions-Policy denies high-risk APIs", async () => {
    const headers = await getHeaders();
    const policy = headers.get("Permissions-Policy") ?? "";
    expect(policy).toContain("camera=()");
    expect(policy).toContain("microphone=()");
    expect(policy).toContain("payment=()");
    expect(policy).toContain("usb=()");
    expect(policy).toContain("gyroscope=()");
    expect(policy).toContain("magnetometer=()");
  });

  it("CSP includes PostHog endpoints in connect-src", async () => {
    const headers = await getHeaders();
    const csp = headers.get("Content-Security-Policy") ?? "";
    expect(csp).toContain("eu.i.posthog.com");
    expect(csp).toContain("us.i.posthog.com");
  });

  it("CSP script-src is cache-compatible (self + unsafe-inline + https:, NO nonce/strict-dynamic)", async () => {
    // Regression guard: a per-request nonce with 'strict-dynamic' is
    // incompatible with this site's ISR/SSG caching — cached HTML has no
    // matching nonce, so 'strict-dynamic' shadows 'self'/https: and blocks
    // every script (site-wide JS outage; froze /invest on its skeleton).
    // Do NOT reintroduce nonce/strict-dynamic without per-route hashing.
    const headers = await getHeaders();
    const csp = headers.get("Content-Security-Policy") ?? "";
    const scriptSrc = csp.split(";").find((d) => d.trim().startsWith("script-src")) ?? "";
    expect(scriptSrc).toContain("'self'");
    expect(scriptSrc).toContain("'unsafe-inline'");
    expect(scriptSrc).toContain("https:");
    expect(scriptSrc).not.toContain("strict-dynamic");
    expect(scriptSrc).not.toContain("nonce-");
  });

  it("CSP sets frame-ancestors none to block embedding", async () => {
    const headers = await getHeaders();
    const csp = headers.get("Content-Security-Policy") ?? "";
    expect(csp).toContain("frame-ancestors 'none'");
  });

  it("CSP sets object-src none", async () => {
    const headers = await getHeaders();
    const csp = headers.get("Content-Security-Policy") ?? "";
    expect(csp).toContain("object-src 'none'");
  });

  it("stamps a unique x-request-id on each response", async () => {
    const [h1, h2] = await Promise.all([getHeaders(), getHeaders()]);
    const id1 = h1.get("x-request-id");
    const id2 = h2.get("x-request-id");
    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);
  });

  it("preview deploys get X-Robots-Tag noindex", async () => {
    const original = process.env.VERCEL_ENV;
    process.env.VERCEL_ENV = "preview";
    try {
      const headers = await getHeaders("/");
      expect(headers.get("X-Robots-Tag")).toContain("noindex");
    } finally {
      process.env.VERCEL_ENV = original;
    }
  });
});
