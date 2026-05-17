import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "./setup";

// ─── Hoisted mocks ────────────────────────────────────────────────────────────

const { mockGetUser, mockServerFrom, mockAdminFrom, mockGetLatestForUser } = vi.hoisted(() => ({
  mockGetUser: vi.fn(),
  mockServerFrom: vi.fn(),
  mockAdminFrom: vi.fn(),
  mockGetLatestForUser: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: () =>
    Promise.resolve({
      auth: { getUser: mockGetUser },
      from: mockServerFrom,
    }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ from: mockAdminFrom }),
}));

vi.mock("@/lib/quiz-history", () => ({
  getLatestForUser: mockGetLatestForUser,
}));

import HomeActivitySection from "@/components/HomeActivitySection";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * A chainable builder that resolves to { count, error } when awaited.
 * Mirrors the Supabase PostgREST filter builder shape used in the component.
 */
function makeCountChain(count: number | null, error: unknown = null) {
  const result = { count, error };
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    then: (
      onFulfilled?: (value: unknown) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(result).then(onFulfilled, onRejected),
    catch: (onRejected?: (reason: unknown) => unknown) =>
      Promise.resolve(result).catch(onRejected),
    finally: (onFinally?: () => void) => Promise.resolve(result).finally(onFinally),
  };
  return chain;
}

/** A chainable builder that rejects when awaited (simulates a network failure). */
function makeFailChain() {
  const chain: Record<string, unknown> = {
    select: () => chain,
    eq: () => chain,
    then: (_: unknown, onRejected?: (reason: unknown) => unknown) =>
      Promise.reject(new Error("network failure")).then(undefined, onRejected),
    catch: (onRejected?: (reason: unknown) => unknown) =>
      Promise.reject(new Error("network failure")).catch(onRejected),
    finally: (onFinally?: () => void) =>
      Promise.reject(new Error("network failure")).finally(onFinally),
  };
  return chain;
}

const ANON = { data: { user: null } };
const AUTH_USER = { data: { user: { id: "user-abc" } } };

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("HomeActivitySection", () => {
  beforeEach(() => {
    mockGetUser.mockReset();
    mockServerFrom.mockReset();
    mockAdminFrom.mockReset();
    mockGetLatestForUser.mockReset();
  });

  it("returns null for anonymous users", async () => {
    mockGetUser.mockResolvedValue(ANON);
    expect(await HomeActivitySection()).toBeNull();
    // No DB queries should fire
    expect(mockServerFrom).not.toHaveBeenCalled();
    expect(mockAdminFrom).not.toHaveBeenCalled();
  });

  it("returns null for authenticated users with no activity", async () => {
    mockGetUser.mockResolvedValue(AUTH_USER);
    mockServerFrom.mockReturnValue(makeCountChain(0));
    mockAdminFrom.mockReturnValue(makeCountChain(0));
    mockGetLatestForUser.mockResolvedValue(null);
    expect(await HomeActivitySection()).toBeNull();
  });

  it("renders the shortlist card when the user has shortlisted brokers", async () => {
    mockGetUser.mockResolvedValue(AUTH_USER);
    mockServerFrom.mockReturnValue(makeCountChain(3));
    mockAdminFrom.mockReturnValue(makeCountChain(0));
    mockGetLatestForUser.mockResolvedValue(null);

    const ui = await HomeActivitySection();
    render(<>{ui}</>);

    expect(screen.getByText("3 brokers in your shortlist")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /3 brokers in your shortlist/i })).toHaveAttribute(
      "href",
      "/shortlist",
    );
  });

  it("uses singular 'broker' when shortlist count is 1", async () => {
    mockGetUser.mockResolvedValue(AUTH_USER);
    mockServerFrom.mockReturnValue(makeCountChain(1));
    mockAdminFrom.mockReturnValue(makeCountChain(0));
    mockGetLatestForUser.mockResolvedValue(null);

    const ui = await HomeActivitySection();
    render(<>{ui}</>);
    expect(screen.getByText("1 broker in your shortlist")).toBeInTheDocument();
  });

  it("renders the quiz match card linking to the broker slug", async () => {
    mockGetUser.mockResolvedValue(AUTH_USER);
    mockServerFrom.mockReturnValue(makeCountChain(0));
    mockAdminFrom.mockReturnValue(makeCountChain(0));
    mockGetLatestForUser.mockResolvedValue({
      id: 1,
      user_id: "user-abc",
      session_id: null,
      answers: {},
      inferred_vertical: "shares",
      top_match_slug: "commsec",
      completed_at: "2026-05-01T10:00:00Z",
      resumed_from: null,
      created_at: "2026-05-01T10:00:00Z",
    });

    const ui = await HomeActivitySection();
    render(<>{ui}</>);

    const link = screen.getByRole("link", { name: /commsec — keep comparing/i });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "/broker/commsec");
  });

  it("renders the saved advisors card", async () => {
    mockGetUser.mockResolvedValue(AUTH_USER);
    mockServerFrom.mockReturnValue(makeCountChain(0));
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "user_bookmarks") return makeCountChain(4);
      return makeCountChain(0);
    });
    mockGetLatestForUser.mockResolvedValue(null);

    const ui = await HomeActivitySection();
    render(<>{ui}</>);

    expect(screen.getByText("You saved 4 advisors")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /4 advisors/i })).toHaveAttribute(
      "href",
      "/account/bookmarks",
    );
  });

  it("renders the saved comparisons card", async () => {
    mockGetUser.mockResolvedValue(AUTH_USER);
    mockServerFrom.mockReturnValue(makeCountChain(0));
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "saved_broker_comparisons") return makeCountChain(2);
      return makeCountChain(0);
    });
    mockGetLatestForUser.mockResolvedValue(null);

    const ui = await HomeActivitySection();
    render(<>{ui}</>);

    expect(screen.getByText("You have 2 saved comparisons")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /2 saved comparisons/i })).toHaveAttribute(
      "href",
      "/account/saved",
    );
  });

  it("renders up to 4 cards when all activity data is present", async () => {
    mockGetUser.mockResolvedValue(AUTH_USER);
    mockServerFrom.mockReturnValue(makeCountChain(5));
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "user_bookmarks") return makeCountChain(3);
      if (table === "saved_broker_comparisons") return makeCountChain(2);
      return makeCountChain(0);
    });
    mockGetLatestForUser.mockResolvedValue({
      id: 2,
      user_id: "user-abc",
      session_id: null,
      answers: {},
      inferred_vertical: "crypto",
      top_match_slug: "stake",
      completed_at: "2026-05-10T08:00:00Z",
      resumed_from: null,
      created_at: "2026-05-10T08:00:00Z",
    });

    const ui = await HomeActivitySection();
    render(<>{ui}</>);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(4);
    expect(screen.getByText("5 brokers in your shortlist")).toBeInTheDocument();
    expect(screen.getByText(/stake — keep comparing/i)).toBeInTheDocument();
    expect(screen.getByText("You saved 3 advisors")).toBeInTheDocument();
    expect(screen.getByText("You have 2 saved comparisons")).toBeInTheDocument();
  });

  it("renders the section heading when there is activity", async () => {
    mockGetUser.mockResolvedValue(AUTH_USER);
    mockServerFrom.mockReturnValue(makeCountChain(2));
    mockAdminFrom.mockReturnValue(makeCountChain(0));
    mockGetLatestForUser.mockResolvedValue(null);

    const ui = await HomeActivitySection();
    render(<>{ui}</>);

    expect(
      screen.getByText("Welcome back — pick up where you left off"),
    ).toBeInTheDocument();
  });

  it("omits cards whose DB queries fail (resilience)", async () => {
    mockGetUser.mockResolvedValue(AUTH_USER);
    // Shortlist query rejects — that card should be skipped gracefully
    mockServerFrom.mockReturnValue(makeFailChain());
    mockAdminFrom.mockImplementation((table: string) => {
      if (table === "user_bookmarks") return makeCountChain(1);
      return makeCountChain(0);
    });
    mockGetLatestForUser.mockResolvedValue(null);

    const ui = await HomeActivitySection();
    render(<>{ui}</>);

    // Advisor card still renders despite shortlist failure
    expect(screen.getByText("You saved 1 advisor")).toBeInTheDocument();
    // No shortlist card
    expect(screen.queryByText(/shortlist/i)).toBeNull();
  });
});
