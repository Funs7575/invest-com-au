import { describe, it, expect, vi, beforeEach } from "vitest";
import type { WebhookContext } from "@/lib/stripe-webhook/types";
import type Stripe from "stripe";

// ── Module mocks ──────────────────────────────────────────────────────────────

vi.mock("@/lib/admin", () => ({ ADMIN_EMAIL: "admin@invest.com.au" }));
vi.mock("@/lib/html-escape", () => ({ escapeHtml: (s: string) => s }));
vi.mock("@/lib/url", () => ({ getSiteUrl: () => "https://invest.com.au" }));
vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn() })),
}));

const mockSendEmail = vi.fn();
const mockEmailWrapper = vi.fn().mockReturnValue("<html>wrapped</html>");
const mockBuildCourseReceipt = vi.fn().mockReturnValue("<html>course</html>");
const mockBuildConsultationConfirmation = vi.fn().mockReturnValue("<html>consult</html>");

vi.mock("@/lib/stripe-webhook/lib/email", () => ({
  sendTransactionalEmail: (...args: unknown[]) => mockSendEmail(...args),
  emailWrapper: (...args: unknown[]) => mockEmailWrapper(...args),
  buildCourseReceiptEmail: (...args: unknown[]) => mockBuildCourseReceipt(...args),
  buildConsultationConfirmationEmail: (...args: unknown[]) => mockBuildConsultationConfirmation(...args),
}));

import { handleCheckoutSessionCompleted } from "@/lib/stripe-webhook/handlers/checkout-session-completed";

// ── Helpers ────────────────────────────────────────────────────────────────────

function thenable(data: unknown = null) {
  return {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data, error: null }),
    then: vi.fn((cb: (v: unknown) => void) => {
      cb({ data: null, error: null });
      return Promise.resolve();
    }),
  };
}

function makeCtx(tableFactories: Record<string, () => ReturnType<typeof thenable>> = {}): WebhookContext {
  const adminFrom = vi.fn().mockImplementation((table: string) => {
    if (tableFactories[table]) return tableFactories[table]!();
    return thenable();
  });

  return {
    admin: { from: adminFrom } as unknown as WebhookContext["admin"],
    stripe: {
      invoices: {
        retrieve: vi.fn().mockResolvedValue({ hosted_invoice_url: "https://inv.stripe.com/inv" }),
      },
    } as unknown as WebhookContext["stripe"],
    log: { error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() },
  };
}

function makeSession(overrides: Partial<Stripe.Checkout.Session> = {}): Stripe.Event {
  return {
    id: "evt_checkout",
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_test",
        mode: "payment",
        payment_status: "paid",
        payment_intent: "pi_test",
        amount_total: 4900,
        customer_email: "user@test.com",
        customer_details: { email: "user@test.com" },
        invoice: null,
        metadata: {},
        ...overrides,
      } as Stripe.Checkout.Session,
    },
  } as unknown as Stripe.Event;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("handleCheckoutSessionCompleted", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendEmail.mockResolvedValue({ id: "em_1" });
  });

  it("returns { status: 'done' } when no recognised metadata type", async () => {
    const result = await handleCheckoutSessionCompleted(
      makeSession({ metadata: { type: "unknown_type" } }),
      makeCtx(),
    );
    expect(result).toEqual({ status: "done" });
  });

  // ── Course sub-flow ─────────────────────────────────────────────────────────

  it("upserts course_purchases when type=course and userId present", async () => {
    let coursePurchaseCalls = 0;
    const ctx = makeCtx({
      "courses": () => thenable({ id: "course_1", title: "Investing 101", creator_id: null, revenue_share_percent: 0 }),
      "course_purchases": () => {
        coursePurchaseCalls++;
        return coursePurchaseCalls === 1
          ? { ...thenable({ id: "cp_1" }), upsert: vi.fn().mockReturnThis() }
          : thenable();
      },
    });
    await handleCheckoutSessionCompleted(
      makeSession({ metadata: { type: "course", supabase_user_id: "u_1", course_slug: "investing-101" } }),
      ctx,
    );
    expect(ctx.admin.from as ReturnType<typeof vi.fn>).toHaveBeenCalledWith("course_purchases");
  });

  it("sends course receipt email on successful upsert", async () => {
    const ctx = makeCtx({
      "courses": () => thenable({ id: "course_1", title: "Investing 101", creator_id: null, revenue_share_percent: 0 }),
      "course_purchases": () => ({ ...thenable({ id: "cp_1" }), upsert: vi.fn().mockReturnThis() }),
    });
    await handleCheckoutSessionCompleted(
      makeSession({ metadata: { type: "course", supabase_user_id: "u_1", course_slug: "investing-101" } }),
      ctx,
    );
    expect(mockSendEmail).toHaveBeenCalledWith(
      "user@test.com",
      expect.stringContaining("Confirmed"),
      expect.any(String),
    );
  });

  it("skips course flow when userId is missing from metadata", async () => {
    const ctx = makeCtx();
    await handleCheckoutSessionCompleted(
      makeSession({ metadata: { type: "course", course_slug: "investing-101" } }),
      ctx,
    );
    expect(ctx.admin.from as ReturnType<typeof vi.fn>).not.toHaveBeenCalledWith("course_purchases");
  });

  it("rolls back course_purchase and sends admin alert on revenue insert error", async () => {
    let cpCalls = 0;
    const ctx = makeCtx({
      "courses": () => thenable({ id: "course_1", title: "Test", creator_id: "cr_1", revenue_share_percent: 30 }),
      "course_purchases": () => {
        cpCalls++;
        return cpCalls === 1
          ? { ...thenable({ id: "cp_1" }), upsert: vi.fn().mockReturnThis() }
          : thenable();
      },
      "course_revenue": () => ({
        ...thenable(),
        insert: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: { message: "insert failed" } }),
        then: vi.fn((cb: (v: unknown) => void) => {
          cb({ data: null, error: { message: "insert failed" } });
          return Promise.resolve();
        }),
      }),
    });
    await handleCheckoutSessionCompleted(
      makeSession({ metadata: { type: "course", supabase_user_id: "u_1", course_slug: "investing-101" } }),
      ctx,
    );
    expect(ctx.admin.from as ReturnType<typeof vi.fn>).toHaveBeenCalledWith("course_purchases");
    expect(ctx.log.error).toHaveBeenCalledWith(
      expect.stringContaining("revenue insert error"),
      expect.any(Object),
    );
  });

  // ── Advisor credit top-up ───────────────────────────────────────────────────

  it("returns done early when topup already completed (idempotency)", async () => {
    const ctx = makeCtx({
      "advisor_credit_topups": () => ({
        ...thenable({ status: "completed" }),
      }),
    });
    const result = await handleCheckoutSessionCompleted(
      makeSession({
        metadata: { type: "advisor_credit_topup", professional_id: "42", topup_id: "7" },
        amount_total: 5000,
      }),
      ctx,
    );
    expect(result).toEqual({ status: "done" });
    expect(ctx.log.info).toHaveBeenCalledWith(
      "Advisor top-up already processed",
      expect.any(Object),
    );
  });

  it("updates credit_balance_cents on advisor_credit_topup", async () => {
    let profCalls = 0;
    const ctx = makeCtx({
      "advisor_credit_topups": () => thenable(null), // not completed
      "professionals": () => {
        profCalls++;
        return profCalls === 1
          ? thenable({ credit_balance_cents: 1000, lifetime_credit_cents: 5000 })
          : thenable({ email: "pro@test.com", name: "Bob" });
      },
    });
    await handleCheckoutSessionCompleted(
      makeSession({
        metadata: { type: "advisor_credit_topup", professional_id: "42", topup_id: "0" },
        amount_total: 5000,
      }),
      ctx,
    );
    expect(ctx.log.info).toHaveBeenCalledWith(
      "Advisor credit topped up",
      expect.objectContaining({ professionalId: 42, amountCents: 5000 }),
    );
  });

  // ── Advisor featured ────────────────────────────────────────────────────────

  it("updates featured_until on advisor_featured checkout", async () => {
    const ctx = makeCtx({
      "professionals": () => thenable({ email: "pro@test.com", name: "Bob", slug: "bob-advisor" }),
    });
    await handleCheckoutSessionCompleted(
      makeSession({
        metadata: { type: "advisor_featured", professional_id: "42" },
        amount_total: 9900,
      }),
      ctx,
    );
    expect(ctx.log.info).toHaveBeenCalledWith(
      "Advisor featured activated",
      expect.objectContaining({ professionalId: 42 }),
    );
  });

  // ── Investment listing activation ───────────────────────────────────────────

  it("activates investment listing on listing_payment checkout", async () => {
    const ctx = makeCtx({
      "listing_plans": () => thenable({ plan_name: "Standard", features: { listing_duration_days: 30 } }),
      "investment_listings": () => thenable({ title: "SAAS Co", slug: "saas-co" }),
    });
    await handleCheckoutSessionCompleted(
      makeSession({
        metadata: { type: "listing_payment", listing_id: "5", plan_id: "2", contact_email: "owner@test.com" },
      }),
      ctx,
    );
    expect(ctx.log.info).toHaveBeenCalledWith(
      "Listing activated",
      expect.objectContaining({ listingId: 5, planId: 2 }),
    );
  });

  // ── Consultation booking ────────────────────────────────────────────────────

  it("upserts consultation_bookings on consultation checkout", async () => {
    const ctx = makeCtx({
      "consultations": () => thenable({ id: "con_1", title: "Retirement Planning" }),
    });
    await handleCheckoutSessionCompleted(
      makeSession({
        metadata: { type: "consultation", supabase_user_id: "u_1", consultation_slug: "retirement" },
        payment_intent: "pi_consult",
        amount_total: 19900,
      }),
      ctx,
    );
    expect(ctx.admin.from as ReturnType<typeof vi.fn>).toHaveBeenCalledWith("consultation_bookings");
  });

  // ── Sponsored placement ─────────────────────────────────────────────────────

  it("sends admin alert on incomplete sponsored_placement metadata", async () => {
    const ctx = makeCtx();
    await handleCheckoutSessionCompleted(
      makeSession({
        metadata: { kind: "sponsored_placement", broker_id: "0" },
        payment_status: "paid",
      }),
      ctx,
    );
    expect(mockSendEmail).toHaveBeenCalledWith(
      "admin@invest.com.au",
      expect.stringContaining("without bookable metadata"),
      expect.any(String),
    );
  });

  it("creates sponsored_placement booking and sends buyer receipt", async () => {
    const ctx = makeCtx({
      "sponsored_placement_bookings": () => ({
        ...thenable(null),
        insert: vi.fn().mockReturnThis(),
        then: vi.fn((cb: (v: unknown) => void) => {
          cb({ data: null, error: null });
          return Promise.resolve();
        }),
      }),
    });
    await handleCheckoutSessionCompleted(
      makeSession({
        metadata: {
          kind: "sponsored_placement",
          broker_id: "10",
          broker_slug: "commsec",
          broker_name: "CommSec",
          tier: "premium_top",
          starts_at: "2026-05-01",
          ends_at: "2026-05-31",
          duration_days: "30",
          contact_email: "buyer@broker.com",
        },
        payment_status: "paid",
        amount_total: 250000,
      }),
      ctx,
    );
    expect(ctx.log.info).toHaveBeenCalledWith(
      "sponsored_placement booking created",
      expect.objectContaining({ broker_slug: "commsec" }),
    );
    expect(mockSendEmail).toHaveBeenCalledWith(
      "buyer@broker.com",
      expect.stringContaining("confirmed"),
      expect.any(String),
    );
  });

  it("treats 23505 race on sponsored_placement as non-error", async () => {
    const ctx = makeCtx({
      "sponsored_placement_bookings": () => ({
        ...thenable(null),
        insert: vi.fn().mockReturnThis(),
        then: vi.fn((cb: (v: unknown) => void) => {
          cb({ data: null, error: { code: "23505", message: "unique violation" } });
          return Promise.resolve();
        }),
      }),
    });
    const result = await handleCheckoutSessionCompleted(
      makeSession({
        metadata: {
          kind: "sponsored_placement",
          broker_id: "10",
          broker_slug: "commsec",
          broker_name: "CommSec",
          tier: "premium_top",
          starts_at: "2026-05-01",
          ends_at: "2026-05-31",
          duration_days: "30",
        },
        payment_status: "paid",
      }),
      ctx,
    );
    expect(result).toEqual({ status: "done" });
    expect(ctx.log.info).toHaveBeenCalledWith(
      "sponsored_placement race lost (already booked)",
      expect.any(Object),
    );
    expect(ctx.log.error).not.toHaveBeenCalledWith(
      "sponsored_placement booking insert failed",
      expect.any(Object),
    );
  });

  it("short-circuits with done when sponsored_placement booking already exists (re-delivery guard)", async () => {
    const ctx = makeCtx({
      "sponsored_placement_bookings": () => thenable({ id: "existing_bk_1" }),
    });
    const result = await handleCheckoutSessionCompleted(
      makeSession({
        metadata: {
          kind: "sponsored_placement",
          broker_id: "10",
          broker_slug: "commsec",
          broker_name: "CommSec",
          tier: "premium_top",
          starts_at: "2026-05-01",
          ends_at: "2026-05-31",
          duration_days: "30",
        },
        payment_status: "paid",
      }),
      ctx,
    );
    expect(result).toEqual({ status: "done" });
    expect(ctx.log.info).toHaveBeenCalledWith(
      "sponsored_placement booking already exists",
      expect.objectContaining({ session_id: "cs_test" }),
    );
    expect(mockSendEmail).not.toHaveBeenCalled();
  });

  it("lazy-fetches invoice URL when session.invoice is a string ID", async () => {
    const ctx = makeCtx({
      "sponsored_placement_bookings": () => ({
        ...thenable(null),
        insert: vi.fn().mockReturnThis(),
        then: vi.fn((cb: (v: unknown) => void) => {
          cb({ data: null, error: null });
          return Promise.resolve();
        }),
      }),
    });
    await handleCheckoutSessionCompleted(
      makeSession({
        metadata: {
          kind: "sponsored_placement",
          broker_id: "10",
          broker_slug: "commsec",
          broker_name: "CommSec",
          tier: "premium_top",
          starts_at: "2026-05-01",
          ends_at: "2026-05-31",
          duration_days: "30",
        },
        payment_status: "paid",
        invoice: "inv_string_abc" as unknown as Stripe.Checkout.Session["invoice"],
      }),
      ctx,
    );
    expect(ctx.stripe.invoices.retrieve).toHaveBeenCalledWith("inv_string_abc");
  });

  it("uses hosted_invoice_url from invoice object when invoice is not a string", async () => {
    const ctx = makeCtx({
      "sponsored_placement_bookings": () => ({
        ...thenable(null),
        insert: vi.fn().mockReturnThis(),
        then: vi.fn((cb: (v: unknown) => void) => {
          cb({ data: null, error: null });
          return Promise.resolve();
        }),
      }),
    });
    await handleCheckoutSessionCompleted(
      makeSession({
        metadata: {
          kind: "sponsored_placement",
          broker_id: "10",
          broker_slug: "commsec",
          broker_name: "CommSec",
          tier: "premium_top",
          starts_at: "2026-05-01",
          ends_at: "2026-05-31",
          duration_days: "30",
          contact_email: "buyer@broker.com",
        },
        payment_status: "paid",
        invoice: { hosted_invoice_url: "https://inv.stripe.com/direct-obj" } as unknown as Stripe.Checkout.Session["invoice"],
      }),
      ctx,
    );
    // Did NOT call Stripe invoices.retrieve (it was an object, not a string)
    expect(ctx.stripe.invoices.retrieve).not.toHaveBeenCalled();
  });

  it("logs error when investment_listings update fails", async () => {
    let listingCallCount = 0;
    const ctx = makeCtx({
      "listing_plans": () => thenable({ plan_name: "Standard", features: { listing_duration_days: 30 } }),
      "investment_listings": () => {
        listingCallCount++;
        if (listingCallCount === 1) {
          return {
            ...thenable(),
            then: vi.fn((cb: (v: unknown) => void) => {
              cb({ data: null, error: { message: "constraint violation" } });
              return Promise.resolve();
            }),
          };
        }
        return thenable({ title: "SAAS Co", slug: "saas-co" });
      },
    });
    await handleCheckoutSessionCompleted(
      makeSession({
        metadata: { type: "listing_payment", listing_id: "5", plan_id: "2", contact_email: "owner@test.com" },
      }),
      ctx,
    );
    expect(ctx.log.error).toHaveBeenCalledWith(
      "Listing activation error",
      expect.objectContaining({ listingId: 5 }),
    );
  });

  it("defaults listing duration to 30 days when plan features are null", async () => {
    const ctx = makeCtx({
      "listing_plans": () => thenable({ plan_name: "Standard", features: null }),
      "investment_listings": () => thenable({ title: "SAAS Co", slug: "saas-co" }),
    });
    await handleCheckoutSessionCompleted(
      makeSession({
        metadata: { type: "listing_payment", listing_id: "5", plan_id: "2" },
      }),
      ctx,
    );
    expect(ctx.log.info).toHaveBeenCalledWith(
      "Listing activated",
      expect.objectContaining({ durationDays: 30 }),
    );
  });

  // ── batch 2 — additional edge-case coverage ────────────────────────────────

  it("course flow: handles null course lookup (uses courseSlug as title fallback)", async () => {
    const ctx = makeCtx({
      courses: () => ({ ...thenable(null), maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }) }),
      course_purchases: () => ({
        ...thenable(),
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: { id: "pu_1" }, error: null }),
      }),
    });
    const result = await handleCheckoutSessionCompleted(
      makeSession({ metadata: { type: "course", supabase_user_id: "u1", course_slug: "my-course" } }),
      ctx,
    );
    expect(result).toEqual({ status: "done" });
    // email sent with courseSlug as fallback title
    expect(mockSendEmail).toHaveBeenCalledWith(
      "user@test.com",
      expect.stringContaining("my-course"),
      expect.anything(),
    );
  });

  it("advisor_credit_topup: skips idempotency check when topupId is 0", async () => {
    const idempotencySelect = vi.fn();
    const ctx = makeCtx({
      advisor_credit_topups: () => ({
        ...thenable(),
        select: idempotencySelect.mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
      professionals: () => thenable({ credit_balance_cents: 5000, lifetime_credit_cents: 5000, email: "adv@test.com", name: "Adv" }),
    });
    await handleCheckoutSessionCompleted(
      makeSession({
        metadata: { type: "advisor_credit_topup", professional_id: "7" },
        // topup_id intentionally absent → parseInt("" || "0") = 0
      }),
      ctx,
    );
    // The idempotency select on advisor_credit_topups should NOT have been called
    // (topupId === 0 means the guard is skipped)
    expect(idempotencySelect).not.toHaveBeenCalled();
  });

  it("advisor_credit_topup: updates lead_price_cents when per_lead_cents metadata present", async () => {
    const updateFn = vi.fn().mockReturnThis();
    const eqFn = vi.fn().mockReturnThis();
    let profCallCount = 0;
    const ctx = makeCtx({
      professionals: () => {
        profCallCount++;
        const t = thenable({ credit_balance_cents: 0, lifetime_credit_cents: 0, email: "adv@test.com", name: "Adv" });
        return { ...t, update: updateFn, eq: eqFn };
      },
    });
    await handleCheckoutSessionCompleted(
      makeSession({
        metadata: { type: "advisor_credit_topup", professional_id: "7", per_lead_cents: "2500" },
      }),
      ctx,
    );
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({ lead_price_cents: 2500 }),
    );
  });

  it("advisor_featured: uses session.customer_email when advisor lookup returns null", async () => {
    const ctx = makeCtx({
      professionals: () => ({
        ...thenable(null),
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        then: vi.fn((cb: (v: unknown) => void) => {
          cb({ data: null, error: null });
          return Promise.resolve();
        }),
      }),
    });
    await handleCheckoutSessionCompleted(
      makeSession({
        metadata: { type: "advisor_featured", professional_id: "9" },
        customer_email: "session-email@test.com",
      }),
      ctx,
    );
    expect(mockSendEmail).toHaveBeenCalledWith(
      "session-email@test.com",
      expect.stringContaining("Featured"),
      expect.anything(),
    );
  });

  it("consultation: skips booking when consultation not found in DB", async () => {
    const upsertFn = vi.fn();
    const ctx = makeCtx({
      consultations: () => ({
        ...thenable(null),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
      consultation_bookings: () => ({ ...thenable(), upsert: upsertFn }),
    });
    await handleCheckoutSessionCompleted(
      makeSession({
        metadata: { type: "consultation", supabase_user_id: "u2", consultation_slug: "tax-review" },
      }),
      ctx,
    );
    // Booking should NOT be attempted when consultation is null
    expect(upsertFn).not.toHaveBeenCalled();
  });

  it("consultation: logs error when booking upsert fails", async () => {
    const ctx = makeCtx({
      consultations: () => ({
        ...thenable({ id: "c1", title: "Tax Review" }),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: "c1", title: "Tax Review" }, error: null }),
      }),
      consultation_bookings: () => ({
        ...thenable(),
        upsert: vi.fn().mockReturnThis(),
        then: vi.fn((cb: (v: unknown) => void) => {
          cb({ data: null, error: { message: "unique constraint" } });
          return Promise.resolve();
        }),
      }),
    });
    await handleCheckoutSessionCompleted(
      makeSession({
        metadata: { type: "consultation", supabase_user_id: "u2", consultation_slug: "tax-review" },
      }),
      ctx,
    );
    expect(ctx.log.error).toHaveBeenCalledWith(
      "Consultation booking upsert error",
      expect.objectContaining({ error: "unique constraint" }),
    );
  });

  it("consultation: sends confirmation email on successful booking", async () => {
    const ctx = makeCtx({
      consultations: () => ({
        ...thenable({ id: "c1", title: "Tax Review" }),
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { id: "c1", title: "Tax Review" }, error: null }),
      }),
      consultation_bookings: () => ({
        ...thenable(),
        upsert: vi.fn().mockReturnThis(),
        then: vi.fn((cb: (v: unknown) => void) => {
          cb({ data: null, error: null });
          return Promise.resolve();
        }),
      }),
    });
    await handleCheckoutSessionCompleted(
      makeSession({
        metadata: { type: "consultation", supabase_user_id: "u2", consultation_slug: "tax-review" },
        customer_email: "client@test.com",
      }),
      ctx,
    );
    expect(mockSendEmail).toHaveBeenCalledWith(
      "client@test.com",
      expect.stringContaining("Tax Review"),
      expect.anything(),
    );
    expect(mockBuildConsultationConfirmation).toHaveBeenCalledWith(
      "Tax Review",
      "tax-review",
      4900,
    );
  });

  it("sponsored_placement: skips block when payment_status is not 'paid'", async () => {
    const insertFn = vi.fn();
    const ctx = makeCtx({
      sponsored_placement_bookings: () => ({ ...thenable(), insert: insertFn }),
    });
    await handleCheckoutSessionCompleted(
      makeSession({
        metadata: {
          kind: "sponsored_placement",
          broker_id: "10",
          tier: "premium_top",
          starts_at: "2026-05-01",
          ends_at: "2026-05-31",
        },
        payment_status: "unpaid" as Stripe.Checkout.Session["payment_status"],
      }),
      ctx,
    );
    expect(insertFn).not.toHaveBeenCalled();
  });

  it("sponsored_placement: swallows invoice retrieval error (non-fatal)", async () => {
    const ctx = makeCtx({
      sponsored_placement_bookings: () => ({
        ...thenable(null),
        insert: vi.fn().mockReturnThis(),
        then: vi.fn((cb: (v: unknown) => void) => {
          cb({ data: null, error: null });
          return Promise.resolve();
        }),
      }),
    });
    (ctx.stripe.invoices.retrieve as ReturnType<typeof vi.fn>).mockRejectedValue(
      new Error("Stripe API error"),
    );
    // Should NOT throw — invoice retrieval failure is caught and treated as non-fatal
    await expect(
      handleCheckoutSessionCompleted(
        makeSession({
          metadata: {
            kind: "sponsored_placement",
            broker_id: "10",
            broker_slug: "commsec",
            broker_name: "CommSec",
            tier: "premium_top",
            starts_at: "2026-05-01",
            ends_at: "2026-05-31",
            duration_days: "30",
          },
          payment_status: "paid",
          invoice: "inv_throw" as unknown as Stripe.Checkout.Session["invoice"],
        }),
        ctx,
      ),
    ).resolves.toEqual({ status: "done" });
  });
});
