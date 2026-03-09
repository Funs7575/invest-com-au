import { vi } from "vitest";
import { NextRequest } from "next/server";

/**
 * Create a POST NextRequest with JSON body and standard headers.
 */
export function makeRequest(
  path: string,
  body: Record<string, unknown>,
  options: { ip?: string; method?: string; headers?: Record<string, string> } = {}
): NextRequest {
  const { ip = "4.5.6.7", method = "POST", headers = {} } = options;
  return new NextRequest(`http://localhost${path}`, {
    method,
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      "x-forwarded-for": ip,
      "user-agent": "Mozilla/5.0 Test",
      ...headers,
    },
  });
}

/**
 * Create a GET NextRequest with CRON_SECRET authorization header.
 */
export function makeCronRequest(path: string): NextRequest {
  return new NextRequest(`http://localhost${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${process.env.CRON_SECRET || "test-cron-secret"}`,
    },
  });
}

/**
 * Reusable Supabase mock builder that tracks calls per table.
 */
export function createChainableBuilder(
  tableName: string,
  callTracker?: Record<string, { method: string; args: unknown[] }[]>
) {
  const calls = callTracker ? (callTracker[tableName] = callTracker[tableName] || []) : [];

  const builder: Record<string, ReturnType<typeof vi.fn>> = {};

  const chainMethods = [
    "select", "insert", "upsert", "update", "delete",
    "eq", "neq", "order", "limit", "gte", "lte", "in", "gt", "lt",
  ];

  for (const method of chainMethods) {
    builder[method] = vi.fn((...args: unknown[]) => {
      calls.push({ method, args });
      return builder;
    });
  }

  builder.single = vi.fn(() => {
    calls.push({ method: "single", args: [] });
    return Promise.resolve({ data: null, error: null });
  });

  builder.maybeSingle = vi.fn(() => {
    calls.push({ method: "maybeSingle", args: [] });
    return Promise.resolve({ data: null, error: null });
  });

  // Support awaiting the builder directly (for delete with count, etc.)
  builder.then = vi.fn((cb: (v: { data: null; error: null; count: number }) => void) => {
    cb({ data: null, error: null, count: 0 });
    return Promise.resolve();
  });

  return builder;
}

/**
 * Create a mock broker object with sensible defaults.
 */
export function makeBroker(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    name: "Test Broker",
    slug: "test-broker",
    color: "#000000",
    platform_type: "share_broker",
    status: "active",
    fee_source_url: null,
    fee_page_hash: null,
    asx_fee: null,
    us_fee: null,
    fx_rate: null,
    inactivity_fee: null,
    ...overrides,
  };
}
