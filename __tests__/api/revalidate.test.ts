import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockRevalidatePath = vi.fn();
const mockRevalidateTag = vi.fn();

vi.mock("next/cache", () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args),
  revalidateTag: (...args: unknown[]) => mockRevalidateTag(...args),
}));

import { POST } from "@/app/api/revalidate/route";

// ── Helpers ────────────────────────────────────────────────────────────────────

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/revalidate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("POST /api/revalidate", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.REVALIDATE_SECRET = "super-secret";
  });

  it("returns 401 when secret is missing", async () => {
    const res = await POST(makePost({ paths: ["/broker/stake"] }));
    expect(res.status).toBe(401);
    const json = await res.json();
    expect(json.error).toMatch(/invalid secret/i);
  });

  it("returns 401 when secret is wrong", async () => {
    const res = await POST(makePost({ secret: "wrong", paths: ["/broker/stake"] }));
    expect(res.status).toBe(401);
  });

  it("revalidates specified paths and returns them", async () => {
    const res = await POST(makePost({
      secret: "super-secret",
      paths: ["/broker/stake", "/compare"],
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.revalidated).toContain("/broker/stake");
    expect(json.revalidated).toContain("/compare");
    expect(json.count).toBe(2);
    expect(mockRevalidatePath).toHaveBeenCalledWith("/broker/stake");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/compare");
  });

  it("revalidates tags and includes them in response with tag: prefix", async () => {
    const res = await POST(makePost({
      secret: "super-secret",
      tags: ["broker-fees", "compare-data"],
    }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.revalidated).toContain("tag:broker-fees");
    expect(mockRevalidateTag).toHaveBeenCalledWith("broker-fees", "default");
  });

  it("skips paths not starting with /", async () => {
    const res = await POST(makePost({
      secret: "super-secret",
      paths: ["/valid", "no-leading-slash"],
    }));
    const json = await res.json();
    expect(json.revalidated).toContain("/valid");
    expect(json.revalidated).not.toContain("no-leading-slash");
  });

  it("caps paths at 20 per call", async () => {
    const paths = Array.from({ length: 25 }, (_, i) => `/broker/b${i}`);
    const res = await POST(makePost({ secret: "super-secret", paths }));
    const json = await res.json();
    expect(json.count).toBe(20);
    expect(mockRevalidatePath).toHaveBeenCalledTimes(20);
  });

  it("caps tags at 10 per call", async () => {
    const tags = Array.from({ length: 15 }, (_, i) => `tag${i}`);
    const res = await POST(makePost({ secret: "super-secret", tags }));
    await res.json();
    expect(mockRevalidateTag).toHaveBeenCalledTimes(10);
  });

  it("revalidates all important pages when all=true", async () => {
    const res = await POST(makePost({ secret: "super-secret", all: true }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.revalidated).toContain("/");
    expect(json.revalidated).toContain("/compare");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/");
    expect(mockRevalidatePath).toHaveBeenCalledWith("/compare");
  });

  it("returns 500 on invalid JSON body", async () => {
    const req = new NextRequest("http://localhost/api/revalidate", {
      method: "POST",
      body: "not-json",
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});
