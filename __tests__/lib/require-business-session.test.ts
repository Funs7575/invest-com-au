import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

let mockUser: { id: string } | null = null;
let mockRow: { id: number } | null = null;
let mockError: { message: string } | null = null;

const mockFrom = vi.fn((table: string) => {
  if (table !== "business_accounts") {
    throw new Error(`unexpected table: ${table}`);
  }
  const chain = {
    select: () => chain,
    eq: () => chain,
    in: () => chain,
    maybeSingle: async () =>
      mockError ? { data: null, error: mockError } : { data: mockRow, error: null },
  };
  return chain;
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: async () => ({ data: { user: mockUser } }) },
    from: mockFrom,
  }),
}));

import { requireBusinessSession } from "@/lib/require-business-session";

describe("requireBusinessSession", () => {
  beforeEach(() => {
    mockUser = null;
    mockRow = null;
    mockError = null;
    vi.clearAllMocks();
  });

  it("returns null for unauthenticated requests", async () => {
    expect(await requireBusinessSession()).toBeNull();
  });

  it("returns null when user has no business_accounts row", async () => {
    mockUser = { id: "u1" };
    mockRow = null;
    expect(await requireBusinessSession()).toBeNull();
  });

  it("returns the business id when user has an active row", async () => {
    mockUser = { id: "u1" };
    mockRow = { id: 42 };
    expect(await requireBusinessSession()).toBe(42);
  });

  it("returns null when DB lookup errors out", async () => {
    mockUser = { id: "u1" };
    mockError = { message: "rls denied" };
    expect(await requireBusinessSession()).toBeNull();
  });
});
