import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockRequireCronAuth, mockRevalidateTag } = vi.hoisted(() => ({
  mockRequireCronAuth: vi.fn(),
  mockRevalidateTag: vi.fn(),
}));

vi.mock("@/lib/cron-auth", () => ({
  requireCronAuth: (req: NextRequest) => mockRequireCronAuth(req),
}));

vi.mock("next/cache", () => ({
  revalidateTag: (...a: unknown[]) => mockRevalidateTag(...a),
}));

import { POST } from "@/app/api/admin/revalidate/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/revalidate", {
    method: "POST",
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.CRON_SECRET || "test-secret"}`,
    },
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/admin/revalidate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRequireCronAuth.mockReturnValue(null); // null = auth passed
  });

  it("returns 401 when cron auth fails", async () => {
    mockRequireCronAuth.mockReturnValueOnce(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    );
    expect((await POST(makePost({ tags: ["brokers"] }))).status).toBe(401);
  });

  it("returns 400 when body is invalid JSON", async () => {
    const req = new NextRequest("http://localhost/api/admin/revalidate", {
      method: "POST",
      body: "not-json",
      headers: { "Content-Type": "application/json" },
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when tags array is missing", async () => {
    const res = await POST(makePost({ notTags: "foo" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when tags array is empty", async () => {
    const res = await POST(makePost({ tags: [] }));
    expect(res.status).toBe(400);
  });

  it("revalidates each tag and returns them in response", async () => {
    const res = await POST(makePost({ tags: ["brokers", "articles"] }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.revalidated).toEqual(["brokers", "articles"]);
    expect(json.timestamp).toBeTruthy();
    expect(mockRevalidateTag).toHaveBeenCalledWith("brokers", { expire: 0 });
    expect(mockRevalidateTag).toHaveBeenCalledWith("articles", { expire: 0 });
  });
});
