import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockFrom, mockRecordLedgerEntry, mockIsFlagEnabled, mockClassifyText } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockRecordLedgerEntry: vi.fn(),
  mockIsFlagEnabled: vi.fn(),
  mockClassifyText: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));
vi.mock("@/lib/advisor-credit-ledger", () => ({
  recordLedgerEntry: mockRecordLedgerEntry,
}));
vi.mock("@/lib/feature-flags", () => ({
  isFlagEnabled: mockIsFlagEnabled,
}));
vi.mock("@/lib/text-moderation", () => ({
  classifyText: mockClassifyText,
}));

import {
  createLeadReferral,
  respondToLeadReferral,
  recordReferralConversionForLead,
} from "@/lib/advisor-lead-referrals";

function receiverLookup(receiver: { id: number; status: string } | null) {
  return {
    select: vi.fn().mockReturnValue({
      ilike: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: receiver, error: null }),
        }),
      }),
      in: vi.fn().mockResolvedValue({ data: [], error: null }),
    }),
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.ADVISOR_REFERRAL_BONUS_CENTS;
  mockClassifyText.mockReturnValue({ verdict: "auto_publish", reasons: [] });
  mockIsFlagEnabled.mockResolvedValue(false);
  mockRecordLedgerEntry.mockResolvedValue({ entry: { id: 1 }, balanceAfterCents: 0, idempotent: false });
});

describe("createLeadReferral", () => {
  it("rejects a note that fails the publish gate", async () => {
    mockClassifyText.mockReturnValue({ verdict: "escalate", reasons: ["forward_looking"] });
    const result = await createLeadReferral({
      fromProfessionalId: 1,
      toProfessionalEmail: "b@firm.com",
      clientName: "Client",
      clientEmail: "c@x.com",
      note: "Guaranteed 20% returns if you call them",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid");
  });

  it("rejects self-referral", async () => {
    const tables: Record<string, unknown> = {
      professionals: receiverLookup({ id: 1, status: "active" }),
    };
    mockFrom.mockImplementation((t: string) => tables[t] ?? {});

    const result = await createLeadReferral({
      fromProfessionalId: 1,
      toProfessionalEmail: "me@firm.com",
      clientName: "Client",
      clientEmail: "c@x.com",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("invalid");
  });

  it("creates a pending referral for an active colleague", async () => {
    const inserted = {
      id: 9,
      from_professional_id: 1,
      to_professional_id: 2,
      client_name: "Client",
      client_email: "c@x.com",
      status: "pending",
      bonus_cents: 0,
      created_at: "2026-06-10T00:00:00Z",
    };
    const tables: Record<string, unknown> = {
      professionals: receiverLookup({ id: 2, status: "active" }),
      advisor_lead_referrals: {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: inserted, error: null }),
          }),
        }),
      },
    };
    mockFrom.mockImplementation((t: string) => tables[t] ?? {});

    const result = await createLeadReferral({
      fromProfessionalId: 1,
      toProfessionalEmail: "b@firm.com",
      clientName: "Client",
      clientEmail: "C@X.com",
    });
    expect(result.ok).toBe(true);
  });

  it("returns unavailable when the table has not been migrated", async () => {
    const tables: Record<string, unknown> = {
      professionals: receiverLookup({ id: 2, status: "active" }),
      advisor_lead_referrals: {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { code: "42P01", message: "does not exist" },
            }),
          }),
        }),
      },
    };
    mockFrom.mockImplementation((t: string) => tables[t] ?? {});

    const result = await createLeadReferral({
      fromProfessionalId: 1,
      toProfessionalEmail: "b@firm.com",
      clientName: "Client",
      clientEmail: "c@x.com",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("unavailable");
  });
});

describe("respondToLeadReferral", () => {
  function referralTable(referral: Record<string, unknown> | null) {
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({ data: referral, error: null }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    };
  }

  it("only the addressed advisor can respond", async () => {
    const tables: Record<string, unknown> = {
      advisor_lead_referrals: referralTable({ id: 9, to_professional_id: 2, status: "pending" }),
    };
    mockFrom.mockImplementation((t: string) => tables[t] ?? {});

    const result = await respondToLeadReferral({ referralId: 9, professionalId: 3, accept: true });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("forbidden");
  });

  it("accept creates an unbilled lead for the receiver", async () => {
    const leadInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: 77 }, error: null }),
      }),
    });
    const tables: Record<string, unknown> = {
      advisor_lead_referrals: referralTable({
        id: 9,
        to_professional_id: 2,
        status: "pending",
        client_name: "Client",
        client_email: "c@x.com",
        client_phone: null,
        note: "Needs SMSF help",
      }),
      professional_leads: { insert: leadInsert },
    };
    mockFrom.mockImplementation((t: string) => tables[t] ?? {});

    const result = await respondToLeadReferral({ referralId: 9, professionalId: 2, accept: true });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.createdLeadId).toBe(77);
    expect(leadInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        professional_id: 2,
        billed: false,
        bill_amount_cents: 0,
        source_page: "advisor_referral",
      }),
    );
  });
});

describe("recordReferralConversionForLead", () => {
  function conversionTables(referral: Record<string, unknown> | null) {
    return {
      advisor_lead_referrals: {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValue({ data: referral, error: null }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      },
    } as Record<string, unknown>;
  }

  it("does NOT credit a bonus while the flag is off (lean-lane default)", async () => {
    const tables = conversionTables({ id: 9, from_professional_id: 1, status: "accepted", bonus_cents: 0 });
    mockFrom.mockImplementation((t: string) => tables[t] ?? {});
    mockIsFlagEnabled.mockResolvedValue(false);

    await recordReferralConversionForLead(77);
    expect(mockRecordLedgerEntry).not.toHaveBeenCalled();
  });

  it("credits a flat bonus via referral_payout when the flag is on", async () => {
    const tables = conversionTables({ id: 9, from_professional_id: 1, status: "accepted", bonus_cents: 0 });
    mockFrom.mockImplementation((t: string) => tables[t] ?? {});
    mockIsFlagEnabled.mockResolvedValue(true);

    await recordReferralConversionForLead(77);
    expect(mockRecordLedgerEntry).toHaveBeenCalledWith(
      expect.objectContaining({
        professionalId: 1,
        amountCents: 2500,
        kind: "referral_payout",
        referenceType: "advisor_lead_referral",
        referenceId: "9",
      }),
    );
  });

  it("is a no-op for already-converted referrals", async () => {
    const tables = conversionTables({ id: 9, from_professional_id: 1, status: "converted", bonus_cents: 2500 });
    mockFrom.mockImplementation((t: string) => tables[t] ?? {});
    mockIsFlagEnabled.mockResolvedValue(true);

    await recordReferralConversionForLead(77);
    expect(mockRecordLedgerEntry).not.toHaveBeenCalled();
  });
});
