import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  selectLoanRateAdapter,
  selectSavingsRateAdapter,
  LoanRateFeedAdapter,
  LoanRateDbAdapter,
  SavingsRateFeedAdapter,
  SavingsRateDbAdapter,
} from "@/lib/rate-ingest-adapters";

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: vi.fn() })),
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

beforeEach(() => {
  // Clear the CI-stubbed feed vars so the "absent" branches are reachable.
  vi.stubEnv("LOAN_RATE_FEED_URL", "");
  vi.stubEnv("LOAN_RATE_FEED_API_KEY", "");
  vi.stubEnv("SAVINGS_RATE_FEED_URL", "");
  vi.stubEnv("SAVINGS_RATE_FEED_API_KEY", "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("selectLoanRateAdapter", () => {
  it("uses the feed adapter when both URL and API key are set", () => {
    vi.stubEnv("LOAN_RATE_FEED_URL", "https://feed.example.com/loans");
    vi.stubEnv("LOAN_RATE_FEED_API_KEY", "secret-key");
    const { adapter, credentialed } = selectLoanRateAdapter();
    expect(adapter).toBeInstanceOf(LoanRateFeedAdapter);
    expect(credentialed).toBe(true);
  });

  it("falls back to the DB adapter when the API key is missing", () => {
    vi.stubEnv("LOAN_RATE_FEED_URL", "https://feed.example.com/loans");
    vi.stubEnv("LOAN_RATE_FEED_API_KEY", "");
    const { adapter, credentialed } = selectLoanRateAdapter();
    expect(adapter).toBeInstanceOf(LoanRateDbAdapter);
    expect(credentialed).toBe(false);
  });

  it("falls back to the DB adapter when neither is set", () => {
    const { adapter, credentialed } = selectLoanRateAdapter();
    expect(adapter).toBeInstanceOf(LoanRateDbAdapter);
    expect(credentialed).toBe(false);
  });
});

describe("selectSavingsRateAdapter", () => {
  it("uses the feed adapter when both URL and API key are set", () => {
    vi.stubEnv("SAVINGS_RATE_FEED_URL", "https://feed.example.com/savings");
    vi.stubEnv("SAVINGS_RATE_FEED_API_KEY", "secret-key");
    const { adapter, credentialed } = selectSavingsRateAdapter();
    expect(adapter).toBeInstanceOf(SavingsRateFeedAdapter);
    expect(credentialed).toBe(true);
  });

  it("falls back to the DB adapter when the API key is missing", () => {
    vi.stubEnv("SAVINGS_RATE_FEED_URL", "https://feed.example.com/savings");
    vi.stubEnv("SAVINGS_RATE_FEED_API_KEY", "");
    const { adapter, credentialed } = selectSavingsRateAdapter();
    expect(adapter).toBeInstanceOf(SavingsRateDbAdapter);
    expect(credentialed).toBe(false);
  });

  it("falls back to the DB adapter when neither is set", () => {
    const { adapter, credentialed } = selectSavingsRateAdapter();
    expect(adapter).toBeInstanceOf(SavingsRateDbAdapter);
    expect(credentialed).toBe(false);
  });
});
