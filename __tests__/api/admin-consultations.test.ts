import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

const { mockRequireAdmin, mockInsert, mockUpdate, mockUpdateEq, mockDelete, mockDeleteEq } =
  vi.hoisted(() => ({
    mockRequireAdmin: vi.fn(),
    mockInsert: vi.fn(),
    mockUpdate: vi.fn(),
    mockUpdateEq: vi.fn(),
    mockDelete: vi.fn(),
    mockDeleteEq: vi.fn(),
  }));

vi.mock("@/lib/require-admin", () => ({
  requireAdmin: mockRequireAdmin,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      insert: mockInsert,
      update: mockUpdate,
      delete: mockDelete,
    }),
  }),
}));

import { POST, DELETE } from "@/app/api/admin/consultations/route";

const validBody = {
  title: "Tax Strategy Call",
  slug: "tax-strategy-call",
  description: null,
  consultant_id: 1,
  duration_minutes: 30,
  price: 9900,
  pro_price: null,
  stripe_price_id: null,
  stripe_pro_price_id: null,
  cal_link: "https://cal.com/x",
  category: "tax",
  status: "published",
  featured: false,
  sort_order: 0,
};

function makeReq(method: "POST" | "DELETE", body: unknown): NextRequest {
  return new Request("http://localhost/api/admin/consultations", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdmin.mockResolvedValue({ ok: true, email: "admin@x.com", userId: "u1" });
  mockInsert.mockResolvedValue({ error: null });
  mockUpdate.mockReturnValue({ eq: mockUpdateEq });
  mockUpdateEq.mockResolvedValue({ error: null });
  mockDelete.mockReturnValue({ eq: mockDeleteEq });
  mockDeleteEq.mockResolvedValue({ error: null });
});

describe("/api/admin/consultations", () => {
  it("POST returns 401 when caller is not an admin", async () => {
    mockRequireAdmin.mockResolvedValueOnce({
      ok: false,
      response: new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 }),
    });
    const res = await POST(makeReq("POST", validBody));
    expect(res.status).toBe(401);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("POST returns 400 on an invalid payload", async () => {
    const res = await POST(makeReq("POST", { title: "" }));
    expect(res.status).toBe(400);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("POST inserts a new consultation (no id) via the admin client", async () => {
    const res = await POST(makeReq("POST", validBody));
    expect(res.status).toBe(200);
    expect(mockInsert).toHaveBeenCalledTimes(1);
    const payload = mockInsert.mock.calls[0]?.[0];
    expect(payload).toMatchObject({ title: "Tax Strategy Call", price: 9900 });
    expect(payload).toHaveProperty("updated_at");
    expect(payload).not.toHaveProperty("id");
    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("POST updates an existing consultation (with id) scoped by id", async () => {
    const res = await POST(makeReq("POST", { ...validBody, id: 5 }));
    expect(res.status).toBe(200);
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdateEq).toHaveBeenCalledWith("id", 5);
    // id must not leak into the column payload
    expect(mockUpdate.mock.calls[0]?.[0]).not.toHaveProperty("id");
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it("POST returns 500 when the admin client errors", async () => {
    mockInsert.mockResolvedValueOnce({ error: { message: "boom" } });
    const res = await POST(makeReq("POST", validBody));
    expect(res.status).toBe(500);
  });

  it("DELETE returns 401 when caller is not an admin", async () => {
    mockRequireAdmin.mockResolvedValueOnce({
      ok: false,
      response: new Response(null, { status: 401 }),
    });
    const res = await DELETE(makeReq("DELETE", { id: 5 }));
    expect(res.status).toBe(401);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("DELETE returns 400 without a valid id", async () => {
    const res = await DELETE(makeReq("DELETE", {}));
    expect(res.status).toBe(400);
    expect(mockDelete).not.toHaveBeenCalled();
  });

  it("DELETE removes the consultation scoped by id", async () => {
    const res = await DELETE(makeReq("DELETE", { id: 5 }));
    expect(res.status).toBe(200);
    expect(mockDeleteEq).toHaveBeenCalledWith("id", 5);
  });
});
