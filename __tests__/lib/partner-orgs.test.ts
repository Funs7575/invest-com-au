import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockFrom }),
}));

import {
  upgradePartnerToBrokerPartner,
  findPartnerOrgByContactEmail,
} from "@/lib/partner-orgs";

describe("upgradePartnerToBrokerPartner", () => {
  beforeEach(() => mockFrom.mockReset());

  it("flips the principal to human and upserts a broker_accounts row", async () => {
    const principalUpdate = {
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    };
    const brokerUpsert = {
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: "br-1" }, error: null }),
        }),
      }),
    };
    mockFrom.mockImplementation((table: string) => {
      if (table === "principals") return principalUpdate;
      if (table === "broker_accounts") return brokerUpsert;
      throw new Error(`unexpected ${table}`);
    });

    const id = await upgradePartnerToBrokerPartner({
      principalId: "p-1",
      authUserId: "u-1",
      email: "sponsor@co.com",
      brokerSlug: "co",
      companyName: "Co",
    });
    expect(id).toBe("br-1");
    expect(principalUpdate.update).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "human", auth_user_id: "u-1" }),
    );
    expect(brokerUpsert.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ principal_id: "p-1", broker_slug: "co" }),
      { onConflict: "auth_user_id" },
    );
  });

  it("returns null when the broker_accounts upsert fails", async () => {
    const principalUpdate = {
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
      }),
    };
    const brokerUpsert = {
      upsert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: { message: "boom" } }),
        }),
      }),
    };
    mockFrom.mockImplementation((table: string) =>
      table === "principals" ? principalUpdate : brokerUpsert,
    );
    expect(
      await upgradePartnerToBrokerPartner({
        principalId: "p-1",
        authUserId: "u-1",
        email: "x@y.com",
        brokerSlug: "y",
      }),
    ).toBeNull();
  });
});

describe("findPartnerOrgByContactEmail", () => {
  beforeEach(() => mockFrom.mockReset());

  it("returns null for blank email without hitting the DB", async () => {
    expect(await findPartnerOrgByContactEmail("  ")).toBeNull();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("maps a matched partner_org row", async () => {
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({
              data: {
                id: "p-2",
                kind: "partner_org",
                auth_user_id: null,
                display_name: "Acme",
                slug: null,
                status: "active",
                metadata: { contact_email: "ops@acme.com" },
                created_at: "",
                updated_at: "",
              },
              error: null,
            }),
          }),
        }),
      }),
    });
    const p = await findPartnerOrgByContactEmail("ops@acme.com");
    expect(p?.id).toBe("p-2");
    expect(p?.kind).toBe("partner_org");
  });
});
