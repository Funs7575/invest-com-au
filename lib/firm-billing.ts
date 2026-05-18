// Firm billing aggregate helpers — powers /firm-portal/billing (W4.23).
//
// The "single firm payment method" model: a firm admin's existing Stripe
// customer (stored on professionals.stripe_customer_id) is the firm's
// billing relationship. Individual advisors keep their own credit
// balance (no allocation across members at the database level yet);
// the dashboard surfaces the aggregate + per-member breakdown so the
// firm admin can monitor and topup any member who is low.
//
// Read access here goes through the admin client because the underlying
// professionals rows for sibling firm members are NOT visible under
// the anon SELECT policy ("Public can view active" filters by status +
// visibility flags that don't always match firm-internal needs). Every
// caller MUST gate on is_firm_admin before invoking these helpers.

// eslint-disable-next-line no-restricted-imports -- Cross-member aggregation: a firm admin needs to read sibling professionals' credit balances + lifetime spend, which the anon SELECT policy doesn't expose (status + visibility filtering). All call sites in app/firm-portal/billing/* gate on is_firm_admin first.
import { createAdminClient } from "@/lib/supabase/admin";

export interface FirmBillingMember {
  id: number;
  name: string;
  slug: string;
  email: string;
  role: string;
  isFirmAdmin: boolean;
  creditBalanceCents: number;
  lifetimeCreditCents: number;
  lifetimeSpendCents: number;
  autoRechargeEnabled: boolean;
  hasSavedCard: boolean;
  lastLoginAt: string | null;
  isLowBalance: boolean;
}

export interface FirmBillingPaymentMethod {
  // The firm-admin advisor whose Stripe customer is the firm's billing
  // relationship. Null when no firm admin has a Stripe customer yet.
  advisorId: number;
  advisorName: string;
  stripeCustomerId: string;
}

export interface FirmBillingSummary {
  firmId: number;
  firmSlug: string;
  firmName: string;
  totalCreditBalanceCents: number;
  totalLifetimeCreditCents: number;
  totalLifetimeSpendCents: number;
  activeMemberCount: number;
  pendingMemberCount: number;
  lowBalanceMemberCount: number;
  members: FirmBillingMember[];
  paymentMethod: FirmBillingPaymentMethod | null;
}

// Threshold below which a member is flagged as "low balance" on the
// dashboard. Mirrors the auto-recharge default ($50 = 5,000 cents) so
// admins see the same threshold the cron uses.
export const LOW_BALANCE_THRESHOLD_CENTS = 5000;

interface ProfessionalRow {
  id: number;
  name: string;
  slug: string;
  email: string;
  role: string | null;
  is_firm_admin: boolean | null;
  status: string | null;
  credit_balance_cents: number | null;
  lifetime_credit_cents: number | null;
  lifetime_lead_spend_cents: number | null;
  auto_recharge_enabled: boolean | null;
  stripe_customer_id: string | null;
  stripe_default_payment_method: string | null;
  last_login_at: string | null;
}

function mapMember(row: ProfessionalRow): FirmBillingMember {
  const balance = row.credit_balance_cents ?? 0;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    email: row.email,
    role: row.role ?? "member",
    isFirmAdmin: row.is_firm_admin ?? false,
    creditBalanceCents: balance,
    lifetimeCreditCents: row.lifetime_credit_cents ?? 0,
    lifetimeSpendCents: row.lifetime_lead_spend_cents ?? 0,
    autoRechargeEnabled: row.auto_recharge_enabled ?? false,
    hasSavedCard: Boolean(row.stripe_default_payment_method),
    lastLoginAt: row.last_login_at,
    isLowBalance: balance < LOW_BALANCE_THRESHOLD_CENTS,
  };
}

function pickPaymentMethod(
  members: ProfessionalRow[],
): FirmBillingPaymentMethod | null {
  // Prefer the firm admin's Stripe customer (the "single firm payment
  // method"). Fall back to any other member with a customer so the
  // dashboard can still link out to a Stripe portal — uncommon but
  // possible during a transition where the firm admin hasn't paid yet.
  const candidates = members
    .filter((m) => m.stripe_customer_id)
    .sort((a, b) => {
      // Firm admins first, then by lifetime credit (most-paying member
      // is most likely to be the real billing contact).
      if ((a.is_firm_admin ?? false) !== (b.is_firm_admin ?? false)) {
        return a.is_firm_admin ? -1 : 1;
      }
      return (b.lifetime_credit_cents ?? 0) - (a.lifetime_credit_cents ?? 0);
    });

  const winner = candidates[0];
  if (!winner || !winner.stripe_customer_id) return null;

  return {
    advisorId: winner.id,
    advisorName: winner.name,
    stripeCustomerId: winner.stripe_customer_id,
  };
}

export interface FirmBillingSummaryOptions {
  // Override the admin client (testing only — production calls always
  // construct a fresh client per-request).
  client?: ReturnType<typeof createAdminClient>;
}

export async function getFirmBillingSummary(
  firmId: number,
  options: FirmBillingSummaryOptions = {},
): Promise<FirmBillingSummary | null> {
  const client = options.client ?? createAdminClient();

  const { data: firm, error: firmErr } = await client
    .from("advisor_firms")
    .select("id, slug, name, status")
    .eq("id", firmId)
    .single();
  if (firmErr || !firm || firm.status !== "active") return null;

  const { data: rows, error: rowsErr } = await client
    .from("professionals")
    .select(
      "id, name, slug, email, role, is_firm_admin, status, credit_balance_cents, lifetime_credit_cents, lifetime_lead_spend_cents, auto_recharge_enabled, stripe_customer_id, stripe_default_payment_method, last_login_at",
    )
    .eq("firm_id", firmId)
    .in("status", ["active", "pending"])
    .order("is_firm_admin", { ascending: false })
    .order("credit_balance_cents", { ascending: false });
  if (rowsErr || !rows) return null;

  const typed = rows as ProfessionalRow[];
  const activeMembers = typed.filter((r) => r.status === "active");
  const pendingMembers = typed.filter((r) => r.status === "pending");

  const total = activeMembers.reduce(
    (acc, r) => {
      acc.balance += r.credit_balance_cents ?? 0;
      acc.lifetimeCredit += r.lifetime_credit_cents ?? 0;
      acc.lifetimeSpend += r.lifetime_lead_spend_cents ?? 0;
      if ((r.credit_balance_cents ?? 0) < LOW_BALANCE_THRESHOLD_CENTS) {
        acc.lowBalance += 1;
      }
      return acc;
    },
    { balance: 0, lifetimeCredit: 0, lifetimeSpend: 0, lowBalance: 0 },
  );

  return {
    firmId: firm.id,
    firmSlug: firm.slug,
    firmName: firm.name,
    totalCreditBalanceCents: total.balance,
    totalLifetimeCreditCents: total.lifetimeCredit,
    totalLifetimeSpendCents: total.lifetimeSpend,
    activeMemberCount: activeMembers.length,
    pendingMemberCount: pendingMembers.length,
    lowBalanceMemberCount: total.lowBalance,
    members: typed.map(mapMember),
    paymentMethod: pickPaymentMethod(activeMembers),
  };
}

export interface FirmAdminContext {
  advisorId: number;
  firmId: number;
}

export async function resolveFirmAdminContext(
  advisorId: number,
): Promise<FirmAdminContext | null> {
  const admin = createAdminClient();
  const { data: advisor } = await admin
    .from("professionals")
    .select("id, firm_id, is_firm_admin")
    .eq("id", advisorId)
    .single();
  if (!advisor?.is_firm_admin || !advisor.firm_id) return null;
  return { advisorId: advisor.id, firmId: advisor.firm_id };
}
