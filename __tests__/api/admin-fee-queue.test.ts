import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: () => mockGetUser() },
  })),
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/admin", () => ({
  ADMIN_EMAILS: ["admin@test.com"],
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

import { GET, POST } from "@/app/api/admin/fee-queue/route";

// ── Helpers ───────────────────────────────────────────────────────────────────

const ADMIN_USER = { email: "admin@test.com" };
const ANON_USER = null;

const FEE_ITEM = {
  id: "fq-1",
  broker_id: "broker-abc",
  field_name: "asx_fee",
  old_value: "$9.95",
  new_value: "$7.95",
  status: "pending",
};

function makePost(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/admin/fee-queue", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ── GET tests ─────────────────────────────────────────────────────────────────

describe("GET /api/admin/fee-queue", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ANON_USER }, error: null });
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns 200 with pending fee items", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: [FEE_ITEM] }),
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveLength(1);
    expect(body[0].field_name).toBe("asx_fee");
  });

  it("returns empty array when no items (null data)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: null }),
    });
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual([]);
  });

  it("returns 500 on thrown error", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockRejectedValue(new Error("db_error")),
    });
    const res = await GET();
    expect(res.status).toBe(500);
  });
});

// ── POST tests ────────────────────────────────────────────────────────────────

describe("POST /api/admin/fee-queue", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns 401 when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ANON_USER }, error: null });
    const res = await POST(makePost({ id: "fq-1", action: "approve" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when id is missing", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    const res = await POST(makePost({ action: "approve" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/id and action/i);
  });

  it("returns 400 when action is missing", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    const res = await POST(makePost({ id: "fq-1" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when queue item not found", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null }),
    });
    const res = await POST(makePost({ id: "fq-missing", action: "approve" }));
    expect(res.status).toBe(404);
  });

  it("approve: applies broker update, logs change, updates queue, writes audit", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });

    // Call order: fee_update_queue SELECT, brokers UPDATE, broker_data_changes INSERT,
    //             fee_update_queue UPDATE, admin_audit_log INSERT
    mockFrom
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: FEE_ITEM }),
      })
      .mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      })
      .mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: null }),
      })
      .mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      })
      .mockReturnValueOnce({
        insert: vi.fn().mockResolvedValue({ error: null }),
      });

    const res = await POST(makePost({ id: "fq-1", action: "approve" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("approved");
    expect(body.applied).toBe(true);
    // All 5 from() calls consumed
    expect(mockFrom).toHaveBeenCalledTimes(5);
  });

  it("approve: numeric fee value extracted and written to numeric column", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    const feeItemWithNumeric = { ...FEE_ITEM, field_name: "asx_fee", new_value: "$7.95" };
    const brokerUpdateMock = vi.fn().mockReturnThis();
    const brokerEqMock = vi.fn().mockResolvedValue({ error: null });

    mockFrom
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: feeItemWithNumeric }),
      })
      .mockReturnValueOnce({ update: brokerUpdateMock, eq: brokerEqMock })
      .mockReturnValueOnce({ insert: vi.fn().mockResolvedValue({ error: null }) })
      .mockReturnValueOnce({ update: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ error: null }) })
      .mockReturnValueOnce({ insert: vi.fn().mockResolvedValue({ error: null }) });

    await POST(makePost({ id: "fq-1", action: "approve" }));
    // brokers.update() should have been called with asx_fee_value numeric
    expect(brokerUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({ asx_fee_value: 7.95 })
    );
  });

  it("reject: updates queue status to rejected and writes audit log", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });

    const auditInsertMock = vi.fn().mockResolvedValue({ error: null });
    // Call order: fee_update_queue SELECT, fee_update_queue UPDATE, admin_audit_log INSERT
    mockFrom
      .mockReturnValueOnce({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: FEE_ITEM }),
      })
      .mockReturnValueOnce({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      })
      .mockReturnValueOnce({ insert: auditInsertMock });

    const res = await POST(makePost({ id: "fq-1", action: "reject" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("rejected");
    expect(auditInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({ action: "fee_queue:rejected" })
    );
  });

  it("returns 400 for unrecognised action", async () => {
    mockGetUser.mockResolvedValue({ data: { user: ADMIN_USER }, error: null });
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: FEE_ITEM }),
    });
    const res = await POST(makePost({ id: "fq-1", action: "delete_everything" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });
});
