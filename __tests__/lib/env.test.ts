import { describe, it, expect, vi } from "vitest";

/**
 * lib/env.ts eagerly calls requireEnv at module load for
 * NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, and
 * lazily for the server.* getters. We can't test the eager-import
 * path (module is already loaded by the test runner with valid env
 * from vitest.setup.ts), but we can test the server.* getters +
 * NEXT_PUBLIC_SITE_URL fallback.
 */

describe("NEXT_PUBLIC_SITE_URL fallback", () => {
  it("defaults to https://invest.com.au when the env var is unset", async () => {
    const original = process.env.NEXT_PUBLIC_SITE_URL;
    delete process.env.NEXT_PUBLIC_SITE_URL;

    // Reset module registry so the module re-evaluates with the
    // new env state.
    // Ensure the eager-load requireEnv calls don't fail
    process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";
    vi.resetModules();
    const mod = await import("@/lib/env");
    expect(mod.NEXT_PUBLIC_SITE_URL).toBe("https://invest.com.au");

    if (original !== undefined) process.env.NEXT_PUBLIC_SITE_URL = original;
  });

  it("honours the env var override when set", async () => {
    const original = process.env.NEXT_PUBLIC_SITE_URL;
    process.env.NEXT_PUBLIC_SITE_URL = "https://preview.example.com";

    // Ensure the eager-load requireEnv calls don't fail
    process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";
    vi.resetModules();
    const mod = await import("@/lib/env");
    expect(mod.NEXT_PUBLIC_SITE_URL).toBe("https://preview.example.com");

    if (original !== undefined) process.env.NEXT_PUBLIC_SITE_URL = original;
    else delete process.env.NEXT_PUBLIC_SITE_URL;
  });
});

describe("server-only getters", () => {
  it("server.RESEND_API_KEY returns the env var (empty string when unset)", async () => {
    const original = process.env.RESEND_API_KEY;
    process.env.RESEND_API_KEY = "";

    // Ensure the eager-load requireEnv calls don't fail
    process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";
    vi.resetModules();
    const mod = await import("@/lib/env");
    expect(mod.server.RESEND_API_KEY).toBe("");

    process.env.RESEND_API_KEY = "rk_test";
    expect(mod.server.RESEND_API_KEY).toBe("rk_test");

    if (original !== undefined) process.env.RESEND_API_KEY = original;
    else delete process.env.RESEND_API_KEY;
  });

  it("server.GA_MEASUREMENT_ID returns the env var or empty string", async () => {
    const original = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
    delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

    // Ensure the eager-load requireEnv calls don't fail
    process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";
    vi.resetModules();
    const mod = await import("@/lib/env");
    expect(mod.server.GA_MEASUREMENT_ID).toBe("");

    process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = "G-TEST123";
    expect(mod.server.GA_MEASUREMENT_ID).toBe("G-TEST123");

    if (original !== undefined) process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID = original;
    else delete process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
  });

  it("server.SUPABASE_SERVICE_ROLE_KEY throws when missing", async () => {
    const original = process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;

    // Ensure the eager-load requireEnv calls don't fail
    process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";
    vi.resetModules();
    const mod = await import("@/lib/env");
    expect(() => mod.server.SUPABASE_SERVICE_ROLE_KEY).toThrow(/SUPABASE_SERVICE_ROLE_KEY/);

    if (original !== undefined) process.env.SUPABASE_SERVICE_ROLE_KEY = original;
  });

  it("server.STRIPE_SECRET_KEY throws when missing", async () => {
    const original = process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_SECRET_KEY;

    // Ensure the eager-load requireEnv calls don't fail
    process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";
    vi.resetModules();
    const mod = await import("@/lib/env");
    expect(() => mod.server.STRIPE_SECRET_KEY).toThrow(/STRIPE_SECRET_KEY/);

    if (original !== undefined) process.env.STRIPE_SECRET_KEY = original;
  });

  it("server.IP_HASH_SALT throws when missing", async () => {
    const original = process.env.IP_HASH_SALT;
    delete process.env.IP_HASH_SALT;

    // Ensure the eager-load requireEnv calls don't fail
    process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://test.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";
    vi.resetModules();
    const mod = await import("@/lib/env");
    expect(() => mod.server.IP_HASH_SALT).toThrow(/IP_HASH_SALT/);

    if (original !== undefined) process.env.IP_HASH_SALT = original;
  });
});
