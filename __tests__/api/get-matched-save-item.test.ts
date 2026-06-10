import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockGetPlanById, mockUpdatePlan, mockIsAllowed } = vi.hoisted(() => ({
  mockGetPlanById: vi.fn(),
  mockUpdatePlan: vi.fn(),
  mockIsAllowed: vi.fn(),
}));

vi.mock("@/lib/getmatched/action-plans", () => ({
  getPlanById: mockGetPlanById,
  updatePlan: mockUpdatePlan,
}));
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: mockIsAllowed,
  ipKey: () => "ip:test",
}));

import { POST } from "@/app/api/get-matched/plans/[id]/save-item/route";

const PLAN = { id: 7, share_token: "tok_abcdef123456", saved_items: [] };

function req(body: unknown) {
  return new Request("http://localhost/api/get-matched/plans/7/save-item", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as Parameters<typeof POST>[0];
}
const ctx = { params: Promise.resolve({ id: "7" }) };

describe("POST /api/get-matched/plans/[id]/save-item", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAllowed.mockResolvedValue(true);
    mockGetPlanById.mockResolvedValue({ ...PLAN, saved_items: [] });
    mockUpdatePlan.mockImplementation(async (input: { saved_items: unknown[] }) => ({
      ...PLAN,
      saved_items: input.saved_items,
    }));
  });

  it("adds an item (deduped) with the share token as auth", async () => {
    const res = await POST(
      req({
        share_token: PLAN.share_token,
        action: "add",
        item: { kind: "advisor", ref: "jane-tax", label: "Jane Tax" },
      }),
      ctx,
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.saved_items).toHaveLength(1);
    expect(json.saved_items[0]).toMatchObject({ kind: "advisor", ref: "jane-tax" });
    expect(json.saved_items[0].saved_at).toBeTruthy();
  });

  it("re-adding the same (kind, ref) replaces, never duplicates", async () => {
    mockGetPlanById.mockResolvedValue({
      ...PLAN,
      saved_items: [{ kind: "advisor", ref: "jane-tax", saved_at: "2026-01-01T00:00:00Z" }],
    });
    const res = await POST(
      req({ share_token: PLAN.share_token, action: "add", item: { kind: "advisor", ref: "jane-tax" } }),
      ctx,
    );
    expect((await res.json()).saved_items).toHaveLength(1);
  });

  it("removes by (kind, ref)", async () => {
    mockGetPlanById.mockResolvedValue({
      ...PLAN,
      saved_items: [
        { kind: "advisor", ref: "jane-tax", saved_at: "x" },
        { kind: "listing", ref: "42", saved_at: "x" },
      ],
    });
    const res = await POST(
      req({ share_token: PLAN.share_token, action: "remove", item: { kind: "advisor", ref: "jane-tax" } }),
      ctx,
    );
    const json = await res.json();
    expect(json.saved_items).toHaveLength(1);
    expect(json.saved_items[0].kind).toBe("listing");
  });

  it("404s on a wrong share token — same response as a missing plan (no id oracle)", async () => {
    const res = await POST(
      req({ share_token: "tok_WRONGWRONG1", action: "add", item: { kind: "advisor", ref: "x" } }),
      ctx,
    );
    expect(res.status).toBe(404);
    expect(mockUpdatePlan).not.toHaveBeenCalled();
  });

  it("400s on an invalid body (Zod) and 429s when rate-limited", async () => {
    const bad = await POST(req({ action: "add" }), ctx);
    expect(bad.status).toBe(400);

    mockIsAllowed.mockResolvedValue(false);
    const limited = await POST(
      req({ share_token: PLAN.share_token, action: "add", item: { kind: "advisor", ref: "x" } }),
      ctx,
    );
    expect(limited.status).toBe(429);
  });
});
