import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// ── Mocks ──────────────────────────────────────────────────────────────────────

const mockIsAllowed = vi.fn();
vi.mock("@/lib/rate-limit-db", () => ({
  isAllowed: (...a: unknown[]) => mockIsAllowed(...a),
  ipKey: () => "127.0.0.1",
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({ error: vi.fn(), info: vi.fn(), warn: vi.fn(), debug: vi.fn() })),
}));

const mockChallengesEnabled = vi.fn(async (): Promise<boolean> => true);
const mockGetEnrolledCount = vi.fn(async (..._a: unknown[]): Promise<number> => 0);
vi.mock("@/lib/challenges/data", () => ({
  challengesEnabled: () => mockChallengesEnabled(),
  getEnrolledCount: (...a: unknown[]) => mockGetEnrolledCount(...a),
}));

// Per-table builder: challenges → cohort row; challenge_enrolments → existing
// enrolment + capture inserts.
interface TableState {
  data?: unknown;
  error?: unknown;
}
let tables: Record<string, TableState> = {};
const inserts: { table: string; payload: unknown }[] = [];

function makeChain(table: string) {
  const state = tables[table] ?? {};
  const terminal = { data: state.data ?? null, error: state.error ?? null };
  const chain: Record<string, unknown> = {
    then: (resolve: (v: unknown) => unknown) => Promise.resolve(resolve(terminal)),
  };
  for (const m of ["select", "eq", "neq", "in", "order", "limit", "update", "delete"]) {
    chain[m] = vi.fn(() => chain);
  }
  chain.insert = vi.fn((payload: unknown) => {
    inserts.push({ table, payload });
    return { ...chain, error: state.error ?? null };
  });
  chain.maybeSingle = vi.fn(async () => terminal);
  chain.single = vi.fn(async () => terminal);
  return chain;
}

const mockFrom = vi.fn((t: string) => makeChain(t));
const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: { getUser: mockGetUser },
    from: (t: string) => mockFrom(t),
  })),
}));

import { POST } from "@/app/api/challenges/enrol/route";

function post(body: unknown): NextRequest {
  return new NextRequest("http://localhost/api/challenges/enrol", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const OPEN_COHORT = {
  id: "ch1",
  slug: "investment-ready-21",
  title: "Get Investment-Ready in 21 Days",
  description: null,
  curriculum_key: "investment-ready-21",
  starts_at: "2026-06-12",
  ends_at: null,
  enrolment_open: true,
  max_cohort: null,
  club_id: null,
  created_at: "2026-06-01",
};

beforeEach(() => {
  vi.clearAllMocks();
  tables = {};
  inserts.length = 0;
  mockIsAllowed.mockResolvedValue(true);
  mockChallengesEnabled.mockResolvedValue(true);
  mockGetEnrolledCount.mockResolvedValue(0);
  mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
});

describe("POST /api/challenges/enrol — gating + validation", () => {
  it("404s when the flag is off (fail-closed)", async () => {
    mockChallengesEnabled.mockResolvedValue(false);
    const res = await POST(post({ slug: "investment-ready-21" }));
    expect(res.status).toBe(404);
  });

  it("400s on an invalid body (missing slug)", async () => {
    const res = await POST(post({}));
    expect(res.status).toBe(400);
  });

  it("429s when rate-limited", async () => {
    mockIsAllowed.mockResolvedValue(false);
    const res = await POST(post({ slug: "investment-ready-21" }));
    expect(res.status).toBe(429);
  });

  it("401s when unauthenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null });
    const res = await POST(post({ slug: "investment-ready-21" }));
    expect(res.status).toBe(401);
  });

  it("404s when the cohort slug is unknown", async () => {
    tables = { challenges: { data: null }, challenge_enrolments: { data: null } };
    const res = await POST(post({ slug: "nope" }));
    expect(res.status).toBe(404);
  });
});

describe("POST /api/challenges/enrol — enrolment logic", () => {
  it("creates an 'enrolled' row for an open cohort", async () => {
    tables = {
      challenges: { data: OPEN_COHORT },
      challenge_enrolments: { data: null },
    };
    const res = await POST(post({ slug: "investment-ready-21" }));
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, status: "enrolled", already: false });
    const ins = inserts.find((i) => i.table === "challenge_enrolments");
    expect((ins?.payload as { status: string }).status).toBe("enrolled");
  });

  it("is idempotent — returns the existing enrolment without inserting", async () => {
    tables = {
      challenges: { data: OPEN_COHORT },
      challenge_enrolments: { data: { id: "e1", status: "enrolled" } },
    };
    const res = await POST(post({ slug: "investment-ready-21" }));
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, already: true, status: "enrolled" });
    expect(inserts.find((i) => i.table === "challenge_enrolments")).toBeUndefined();
  });

  it("waitlists when the cohort is closed", async () => {
    tables = {
      challenges: { data: { ...OPEN_COHORT, enrolment_open: false } },
      challenge_enrolments: { data: null },
    };
    const res = await POST(post({ slug: "investment-ready-21" }));
    const body = await res.json();
    expect(body.status).toBe("waitlisted");
    const ins = inserts.find((i) => i.table === "challenge_enrolments");
    expect((ins?.payload as { status: string }).status).toBe("waitlisted");
  });

  it("waitlists when the cohort is at capacity", async () => {
    tables = {
      challenges: { data: { ...OPEN_COHORT, max_cohort: 10 } },
      challenge_enrolments: { data: null },
    };
    mockGetEnrolledCount.mockResolvedValue(10);
    const res = await POST(post({ slug: "investment-ready-21" }));
    const body = await res.json();
    expect(body.status).toBe("waitlisted");
  });

  it("treats a unique-violation race as success", async () => {
    tables = {
      challenges: { data: OPEN_COHORT },
      challenge_enrolments: { data: null, error: { code: "23505", message: "dup" } },
    };
    const res = await POST(post({ slug: "investment-ready-21" }));
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, already: true });
  });
});
