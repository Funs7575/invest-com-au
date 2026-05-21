import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const { mockIsAllowed } = vi.hoisted(() => ({ mockIsAllowed: vi.fn() }));

const mockFrom = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: vi.fn(() => "1.2.3.4"),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })),
}));

import { POST } from "@/app/api/briefs/[slug]/withdraw/route";

const VALID = { contact_email: "owner@example.com" };

function makeReq(body: unknown, raw = false): NextRequest {
  return new NextRequest("http://localhost/api/briefs/b1/withdraw", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: raw ? (body as string) : JSON.stringify(body),
  });
}
const ctx = { params: Promise.resolve({ slug: "b1" }) };

// A chain that is awaitable and whose methods all return the chain.
function makeChain(result: { data?: unknown; error?: unknown }) {
  const chain: Record<string, unknown> = {};
  for (const m of ["select", "eq", "maybeSingle", "update", "insert"]) {
    chain[m] = vi.fn(() => chain);
  }
  (chain as { then: unknown }).then = (resolve: (v: unknown) => unknown) =>
    resolve(result);
  return chain;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockIsAllowed.mockResolvedValue(true);
});

describe("POST /api/briefs/[slug]/withdraw", () => {
  it("429 when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(makeReq(VALID), ctx);
    expect(res.status).toBe(429);
  });

  it("400 on invalid JSON", async () => {
    const res = await POST(makeReq("nope", true), ctx);
    expect(res.status).toBe(400);
  });

  it("400 on schema rejection (bad email)", async () => {
    const res = await POST(makeReq({ contact_email: "not-an-email" }), ctx);
    expect(res.status).toBe(400);
  });

  it("404 when brief not found", async () => {
    mockFrom.mockReturnValue(makeChain({ data: null }));
    const res = await POST(makeReq(VALID), ctx);
    expect(res.status).toBe(404);
  });

  it("403 when email does not match", async () => {
    mockFrom.mockReturnValue(
      makeChain({ data: { id: 1, contact_email: "other@example.com", status: "open" } }),
    );
    const res = await POST(makeReq(VALID), ctx);
    expect(res.status).toBe(403);
  });

  it("400 when brief already closed", async () => {
    mockFrom.mockReturnValue(
      makeChain({ data: { id: 1, contact_email: VALID.contact_email, status: "closed" } }),
    );
    const res = await POST(makeReq(VALID), ctx);
    expect(res.status).toBe(400);
  });

  it("happy path withdraws the brief", async () => {
    // 1st from: select brief; 2nd: update; 3rd: insert tracker event.
    mockFrom
      .mockReturnValueOnce(
        makeChain({ data: { id: 1, contact_email: VALID.contact_email, status: "open" } }),
      )
      .mockReturnValueOnce(makeChain({ error: null }))
      .mockReturnValueOnce(makeChain({ error: null }));
    const res = await POST(makeReq(VALID), ctx);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith("advisor_auctions");
    expect(mockFrom).toHaveBeenCalledWith("brief_tracker_events");
  });

  it("matches email case-insensitively", async () => {
    mockFrom
      .mockReturnValueOnce(
        makeChain({ data: { id: 1, contact_email: "Owner@Example.com", status: "open" } }),
      )
      .mockReturnValueOnce(makeChain({ error: null }))
      .mockReturnValueOnce(makeChain({ error: null }));
    const res = await POST(makeReq({ contact_email: "Owner@Example.com" }), ctx);
    expect(res.status).toBe(200);
  });

  it("500 when query throws", async () => {
    mockFrom.mockImplementation(() => {
      throw new Error("db");
    });
    const res = await POST(makeReq(VALID), ctx);
    expect(res.status).toBe(500);
  });
});
