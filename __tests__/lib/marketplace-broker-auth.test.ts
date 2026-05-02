import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

// Configurable per-test state
let mockUser: { id: string } | null = null;
let mockAccount: Record<string, unknown> | null = null;
let mockWallet: Record<string, unknown> | null = null;
let mockBrokerAnyAccount: { id: string } | null = null; // for isBrokerUser (any status)

const makeSupabaseMock = () => ({
  auth: {
    getUser: vi.fn(async () => ({ data: { user: mockUser } })),
  },
  from: vi.fn((table: string) => {
    if (table === "broker_accounts") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({ data: mockAccount })),
            })),
            maybeSingle: vi.fn(async () => ({ data: mockBrokerAnyAccount })),
          })),
        })),
      };
    }
    if (table === "broker_wallets") {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: mockWallet })),
          })),
        })),
      };
    }
    return {};
  }),
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Import after mocks are registered
import { createClient } from "@/lib/supabase/server";
import { getBrokerAccount, requireBrokerAccount, isBrokerUser } from "@/lib/marketplace/broker-auth";

beforeEach(() => {
  mockUser = null;
  mockAccount = null;
  mockWallet = null;
  mockBrokerAnyAccount = null;
  vi.mocked(createClient).mockResolvedValue(makeSupabaseMock() as never);
});

// ── getBrokerAccount ──────────────────────────────────────────────────────────

describe("getBrokerAccount", () => {
  it("returns null when not authenticated (no user)", async () => {
    mockUser = null;
    const result = await getBrokerAccount();
    expect(result).toBeNull();
  });

  it("returns null when user has no active broker account", async () => {
    mockUser = { id: "user-1" };
    mockAccount = null;
    const result = await getBrokerAccount();
    expect(result).toBeNull();
  });

  it("returns session with account and existing wallet", async () => {
    mockUser = { id: "user-1" };
    mockAccount = {
      id: "acc-1",
      auth_user_id: "user-1",
      broker_slug: "test-broker",
      email: "test@example.com",
      full_name: "Test Broker",
      role: "owner",
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };
    mockWallet = {
      id: 42,
      broker_slug: "test-broker",
      balance_cents: 5000,
      lifetime_deposited_cents: 10000,
      lifetime_spent_cents: 5000,
      currency: "AUD",
      auto_topup_enabled: false,
      low_balance_alert_enabled: true,
      updated_at: "2026-01-01T00:00:00Z",
    };

    const result = await getBrokerAccount();
    expect(result).not.toBeNull();
    expect(result!.account.broker_slug).toBe("test-broker");
    expect(result!.wallet.id).toBe(42);
    expect(result!.wallet.balance_cents).toBe(5000);
  });

  it("returns a default wallet when no wallet row exists", async () => {
    mockUser = { id: "user-1" };
    mockAccount = {
      id: "acc-1",
      auth_user_id: "user-1",
      broker_slug: "test-broker",
      email: "test@example.com",
      full_name: "Test Broker",
      role: "owner",
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };
    mockWallet = null; // no wallet row

    const result = await getBrokerAccount();
    expect(result).not.toBeNull();
    expect(result!.wallet.broker_slug).toBe("test-broker");
    expect(result!.wallet.balance_cents).toBe(0);
    expect(result!.wallet.currency).toBe("AUD");
    expect(result!.wallet.lifetime_deposited_cents).toBe(0);
    expect(result!.wallet.lifetime_spent_cents).toBe(0);
  });

  it("default wallet has an id of 0 when created as fallback", async () => {
    mockUser = { id: "user-2" };
    mockAccount = {
      id: "acc-2",
      auth_user_id: "user-2",
      broker_slug: "no-wallet-broker",
      email: "x@x.com",
      full_name: "No Wallet",
      role: "owner",
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };
    mockWallet = null;

    const result = await getBrokerAccount();
    expect(result!.wallet.id).toBe(0);
  });
});

// ── requireBrokerAccount ──────────────────────────────────────────────────────

describe("requireBrokerAccount", () => {
  it("redirects to broker-portal login when no session", async () => {
    mockUser = null;
    await expect(requireBrokerAccount()).rejects.toThrow("REDIRECT:/broker-portal/login");
  });

  it("redirects when user has no active broker account", async () => {
    mockUser = { id: "user-1" };
    mockAccount = null;
    await expect(requireBrokerAccount()).rejects.toThrow("REDIRECT:/broker-portal/login");
  });

  it("returns session when active broker account exists", async () => {
    mockUser = { id: "user-1" };
    mockAccount = {
      id: "acc-1",
      auth_user_id: "user-1",
      broker_slug: "active-broker",
      email: "b@b.com",
      full_name: "Active Broker",
      role: "owner",
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };
    mockWallet = null;

    const result = await requireBrokerAccount();
    expect(result.account.broker_slug).toBe("active-broker");
  });
});

// ── isBrokerUser ──────────────────────────────────────────────────────────────

describe("isBrokerUser", () => {
  it("returns false when not authenticated", async () => {
    mockUser = null;
    expect(await isBrokerUser()).toBe(false);
  });

  it("returns false when user has no broker account of any status", async () => {
    mockUser = { id: "user-1" };
    mockBrokerAnyAccount = null;
    expect(await isBrokerUser()).toBe(false);
  });

  it("returns true when user has a broker account (any status)", async () => {
    mockUser = { id: "user-1" };
    mockBrokerAnyAccount = { id: "acc-pending" };
    expect(await isBrokerUser()).toBe(true);
  });
});
