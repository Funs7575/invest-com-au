import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// FIN_NOTEBOOK item 19 — API route coverage push.
// Targets the new admin-only AI advisor draft generator.

const { mockRequireAdmin, mockCreate } = vi.hoisted(() => ({
  mockRequireAdmin: vi.fn(),
  mockCreate: vi.fn(),
}));

vi.mock("@/lib/require-admin", () => ({
  requireAdmin: () => mockRequireAdmin(),
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class Anthropic {
    messages = { create: (...args: unknown[]) => mockCreate(...args) };
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

import { POST } from "@/app/api/admin/advisors/draft-profile/route";

function makeReq(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/advisors/draft-profile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  mockRequireAdmin.mockReset();
  mockCreate.mockReset();
  vi.stubEnv("ANTHROPIC_API_KEY", "test-key");
});

describe("admin-advisor-draft-profile POST", () => {
  it("returns 401 when admin guard denies", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ ok: false, response: new Response("nope", { status: 401 }) });
    const res = await POST(makeReq({ name: "X", type: "fp", background: "x".repeat(30) }));
    expect(res.status).toBe(401);
  });

  it("returns 503 when ANTHROPIC_API_KEY missing", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ ok: true, email: "a@b.c", userId: "u1" });
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    const res = await POST(makeReq({ name: "X", type: "fp", background: "x".repeat(30) }));
    expect(res.status).toBe(503);
  });

  it("rejects body that fails Zod (background too short)", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ ok: true, email: "a@b.c", userId: "u1" });
    const res = await POST(makeReq({ name: "X", type: "fp", background: "short" }));
    expect(res.status).toBe(400);
  });

  it("returns 502 when AI returns non-JSON text", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ ok: true, email: "a@b.c", userId: "u1" });
    mockCreate.mockResolvedValueOnce({
      content: [{ type: "text", text: "not json" }],
    });
    const res = await POST(makeReq({ name: "Sarah Chen", type: "financial_planner", background: "20 yrs financial planning experience in Sydney" }));
    expect(res.status).toBe(502);
  });

  it("returns parsed draft on happy path", async () => {
    mockRequireAdmin.mockResolvedValueOnce({ ok: true, email: "a@b.c", userId: "u1" });
    mockCreate.mockResolvedValueOnce({
      content: [
        {
          type: "text",
          text: JSON.stringify({
            bio: "Sarah is a CFP based in Sydney with 20 years of experience.",
            specialties: ["Financial Planner"],
            service_lines: ["super-consolidation"],
            tagline: "Sydney CFP focused on long-horizon retirement planning",
            flags: ["AUM figure not verifiable from input"],
          }),
        },
      ],
    });
    const res = await POST(makeReq({ name: "Sarah Chen", type: "financial_planner", background: "20 yrs financial planning experience in Sydney" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as { draft: { bio: string; flags: string[] } };
    expect(body.draft.bio).toContain("Sarah");
    expect(body.draft.flags).toHaveLength(1);
  });
});
