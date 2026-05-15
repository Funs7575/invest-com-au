import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockFrom, mockPaymentIntentsCreate, mockAccountsCreate, mockAccountLinksCreate, mockAccountsRetrieve } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockPaymentIntentsCreate: vi.fn(),
  mockAccountsCreate: vi.fn(),
  mockAccountLinksCreate: vi.fn(),
  mockAccountsRetrieve: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: vi.fn(() => ({
    paymentIntents: { create: mockPaymentIntentsCreate },
    accounts: { create: mockAccountsCreate, retrieve: mockAccountsRetrieve },
    accountLinks: { create: mockAccountLinksCreate },
  })),
}));

import {
  createPaymentForBrief,
  createConnectOnboardingLink,
  getMarketplaceTakeRateBps,
  refreshConnectAccountStatus,
  handleConnectWebhook,
} from "@/lib/stripe-connect";

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.MARKETPLACE_TAKE_RATE_BPS;
  vi.stubEnv("STRIPE_SECRET_KEY", "sk_test_dummy");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getMarketplaceTakeRateBps", () => {
  it("defaults to 10% (1000 bps)", () => {
    expect(getMarketplaceTakeRateBps()).toBe(1000);
  });

  it("honours MARKETPLACE_TAKE_RATE_BPS env override", () => {
    process.env.MARKETPLACE_TAKE_RATE_BPS = "1500";
    expect(getMarketplaceTakeRateBps()).toBe(1500);
  });

  it("clamps invalid values to default", () => {
    process.env.MARKETPLACE_TAKE_RATE_BPS = "9999"; // > 3000 cap
    expect(getMarketplaceTakeRateBps()).toBe(1000);
    process.env.MARKETPLACE_TAKE_RATE_BPS = "-1";
    expect(getMarketplaceTakeRateBps()).toBe(1000);
  });
});

describe("createPaymentForBrief", () => {
  it("returns 'no_secret' when STRIPE_SECRET_KEY missing", async () => {
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    const result = await createPaymentForBrief({
      briefId: 1,
      professionalId: 1,
      consumerEmail: "x@example.com",
      amountCents: 10000,
      description: "test",
    });
    expect(result.unavailable).toBe("no_secret");
  });

  it("returns 'pro_not_connected' when pro has no connect account or payouts disabled", async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              stripe_connect_account_id: null,
              stripe_connect_status: "not_connected",
              stripe_connect_payouts_enabled: false,
              stripe_connect_charges_enabled: false,
            },
            error: null,
          }),
        }),
      }),
    }));
    const result = await createPaymentForBrief({
      briefId: 1,
      professionalId: 1,
      consumerEmail: "x@example.com",
      amountCents: 10000,
      description: "test",
    });
    expect(result.unavailable).toBe("pro_not_connected");
  });

  it("sets application_fee_amount to 10% by default and routes via transfer_data", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "professionals") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  stripe_connect_account_id: "acct_test",
                  stripe_connect_status: "active",
                  stripe_connect_payouts_enabled: true,
                  stripe_connect_charges_enabled: true,
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi
              .fn()
              .mockResolvedValue({ data: { id: 99 }, error: null }),
          }),
        }),
      };
    });
    mockPaymentIntentsCreate.mockResolvedValue({
      id: "pi_test",
      client_secret: "cs_test",
    });
    const result = await createPaymentForBrief({
      briefId: 5,
      professionalId: 7,
      consumerEmail: "c@example.com",
      amountCents: 50000, // $500
      description: "1 hour consultation",
    });
    expect(result.paymentIntentId).toBe("pi_test");
    expect(result.clientSecret).toBe("cs_test");
    expect(result.paymentId).toBe(99);
    const callArgs = mockPaymentIntentsCreate.mock.calls[0]?.[0];
    expect(callArgs.amount).toBe(50000);
    expect(callArgs.application_fee_amount).toBe(5000); // 10% of 50000
    expect(callArgs.transfer_data?.destination).toBe("acct_test");
    expect(callArgs.metadata?.kind).toBe("marketplace_payment");
    expect(callArgs.metadata?.brief_id).toBe("5");
  });
});

describe("createConnectOnboardingLink", () => {
  it("creates an account if pro doesn't have one", async () => {
    mockFrom.mockImplementation(() => {
      return {
        select: vi.fn().mockImplementation(() => {
          return {
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: {
                  stripe_connect_account_id: null,
                  stripe_connect_status: "not_connected",
                  stripe_connect_payouts_enabled: false,
                  stripe_connect_charges_enabled: false,
                },
                error: null,
              }),
            }),
          };
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      };
    });
    mockAccountsCreate.mockResolvedValue({ id: "acct_new" });
    mockAccountLinksCreate.mockResolvedValue({ url: "https://stripe.com/onboard" });
    const result = await createConnectOnboardingLink({
      professionalId: 1,
      email: "pro@example.com",
      refreshUrl: "https://invest.com.au/r",
      returnUrl: "https://invest.com.au/c",
    });
    expect(result.url).toBe("https://stripe.com/onboard");
    expect(mockAccountsCreate).toHaveBeenCalled();
    const arg = mockAccountsCreate.mock.calls[0]?.[0];
    expect(arg.type).toBe("express");
    expect(arg.country).toBe("AU");
  });

  it("reuses existing account when present", async () => {
    mockFrom.mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              stripe_connect_account_id: "acct_existing",
              stripe_connect_status: "onboarding",
              stripe_connect_payouts_enabled: false,
              stripe_connect_charges_enabled: false,
            },
            error: null,
          }),
        }),
      }),
    }));
    mockAccountLinksCreate.mockResolvedValue({ url: "https://stripe.com/onboard" });
    const result = await createConnectOnboardingLink({
      professionalId: 1,
      email: "pro@example.com",
      refreshUrl: "https://invest.com.au/r",
      returnUrl: "https://invest.com.au/c",
    });
    expect(result.url).toBe("https://stripe.com/onboard");
    expect(mockAccountsCreate).not.toHaveBeenCalled();
  });
});

describe("refreshConnectAccountStatus", () => {
  it("maps charges+payouts enabled to active", async () => {
    mockFrom.mockImplementation(() => ({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }));
    mockAccountsRetrieve.mockResolvedValue({
      id: "acct_x",
      charges_enabled: true,
      payouts_enabled: true,
      requirements: {},
    });
    await refreshConnectAccountStatus("acct_x");
    // Verify the update used 'active' status
    const updateCalls = mockFrom.mock.results.flatMap((r) =>
      (r.value as { update: ReturnType<typeof vi.fn> }).update.mock.calls.map(
        (c) => c[0],
      ),
    );
    expect(updateCalls.some((u) => u.stripe_connect_status === "active")).toBe(true);
    expect(
      updateCalls.some((u) => u.stripe_connect_payouts_enabled === true),
    ).toBe(true);
  });

  it("maps disabled_reason to rejected", async () => {
    mockFrom.mockImplementation(() => ({
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    }));
    mockAccountsRetrieve.mockResolvedValue({
      id: "acct_x",
      charges_enabled: false,
      payouts_enabled: false,
      requirements: { disabled_reason: "fields_needed" },
    });
    await refreshConnectAccountStatus("acct_x");
    const updateCalls = mockFrom.mock.results.flatMap((r) =>
      (r.value as { update: ReturnType<typeof vi.fn> }).update.mock.calls.map(
        (c) => c[0],
      ),
    );
    expect(updateCalls.some((u) => u.stripe_connect_status === "rejected")).toBe(true);
  });
});

describe("handleConnectWebhook", () => {
  it("flips marketplace_payments.status to succeeded on payment_intent.succeeded", async () => {
    const update = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    mockFrom.mockImplementation(() => ({ update }));
    await handleConnectWebhook({
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_x",
          metadata: { kind: "marketplace_payment" },
        },
      },
    } as never);
    const arg = update.mock.calls[0]?.[0];
    expect(arg.status).toBe("succeeded");
  });

  it("ignores PaymentIntents that aren't marketplace payments", async () => {
    const update = vi.fn();
    mockFrom.mockImplementation(() => ({ update }));
    await handleConnectWebhook({
      type: "payment_intent.succeeded",
      data: {
        object: {
          id: "pi_x",
          metadata: { kind: "subscription_topup" }, // not marketplace
        },
      },
    } as never);
    expect(update).not.toHaveBeenCalled();
  });

  it("flips status to refunded on charge.refunded", async () => {
    const update = vi.fn().mockReturnValue({
      eq: vi.fn().mockResolvedValue({ data: null, error: null }),
    });
    mockFrom.mockImplementation(() => ({ update }));
    await handleConnectWebhook({
      type: "charge.refunded",
      data: { object: { id: "ch_x", payment_intent: "pi_x" } },
    } as never);
    const arg = update.mock.calls[0]?.[0];
    expect(arg.status).toBe("refunded");
  });
});
