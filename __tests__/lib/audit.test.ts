import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

vi.mock("@/lib/principals", () => ({
  getPrincipalForAuthUser: vi.fn(),
}));

import { recordAudit, recordAuditForUser } from "@/lib/audit";
import { getPrincipalForAuthUser } from "@/lib/principals";

function chainInsert(error: { message: string } | null) {
  const insert = vi.fn().mockResolvedValue({ error });
  return { from: vi.fn().mockReturnValue({ insert }), insert };
}

describe("recordAudit", () => {
  beforeEach(() => mockFrom.mockReset());

  it("inserts an event and returns true", async () => {
    const { from, insert } = chainInsert(null);
    mockFrom.mockImplementation(from);
    const ok = await recordAudit({
      actorPrincipalId: "p-1",
      action: "forum.lock_thread",
      resourceType: "thread",
      resourceId: 42,
    });
    expect(ok).toBe(true);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({
        actor_principal_id: "p-1",
        actor_kind: "human",
        action: "forum.lock_thread",
        resource_type: "thread",
        resource_id: "42",
      }),
    );
  });

  it("defaults actor_kind to system when no principal", async () => {
    const { from, insert } = chainInsert(null);
    mockFrom.mockImplementation(from);
    await recordAudit({ action: "cron.redact" });
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ actor_kind: "system", actor_principal_id: null }),
    );
  });

  it("returns false on insert error but never throws", async () => {
    const { from } = chainInsert({ message: "boom" });
    mockFrom.mockImplementation(from);
    await expect(recordAudit({ action: "x.y" })).resolves.toBe(false);
  });

  it("stringifies a numeric resourceId and null-coalesces optionals", async () => {
    const { from, insert } = chainInsert(null);
    mockFrom.mockImplementation(from);
    await recordAudit({ action: "a.b", resourceId: 7 });
    const arg = insert.mock.calls[0]![0] as Record<string, unknown>;
    expect(arg.resource_id).toBe("7");
    expect(arg.before_state).toBeNull();
    expect(arg.metadata).toEqual({});
  });
});

describe("recordAuditForUser", () => {
  beforeEach(() => {
    mockFrom.mockReset();
    vi.mocked(getPrincipalForAuthUser).mockReset();
  });

  it("resolves the principal then records as human", async () => {
    vi.mocked(getPrincipalForAuthUser).mockResolvedValue({
      id: "p-9",
      kind: "human",
      authUserId: "u-9",
      displayName: "T",
      slug: null,
      status: "active",
      metadata: {},
      createdAt: "",
      updatedAt: "",
    });
    const { from, insert } = chainInsert(null);
    mockFrom.mockImplementation(from);
    const ok = await recordAuditForUser("u-9", { action: "account.delete_scheduled" });
    expect(ok).toBe(true);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ actor_principal_id: "p-9", actor_kind: "human" }),
    );
  });

  it("still records (principal null) when lookup throws", async () => {
    vi.mocked(getPrincipalForAuthUser).mockRejectedValue(new Error("db down"));
    const { from, insert } = chainInsert(null);
    mockFrom.mockImplementation(from);
    const ok = await recordAuditForUser("u-9", { action: "account.delete_scheduled" });
    expect(ok).toBe(true);
    expect(insert).toHaveBeenCalledWith(
      expect.objectContaining({ actor_principal_id: null }),
    );
  });
});
