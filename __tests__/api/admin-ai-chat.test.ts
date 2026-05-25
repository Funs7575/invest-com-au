import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));
vi.mock("@/lib/admin", () => ({
  ADMIN_EMAILS: ["admin@invest.com.au"],
  getAdminEmails: vi.fn(() => ["admin@invest.com.au"]),
}));

function makeBuilder(result: unknown = { data: [], error: null, count: 0 }) {
  const b: Record<string, unknown> = {};
  for (const m of ["select","insert","update","upsert","delete","eq","neq","gt","gte","lt","lte","in","is","not","or","order","limit","range","single","maybeSingle","filter"]) {
    b[m] = vi.fn(() => b);
  }
  b.then = (cb: (v: unknown) => unknown) => Promise.resolve(cb(result));
  return b;
}

const mockFrom = vi.fn(() => makeBuilder());
const mockGetUser = vi.fn();
const mockRpc = vi.fn(() => makeBuilder());

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    from: mockFrom,
    rpc: mockRpc,
    auth: { getUser: mockGetUser },
  })),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom, rpc: mockRpc })),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn(() => ({
    messages: {
      create: vi.fn(async () => ({ content: [{ type: "text", text: "Hello" }] })),
    },
  })),
}));

vi.mock("@/lib/feature-flags", () => ({
  isFlagEnabled: vi.fn(async () => true),
}));

vi.mock("@/lib/ai-cost-caps", () => ({
  loadAdminAgentConfig: vi.fn(() => ({
    label: "admin-ai",
    subjectType: "user",
    perSubjectMicros: 1_000_000,
    globalMicros: 10_000_000,
  })),
  preCheckCaps: vi.fn(async () => ({ allowed: true })),
  recordUsage: vi.fn(async () => ({ crossed80Subject: false, subjectMicros: 0 })),
  capRejectionPayload: vi.fn(() => ({ body: { error: "cap exceeded" }, status: 429, headers: {} })),
}));

vi.mock("@/lib/ai-cost-alerts", () => ({
  sendCap80Alert: vi.fn(async () => {}),
}));

vi.mock("@/lib/compliance", () => ({
  filterFactualOutput: vi.fn(() => ({ ok: true })),
}));

import { POST } from "@/app/api/admin/ai-chat/route";

function makeReq(body?: unknown): NextRequest {
  return new Request("http://localhost/api/admin/ai-chat", {
    method: "POST",
    ...(body !== undefined
      ? { body: JSON.stringify(body), headers: { "content-type": "application/json" } }
      : {}),
  }) as unknown as NextRequest;
}

describe("/api/admin/ai-chat", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", email: "admin@invest.com.au" } },
      error: null,
    });
  });

  it("POST denies unauthenticated user", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(makeReq({ messages: [] }));
    expect(res.status).toBe(401);
  });

  it("POST denies non-admin email", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "u1", email: "notadmin@example.com" } },
      error: null,
    });
    const res = await POST(makeReq({ messages: [] }));
    expect(res.status).toBe(401);
  });

  it("POST returns 503 when ai_generation flag is off", async () => {
    const { isFlagEnabled } = await import("@/lib/feature-flags");
    vi.mocked(isFlagEnabled).mockResolvedValue(false);
    const res = await POST(makeReq({ messages: [] }));
    expect(res.status).toBe(503);
  });
});
