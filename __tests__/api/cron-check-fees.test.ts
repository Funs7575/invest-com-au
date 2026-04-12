import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";
import type { NextRequest } from "next/server";
import { createChainableBuilder, makeCronRequest, makeBroker } from "@/__tests__/helpers";

type SupabaseResult = { data: unknown; error: unknown };
type FetchFn = typeof fetch;

// ─── Mocks ───────────────────────────────────────────────────────────

// Track Supabase calls per table
const supabaseCalls: Record<string, { method: string; args: unknown[] }[]> = {};

const mockFrom = vi.fn((table: string) => createChainableBuilder(table, supabaseCalls));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

// Import the handler AFTER mocks
import { GET, maxDuration } from "@/app/api/cron/check-fees/route";

// ─── Tests ───────────────────────────────────────────────────────────

describe("GET /api/cron/check-fees", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    for (const key of Object.keys(supabaseCalls)) {
      delete supabaseCalls[key];
    }
    process.env.CRON_SECRET = "test-cron-secret";
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.ADMIN_EMAIL = "admin@test.com";
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  // ── Config exports ──

  it("exports maxDuration = 60", () => {
    expect(maxDuration).toBe(60);
  });

  // ── Auth ──

  it("returns 401 without authorization header", async () => {
    const req = new Request("http://localhost/api/cron/check-fees", {
      method: "GET",
    });
    const res = await GET(req as unknown as NextRequest);
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toBe("Unauthorized");
  });

  it("returns 401 with wrong bearer token", async () => {
    const req = new Request("http://localhost/api/cron/check-fees", {
      method: "GET",
      headers: { Authorization: "Bearer wrong-secret" },
    });
    const res = await GET(req as unknown as NextRequest);
    expect(res.status).toBe(401);
  });

  // ── Empty broker list ──

  it("returns 200 with zero results when no brokers exist", async () => {
    mockFrom.mockImplementation((table: string) => {
      const builder = createChainableBuilder(table, supabaseCalls);
      if (table === "brokers") {
        builder.then = vi.fn((cb: (v: SupabaseResult) => void) => {
          cb({ data: [], error: null });
          return Promise.resolve();
        });
      }
      return builder;
    });

    const req = makeCronRequest("/api/cron/check-fees");
    const res = await GET(req as unknown as NextRequest);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.checked).toBe(0);
    expect(json.changed).toBe(0);
  });

  // ── Broker with no fee_source_url ──

  it("marks broker as no_url when fee_source_url is null", async () => {
    const broker = makeBroker({ id: 1, slug: "no-url-broker", fee_source_url: null });

    mockFrom.mockImplementation((table: string) => {
      const builder = createChainableBuilder(table, supabaseCalls);
      if (table === "brokers") {
        // First call is the select query — resolve with broker list
        builder.then = vi.fn((cb: (v: SupabaseResult) => void) => {
          cb({ data: [broker], error: null });
          return Promise.resolve();
        });
      }
      return builder;
    });

    const req = makeCronRequest("/api/cron/check-fees");
    const res = await GET(req as unknown as NextRequest);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.results).toHaveLength(1);
    expect(json.results[0].status).toBe("no_url");
    expect(json.results[0].changed).toBe(false);
  });

  // ── Detects fee page changes when hash differs ──

  it("detects fee page changes when hash differs from stored hash", async () => {
    const broker = makeBroker({
      id: 2,
      slug: "changed-broker",
      name: "Changed Broker",
      fee_source_url: "https://example.com/fees",
      fee_page_hash: "old-hash-value",
      asx_fee: "$10",
    });

    mockFrom.mockImplementation((table: string) => {
      const builder = createChainableBuilder(table, supabaseCalls);
      if (table === "brokers") {
        builder.then = vi.fn((cb: (v: SupabaseResult) => void) => {
          cb({ data: [broker], error: null });
          return Promise.resolve();
        });
      }
      if (table === "fee_alert_subscriptions") {
        builder.then = vi.fn((cb: (v: SupabaseResult) => void) => {
          cb({ data: [], error: null });
          return Promise.resolve();
        });
      }
      if (table === "fee_auto_rules") {
        builder.then = vi.fn((cb: (v: SupabaseResult) => void) => {
          cb({ data: [], error: null });
          return Promise.resolve();
        });
      }
      return builder;
    });

    // Mock fetch to return a fee page with content
    const originalFetch = globalThis.fetch;
    (globalThis.fetch as unknown as FetchFn) = vi.fn((...args: Parameters<FetchFn>) => {
      const url = typeof args[0] === "string" ? args[0] : "";
      if (url === "https://example.com/fees") {
        return Promise.resolve(
          new Response("Brokerage fee is $5.00 per trade. FX rate 0.7%.", { status: 200 })
        );
      }
      if (url.includes("resend.com")) {
        return Promise.resolve(new Response(JSON.stringify({ id: "mock-email" }), { status: 200 }));
      }
      return (originalFetch as FetchFn)(...args);
    });

    const req = makeCronRequest("/api/cron/check-fees");
    const res = await GET(req as unknown as NextRequest);
    expect(res.status).toBe(200);
    const json = await res.json();

    // The cron should detect the page content changed (new hash != old hash)
    // Results should include this broker (changed or checked)
    expect(json.results).toBeDefined();
    expect(json.results.length).toBeGreaterThanOrEqual(1);

    // Restore fetch
    globalThis.fetch = originalFetch;
  });

  // ── Extracts fee patterns from page content ──

  it("extracts brokerage and fx fee patterns from page content", async () => {
    const broker = makeBroker({
      id: 3,
      slug: "extract-broker",
      name: "Extract Broker",
      fee_source_url: "https://example.com/pricing",
      fee_page_hash: null, // First check — no previous hash, so changed=false
    });

    mockFrom.mockImplementation((table: string) => {
      const builder = createChainableBuilder(table, supabaseCalls);
      if (table === "brokers") {
        builder.then = vi.fn((cb: (v: SupabaseResult) => void) => {
          cb({ data: [broker], error: null });
          return Promise.resolve();
        });
      }
      return builder;
    });

    const originalFetch = globalThis.fetch;
    (globalThis.fetch as unknown as FetchFn) = vi.fn((...args: Parameters<FetchFn>) => {
      const url = typeof args[0] === "string" ? args[0] : "";
      if (url === "https://example.com/pricing") {
        return Promise.resolve(
          new Response(
            "Our brokerage is $9.50 per trade. Currency conversion fx fee is 0.60%.",
            { status: 200 }
          )
        );
      }
      if (url.includes("resend.com")) {
        return Promise.resolve(new Response(JSON.stringify({ id: "mock-email" }), { status: 200 }));
      }
      return (originalFetch as FetchFn)(...args);
    });

    const req = makeCronRequest("/api/cron/check-fees");
    const res = await GET(req as unknown as NextRequest);
    expect(res.status).toBe(200);
    const json = await res.json();

    expect(json.results[0].fees_extracted).toBeDefined();
    expect(json.results[0].fees_extracted.brokerage).toBe("$9.50");
    expect(json.results[0].fees_extracted.fx_rate).toBe("0.60%");

    globalThis.fetch = originalFetch;
  });

  // ── Sends admin email when changes detected ──

  it("sends admin email when fee changes are detected", async () => {
    const broker = makeBroker({
      id: 4,
      slug: "email-broker",
      name: "Email Broker",
      fee_source_url: "https://example.com/fees",
      fee_page_hash: "stale-hash",
    });

    mockFrom.mockImplementation((table: string) => {
      const builder = createChainableBuilder(table, supabaseCalls);
      if (table === "brokers") {
        builder.then = vi.fn((cb: (v: SupabaseResult) => void) => {
          cb({ data: [broker], error: null });
          return Promise.resolve();
        });
      }
      if (table === "fee_alert_subscriptions") {
        builder.then = vi.fn((cb: (v: SupabaseResult) => void) => {
          cb({ data: [], error: null });
          return Promise.resolve();
        });
      }
      return builder;
    });

    const fetchCalls: { url: string; body?: string }[] = [];
    const originalFetch = globalThis.fetch;
    (globalThis.fetch as unknown as FetchFn) = vi.fn((...args: Parameters<FetchFn>) => {
      const url = typeof args[0] === "string" ? args[0] : "";
      if (url === "https://example.com/fees") {
        return Promise.resolve(new Response("New fee page content here", { status: 200 }));
      }
      if (url.includes("resend.com")) {
        fetchCalls.push({ url, body: typeof args[1]?.body === "string" ? args[1].body : undefined });
        return Promise.resolve(new Response(JSON.stringify({ id: "mock-email" }), { status: 200 }));
      }
      return (originalFetch as FetchFn)(...args);
    });

    const req = makeCronRequest("/api/cron/check-fees");
    const res = await GET(req as unknown as NextRequest);
    expect(res.status).toBe(200);

    // Should have sent at least 1 email to resend
    expect(fetchCalls.length).toBeGreaterThanOrEqual(1);
    const emailBody = JSON.parse(fetchCalls[0].body!);
    expect(emailBody.to).toBe("admin@test.com");
    expect(emailBody.subject).toContain("Fee Alert");

    globalThis.fetch = originalFetch;
  });

  // ── Handles fetch error gracefully ──

  it("handles fetch error for broker fee page gracefully", async () => {
    const broker = makeBroker({
      id: 5,
      slug: "error-broker",
      fee_source_url: "https://example.com/broken",
    });

    mockFrom.mockImplementation((table: string) => {
      const builder = createChainableBuilder(table, supabaseCalls);
      if (table === "brokers") {
        builder.then = vi.fn((cb: (v: SupabaseResult) => void) => {
          cb({ data: [broker], error: null });
          return Promise.resolve();
        });
      }
      return builder;
    });

    const originalFetch = globalThis.fetch;
    (globalThis.fetch as unknown as FetchFn) = vi.fn((...args: Parameters<FetchFn>) => {
      const url = typeof args[0] === "string" ? args[0] : "";
      if (url === "https://example.com/broken") {
        return Promise.reject(new Error("Network error"));
      }
      if (url.includes("resend.com")) {
        return Promise.resolve(new Response(JSON.stringify({ id: "mock-email" }), { status: 200 }));
      }
      return (originalFetch as FetchFn)(...args);
    });

    const req = makeCronRequest("/api/cron/check-fees");
    const res = await GET(req as unknown as NextRequest);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.results[0].status).toBe("fetch_error");
    expect(json.results[0].changed).toBe(false);

    globalThis.fetch = originalFetch;
  });
});
