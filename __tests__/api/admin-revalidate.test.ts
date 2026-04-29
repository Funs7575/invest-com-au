import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRevalidateTag = vi.fn();
vi.mock("next/cache", () => ({
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { POST } from "@/app/api/admin/revalidate/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const SERVICE_ROLE_KEY = "svc-role-key";
const CRON_SECRET = "cron-secret";

function makePost(body: unknown, authToken?: string): NextRequest {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (authToken !== undefined) {
    headers.authorization = `Bearer ${authToken}`;
  }
  return new NextRequest("http://localhost/api/admin/revalidate", {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/admin/revalidate", () => {
  beforeEach(() => {
    process.env.SUPABASE_SERVICE_ROLE_KEY = SERVICE_ROLE_KEY;
    process.env.CRON_SECRET = CRON_SECRET;
  });
  afterEach(() => {
    vi.resetAllMocks();
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    delete process.env.CRON_SECRET;
  });

  it("returns 401 when no auth header provided", async () => {
    const res = await POST(makePost({ tags: ["brokers"] }));
    expect(res.status).toBe(401);
  });

  it("returns 401 for wrong token", async () => {
    const res = await POST(makePost({ tags: ["brokers"] }, "bad-token"));
    expect(res.status).toBe(401);
  });

  it("accepts SUPABASE_SERVICE_ROLE_KEY as bearer token", async () => {
    const res = await POST(makePost({ tags: ["brokers"] }, SERVICE_ROLE_KEY));
    expect(res.status).toBe(200);
  });

  it("accepts CRON_SECRET as bearer token", async () => {
    const res = await POST(makePost({ tags: ["articles"] }, CRON_SECRET));
    expect(res.status).toBe(200);
  });

  it("returns 400 on invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/admin/revalidate", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      },
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when tags array is empty", async () => {
    const res = await POST(makePost({ tags: [] }, SERVICE_ROLE_KEY));
    expect(res.status).toBe(400);
  });

  it("calls revalidateTag for each tag in the request", async () => {
    const tags = ["brokers", "articles", "broker-reviews"];
    const res = await POST(makePost({ tags }, SERVICE_ROLE_KEY));
    expect(res.status).toBe(200);
    expect(mockRevalidateTag).toHaveBeenCalledTimes(3);
    for (const tag of tags) {
      expect(mockRevalidateTag).toHaveBeenCalledWith(tag, expect.anything());
    }
  });

  it("response includes revalidated tags and timestamp", async () => {
    const tags = ["brokers", "articles"];
    const res = await POST(makePost({ tags }, CRON_SECRET));
    const json = await res.json();
    expect(json.revalidated).toEqual(tags);
    expect(typeof json.timestamp).toBe("string");
    expect(new Date(json.timestamp).getTime()).toBeGreaterThan(0);
  });
});
