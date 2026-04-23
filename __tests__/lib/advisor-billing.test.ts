import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

type ProRow = { id: number; name: string; email: string; stripe_customer_id: string | null };
type BillingRow = {
  id: number;
  professional_id: number;
  amount_cents: number;
  description: string;
  status: string;
  lead_id: number;
  stripe_invoice_id?: string;
};

// DB stub state
let proByQuery: { id?: ProRow | null; stripe_customer_id_lookup?: ProRow | null } = {};
let billingById: BillingRow | null = null;
let billingByInvoiceId: BillingRow | null = null;
let billingError: { message: string } | null = null;
let billingUpdateError: { message: string } | null = null;

const updateCalls: { table: string; payload: Record<string, unknown>; keyCol: string; keyVal: unknown }[] =
  [];

// Stripe stub state
const stripeCalls: { fn: string; args: unknown[] }[] = [];
let stripeCreateInvoiceImpl = vi.fn(async (_args: unknown) => ({ id: "in_123" }));
let stripeFinalizeImpl = vi.fn(async (_id: string) => ({
  id: "in_123",
  number: "INV-0001",
}));
let stripeSendImpl = vi.fn(async (_id: string) => ({}));
let stripeCreateItemImpl = vi.fn(async (_args: unknown) => ({}));
let stripeCreateCustomerImpl = vi.fn(async (_args: unknown) => ({ id: "cus_new" }));

const mockFrom = vi.fn((table: string) => {
  if (table === "professionals") {
    return {
      select: (cols: string) => ({
        eq: (_col: string, id: number) => ({
          single: async () => {
            if (cols.includes("stripe_customer_id") && cols.includes("email")) {
              // Full row lookup (by id) for createLeadInvoice
              return {
                data: proByQuery.stripe_customer_id_lookup ?? proByQuery.id ?? null,
                error: null,
              };
            }
            // Minimal stripe_customer_id lookup from getOrCreate
            return {
              data:
                proByQuery.id && proByQuery.id.id === id
                  ? { stripe_customer_id: proByQuery.id.stripe_customer_id }
                  : null,
              error: null,
            };
          },
        }),
      }),
      update: (payload: Record<string, unknown>) => ({
        eq: async (col: string, val: unknown) => {
          updateCalls.push({ table, payload, keyCol: col, keyVal: val });
          return { data: null, error: null };
        },
      }),
    };
  }
  if (table === "advisor_billing") {
    return {
      select: () => ({
        eq: (col: string, _val: unknown) => ({
          single: async () => {
            if (billingError) return { data: null, error: billingError };
            if (col === "id") return { data: billingById, error: null };
            if (col === "stripe_invoice_id")
              return { data: billingByInvoiceId, error: null };
            return { data: null, error: null };
          },
        }),
      }),
      update: (payload: Record<string, unknown>) => ({
        eq: async (col: string, val: unknown) => {
          updateCalls.push({ table, payload, keyCol: col, keyVal: val });
          return { data: null, error: billingUpdateError };
        },
      }),
    };
  }
  if (table === "professional_leads") {
    return {
      update: (payload: Record<string, unknown>) => ({
        eq: async (col: string, val: unknown) => {
          updateCalls.push({ table, payload, keyCol: col, keyVal: val });
          return { data: null, error: null };
        },
      }),
    };
  }
  throw new Error(`unexpected table: ${table}`);
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

vi.mock("@/lib/stripe", () => ({
  getStripe: vi.fn(() => ({
    customers: {
      create: (args: unknown) => {
        stripeCalls.push({ fn: "customers.create", args: [args] });
        return stripeCreateCustomerImpl(args);
      },
    },
    invoices: {
      create: (args: unknown) => {
        stripeCalls.push({ fn: "invoices.create", args: [args] });
        return stripeCreateInvoiceImpl(args);
      },
      finalizeInvoice: (id: string) => {
        stripeCalls.push({ fn: "invoices.finalizeInvoice", args: [id] });
        return stripeFinalizeImpl(id);
      },
      sendInvoice: (id: string) => {
        stripeCalls.push({ fn: "invoices.sendInvoice", args: [id] });
        return stripeSendImpl(id);
      },
    },
    invoiceItems: {
      create: (args: unknown) => {
        stripeCalls.push({ fn: "invoiceItems.create", args: [args] });
        return stripeCreateItemImpl(args);
      },
    },
  })),
}));

import {
  getOrCreateStripeCustomer,
  createLeadInvoice,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  DEFAULT_LEAD_PRICE_CENTS,
  FREE_LEAD_LIMIT,
  DEFAULT_TOPUP_CENTS,
  ARTICLE_STANDARD_PRICE_CENTS,
  ARTICLE_FEATURED_PRICE_CENTS,
} from "@/lib/advisor-billing";

// ─── Tests ───────────────────────────────────────────────────────────

describe("advisor-billing constants", () => {
  it("pricing constants are sensible", () => {
    expect(DEFAULT_LEAD_PRICE_CENTS).toBe(3900);
    expect(FREE_LEAD_LIMIT).toBe(3);
    expect(DEFAULT_TOPUP_CENTS).toBe(15000);
    expect(ARTICLE_STANDARD_PRICE_CENTS).toBe(19900);
    expect(ARTICLE_FEATURED_PRICE_CENTS).toBe(39900);
  });
});

describe("getOrCreateStripeCustomer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stripeCalls.length = 0;
    updateCalls.length = 0;
    proByQuery = {};
    stripeCreateCustomerImpl = vi.fn(async () => ({ id: "cus_new" }));
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("returns the existing stripe_customer_id without calling Stripe", async () => {
    proByQuery.id = {
      id: 7,
      name: "Adv",
      email: "a@b.com",
      stripe_customer_id: "cus_existing",
    };

    const id = await getOrCreateStripeCustomer(7, "a@b.com", "Adv");
    expect(id).toBe("cus_existing");
    expect(stripeCalls).toHaveLength(0);
    expect(updateCalls).toHaveLength(0);
  });

  it("creates a Stripe customer and writes the id back to professionals", async () => {
    proByQuery.id = { id: 7, name: "Adv", email: "a@b.com", stripe_customer_id: null };

    const id = await getOrCreateStripeCustomer(7, "a@b.com", "Adv");
    expect(id).toBe("cus_new");
    const create = stripeCalls.find((c) => c.fn === "customers.create");
    expect(create).toBeDefined();
    expect(create?.args[0]).toMatchObject({
      email: "a@b.com",
      name: "Adv",
      metadata: {
        professional_id: "7",
        source: "invest_com_au_advisor",
      },
    });
    const persistCall = updateCalls.find((c) => c.table === "professionals");
    expect(persistCall?.payload.stripe_customer_id).toBe("cus_new");
    expect(persistCall?.keyVal).toBe(7);
  });
});

describe("createLeadInvoice", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stripeCalls.length = 0;
    updateCalls.length = 0;
    billingById = null;
    proByQuery = {};
    billingError = null;
    billingUpdateError = null;
    stripeCreateInvoiceImpl = vi.fn(async (_args: unknown) => ({ id: "in_xyz" }));
    stripeFinalizeImpl = vi.fn(async (_id: string) => ({
      id: "in_xyz",
      number: "INV-42",
    }));
    stripeSendImpl = vi.fn(async (_id: string) => ({}));
    stripeCreateItemImpl = vi.fn(async (_args: unknown) => ({}));
    stripeCreateCustomerImpl = vi.fn(async (_args: unknown) => ({ id: "cus_new" }));
  });

  it("returns null when billing record is missing", async () => {
    billingById = null;
    billingError = { message: "no row" };
    const res = await createLeadInvoice(1);
    expect(res).toBeNull();
    expect(stripeCalls).toHaveLength(0);
  });

  it("returns null when the billing record is not pending (idempotency)", async () => {
    billingById = {
      id: 1,
      professional_id: 7,
      amount_cents: 3900,
      description: "Lead 101",
      status: "invoiced", // already invoiced — no-op
      lead_id: 101,
    };

    const res = await createLeadInvoice(1);
    expect(res).toBeNull();
    expect(stripeCalls).toHaveLength(0);
    expect(updateCalls).toHaveLength(0);
  });

  it("returns null when the advisor has no email", async () => {
    billingById = {
      id: 1,
      professional_id: 7,
      amount_cents: 3900,
      description: "Lead 101",
      status: "pending",
      lead_id: 101,
    };
    proByQuery.stripe_customer_id_lookup = {
      id: 7,
      name: "Adv",
      email: "",
      stripe_customer_id: "cus_existing",
    };
    const res = await createLeadInvoice(1);
    expect(res).toBeNull();
    expect(stripeCalls).toHaveLength(0);
  });

  it("creates the invoice, sends it, and marks billing invoiced", async () => {
    billingById = {
      id: 1,
      professional_id: 7,
      amount_cents: 3900,
      description: "Lead 101",
      status: "pending",
      lead_id: 101,
    };
    proByQuery.stripe_customer_id_lookup = {
      id: 7,
      name: "Adv",
      email: "a@b.com",
      stripe_customer_id: "cus_existing",
    };
    proByQuery.id = {
      id: 7,
      name: "Adv",
      email: "a@b.com",
      stripe_customer_id: "cus_existing",
    };

    const result = await createLeadInvoice(1);
    expect(result).toBe("in_xyz");
    // Correct Stripe sequence
    expect(stripeCalls.map((c) => c.fn)).toEqual(
      expect.arrayContaining([
        "invoices.create",
        "invoiceItems.create",
        "invoices.finalizeInvoice",
        "invoices.sendInvoice",
      ]),
    );
    // Billing stamped invoiced with invoice number
    const bu = updateCalls.find(
      (c) => c.table === "advisor_billing" && c.payload.status === "invoiced",
    );
    expect(bu).toBeDefined();
    expect(bu?.payload.stripe_invoice_id).toBe("in_xyz");
    expect(bu?.payload.invoice_number).toBe("INV-42");
  });

  it("marks billing as invoice_failed if any Stripe call throws", async () => {
    billingById = {
      id: 1,
      professional_id: 7,
      amount_cents: 3900,
      description: "Lead 101",
      status: "pending",
      lead_id: 101,
    };
    proByQuery.stripe_customer_id_lookup = {
      id: 7,
      name: "Adv",
      email: "a@b.com",
      stripe_customer_id: "cus_existing",
    };
    proByQuery.id = {
      id: 7,
      name: "Adv",
      email: "a@b.com",
      stripe_customer_id: "cus_existing",
    };
    stripeCreateInvoiceImpl = vi.fn(async (_args: unknown) => {
      throw new Error("stripe down");
    });

    const result = await createLeadInvoice(1);
    expect(result).toBeNull();
    const fail = updateCalls.find(
      (c) => c.table === "advisor_billing" && c.payload.status === "invoice_failed",
    );
    expect(fail).toBeDefined();
  });
});

describe("handleInvoicePaid", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateCalls.length = 0;
    billingByInvoiceId = null;
    billingError = null;
    billingUpdateError = null;
  });

  it("ignores when no advisor_billing matches the Stripe invoice id", async () => {
    billingByInvoiceId = null;
    await handleInvoicePaid("in_unknown", "pi_1");
    expect(updateCalls).toHaveLength(0);
  });

  it("marks billing paid and stamps the lead as billed", async () => {
    billingByInvoiceId = {
      id: 55,
      professional_id: 7,
      amount_cents: 3900,
      description: "",
      status: "invoiced",
      lead_id: 101,
    };

    await handleInvoicePaid("in_xyz", "pi_1");
    const billingUpdate = updateCalls.find((c) => c.table === "advisor_billing");
    expect(billingUpdate?.payload.status).toBe("paid");
    expect(billingUpdate?.payload.stripe_payment_intent_id).toBe("pi_1");

    const leadUpdate = updateCalls.find((c) => c.table === "professional_leads");
    expect(leadUpdate?.payload.billed).toBe(true);
    expect(leadUpdate?.keyVal).toBe(101);
  });

  it("skips the lead update when billing has no lead_id", async () => {
    billingByInvoiceId = {
      id: 55,
      professional_id: 7,
      amount_cents: 3900,
      description: "",
      status: "invoiced",
      lead_id: 0 as unknown as number,
    };
    // 0 is falsy so the branch should skip
    await handleInvoicePaid("in_xyz", null);
    const leadUpdate = updateCalls.find((c) => c.table === "professional_leads");
    expect(leadUpdate).toBeUndefined();
  });

  it("exits early if the billing update itself errors", async () => {
    billingByInvoiceId = {
      id: 55,
      professional_id: 7,
      amount_cents: 3900,
      description: "",
      status: "invoiced",
      lead_id: 101,
    };
    billingUpdateError = { message: "write conflict" };
    await handleInvoicePaid("in_xyz", "pi_1");
    // No lead update after the billing update failed
    const leadUpdate = updateCalls.find((c) => c.table === "professional_leads");
    expect(leadUpdate).toBeUndefined();
  });
});

describe("handleInvoicePaymentFailed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateCalls.length = 0;
    billingByInvoiceId = null;
    billingError = null;
  });

  it("ignores unknown invoice id", async () => {
    billingByInvoiceId = null;
    await handleInvoicePaymentFailed("in_unknown");
    expect(updateCalls).toHaveLength(0);
  });

  it("marks billing payment_failed on a matching row", async () => {
    billingByInvoiceId = {
      id: 9,
      professional_id: 1,
      amount_cents: 100,
      description: "",
      status: "invoiced",
      lead_id: 1,
    };
    await handleInvoicePaymentFailed("in_xyz");
    const bu = updateCalls.find((c) => c.table === "advisor_billing");
    expect(bu?.payload.status).toBe("payment_failed");
    expect(bu?.keyVal).toBe(9);
  });
});
