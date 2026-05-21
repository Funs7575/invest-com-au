import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

function makeBuilder(result: unknown = { data: [], error: null }) {
  const builder: Record<string, unknown> = {};
  for (const m of [
    "select", "insert", "update", "upsert", "delete",
    "eq", "neq", "gt", "gte", "lt", "lte", "in", "is", "not", "or",
    "order", "limit", "range", "single", "maybeSingle", "filter",
  ]) {
    builder[m] = vi.fn(() => builder);
  }
  builder.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return builder;
}

const mockFrom = vi.fn(() => makeBuilder());

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn(async () => ({
        content: [{ type: "text", text: '{"title":"A vs B: Side-by-Side Comparison","meta_description":"A meta desc that is between 120 and 160 characters long for testing purposes only here.","intro":"This is the intro text for the comparison of A and B. It has more than 40 characters.","choose_a":"Choose A if you want lower fees.","choose_b":"Choose B if you want more features.","sections":[{"heading":"Fees","body":"A charges less."},{"heading":"Features","body":"B has more."}],"verdict":"Both are good options for Australian investors.","faqs":[{"question":"Q1?","answer":"A1 answer."},{"question":"Q2?","answer":"A2 answer."}]}' }],
      })),
    },
  })),
}));

vi.mock("@/lib/versus-pairs", () => ({
  generateVersusPairs: vi.fn(() => []),
}));

import { GET, maxDuration } from "@/app/api/cron/versus-editorial-backfill/route";

const SECRET = "test-cron-secret-1234567890";

function makeRequest(search = "") {
  const url = `http://localhost/api/cron/versus-editorial-backfill${search}`;
  return {
    method: "GET",
    url,
    headers: new Headers({ authorization: `Bearer ${SECRET}` }),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

function makeRequestBadAuth() {
  const url = "http://localhost/api/cron/versus-editorial-backfill";
  return {
    method: "GET",
    url,
    headers: new Headers({ authorization: "Bearer wrong" }),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

function makeRequestNoSecret() {
  const url = "http://localhost/api/cron/versus-editorial-backfill";
  return {
    method: "GET",
    url,
    headers: new Headers({ authorization: `Bearer ${SECRET}` }),
    nextUrl: new URL(url),
  } as unknown as NextRequest;
}

describe("GET /api/cron/versus-editorial-backfill", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = SECRET;
    process.env.ANTHROPIC_API_KEY = "test-anthropic-key";
    // Default: no brokers, no pairs
    mockFrom.mockImplementation(() => makeBuilder({ data: [], error: null }));
  });
  afterEach(() => {
    delete process.env.CRON_SECRET;
    delete process.env.ANTHROPIC_API_KEY;
  });

  it("exports maxDuration", () => {
    expect(maxDuration).toBe(300);
  });

  it("returns 500 when CRON_SECRET is unset", async () => {
    delete process.env.CRON_SECRET;
    const res = await GET(makeRequestNoSecret());
    expect(res.status).toBe(500);
  });

  it("returns 401 on wrong bearer", async () => {
    const res = await GET(makeRequestBadAuth());
    expect(res.status).toBe(401);
  });

  it("returns 503 when ANTHROPIC_API_KEY is missing", async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const res = await GET(makeRequest());
    expect(res.status).toBe(503);
  });

  it("returns 200 with generated:0 when no pairs are missing", async () => {
    const res = await GET(makeRequest());
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.generated).toBe(0);
  });
});
