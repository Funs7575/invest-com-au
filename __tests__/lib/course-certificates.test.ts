import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Unit tests for lib/course-certificates.ts
 *
 * Covers:
 *  - cpdYearFor: the ASIC Jul–Jun CPD-year boundary math (pure function).
 *  - issueCertificate certificate numbering: the INV-YYYY-NNNNN format and
 *    the count-derived sequence (exercised through the public entry point —
 *    nextCertificateNumber is private).
 *  - issueCertificate idempotency: an existing certificate for the same
 *    user+course is returned unchanged and no new row is inserted.
 *
 * The Supabase admin client and logger are mocked. Mock fns are declared via
 * vi.hoisted() so they exist before vi.mock() factories run (CLAUDE.md §
 * "Vitest vi.mock() hoisting").
 */

const { mockAdminFrom } = vi.hoisted(() => ({ mockAdminFrom: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockAdminFrom })),
}));

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

import { cpdYearFor, issueCertificate } from "@/lib/course-certificates";

// ── Chain builders ────────────────────────────────────────────────────────────
// Each builder returns an object whose query-builder methods (select/eq/in/gte/
// lt) are chainable (return the same object) and whose terminal method resolves
// to the given Supabase-shaped result. Which method is terminal depends on the
// call site, so we make several terminal methods resolve to the result and the
// rest chain.

type Result = { data?: unknown; error?: unknown; count?: number };

/**
 * A chain where the LAST query-builder method awaited resolves to `result`.
 * We make select/eq/in/gte/lt all return the chain, but ALSO make the chain
 * itself awaitable (thenable) so that an awaited `.eq()` / `.in()` / `.lt()`
 * terminal resolves to `result`. maybeSingle/single resolve explicitly.
 */
function makeChain(result: Result) {
  const chain: Record<string, unknown> = {};
  const ret = () => chain;
  chain.select = vi.fn(ret);
  chain.eq = vi.fn(ret);
  chain.in = vi.fn(ret);
  chain.gte = vi.fn(ret);
  chain.lt = vi.fn(ret);
  chain.maybeSingle = vi.fn(() => Promise.resolve(result));
  chain.single = vi.fn(() => Promise.resolve(result));
  // Make the builder itself awaitable so terminal `.eq()/.in()/.lt()` chains
  // (which are not followed by maybeSingle/single) resolve to `result`.
  chain.then = (onFulfilled: (v: Result) => unknown) =>
    Promise.resolve(result).then(onFulfilled);
  return chain;
}

function makeInsertChain(result: Result) {
  const chain: Record<string, unknown> = {};
  chain.insert = vi.fn(() => chain);
  chain.select = vi.fn(() => chain);
  chain.single = vi.fn(() => Promise.resolve(result));
  return chain;
}

function makeUpsertChain(result: Result) {
  const chain: Record<string, unknown> = {};
  chain.upsert = vi.fn(() => Promise.resolve(result));
  return chain;
}

const USER = "user-uuid-1";
const SLUG = "intro-to-etfs";
const COURSE = {
  id: "course-1",
  title: "Intro to ETFs",
  slug: SLUG,
  is_cpd_eligible: false,
  cpd_hours: null,
  cpd_category: null,
};

/**
 * Wire mockAdminFrom to dispatch per table. `course_certificates` is queried
 * multiple times in one issueCertificate() call (idempotency select, then the
 * count query inside nextCertificateNumber, then the insert), so it draws from
 * an ordered queue.
 */
function wireHappyPath(opts: {
  course?: unknown;
  lessons?: { id: number }[];
  completedLessonIds?: number[];
  existingCert?: unknown;
  certCount?: number;
  insertResult?: Result;
  professional?: unknown;
} = {}) {
  const lessons = opts.lessons ?? [{ id: 1 }, { id: 2 }];
  const completed = (opts.completedLessonIds ?? lessons.map((l) => l.id)).map(
    (id) => ({ lesson_id: id }),
  );

  // course_certificates call sequence:
  //   1) idempotency select-eq-eq-maybeSingle  → existingCert (default null)
  //   2) count select-gte-lt                    → { count }
  //   3) insert-select-single                   → insertResult
  const certCertQueue = [
    makeChain({ data: opts.existingCert ?? null }),
    makeChain({ count: opts.certCount ?? 0 }),
    makeInsertChain(
      opts.insertResult ?? {
        data: {
          id: "cert-1",
          user_id: USER,
          professional_id: null,
          course_id: COURSE.id,
          purchase_id: null,
          certificate_number: "PLACEHOLDER",
          issued_at: "2026-03-01T00:00:00.000Z",
          cpd_hours: null,
          cpd_category: null,
          completion_score: null,
          created_at: "2026-03-01T00:00:00.000Z",
        },
        error: null,
      },
    ),
  ];

  mockAdminFrom.mockImplementation((table: string) => {
    switch (table) {
      case "courses":
        return makeChain({ data: opts.course === undefined ? COURSE : opts.course });
      case "course_lessons":
        return makeChain({ data: lessons });
      case "course_progress":
        return makeChain({ data: completed });
      case "professionals":
        return makeChain({ data: opts.professional ?? null });
      case "course_certificates":
        return certCertQueue.shift() ?? makeChain({ data: null });
      case "cpd_credits":
        return makeUpsertChain({ error: null });
      default:
        return makeChain({ data: null });
    }
  });

  return { certCertQueue };
}

describe("cpdYearFor — ASIC Jul–Jun CPD year (ending calendar year)", () => {
  it("returns next calendar year for July (start of CPD year)", () => {
    // 1 July 2025 → CPD year ending 2026
    expect(cpdYearFor(new Date(Date.UTC(2025, 6, 1)))).toBe(2026);
  });

  it("returns next calendar year for any month from July through December", () => {
    expect(cpdYearFor(new Date(Date.UTC(2025, 6, 31)))).toBe(2026); // 31 Jul
    expect(cpdYearFor(new Date(Date.UTC(2025, 11, 31)))).toBe(2026); // 31 Dec
  });

  it("returns the same calendar year for January through June", () => {
    expect(cpdYearFor(new Date(Date.UTC(2026, 0, 1)))).toBe(2026); // 1 Jan
    expect(cpdYearFor(new Date(Date.UTC(2026, 5, 30)))).toBe(2026); // 30 Jun (last day)
  });

  it("treats the Jun 30 / Jul 1 boundary as the year flip", () => {
    expect(cpdYearFor(new Date(Date.UTC(2026, 5, 30)))).toBe(2026); // 30 Jun → 2026
    expect(cpdYearFor(new Date(Date.UTC(2026, 6, 1)))).toBe(2027); // 1 Jul → 2027
  });

  it("uses UTC months (not local time)", () => {
    // A timestamp that is 30 Jun in UTC must map to the closing year, even
    // though some local timezones would render it as 1 Jul.
    const lastSecondOfJuneUtc = new Date("2026-06-30T23:59:59.000Z");
    expect(cpdYearFor(lastSecondOfJuneUtc)).toBe(2026);
    const firstSecondOfJulyUtc = new Date("2026-07-01T00:00:00.000Z");
    expect(cpdYearFor(firstSecondOfJulyUtc)).toBe(2027);
  });
});

describe("issueCertificate — certificate numbering (INV-YYYY-NNNNN)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Pin "now" so the year segment and issued_at are deterministic.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T10:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("formats the number as INV-<current year>-<5-digit zero-padded seq>", async () => {
    // 0 existing certs this year → seq 1 → 00001
    let captured: Record<string, unknown> | undefined;
    const insertChain = makeInsertChain({
      data: {
        id: "cert-1",
        user_id: USER,
        professional_id: null,
        course_id: COURSE.id,
        purchase_id: null,
        certificate_number: "",
        issued_at: "2026-03-15T10:00:00.000Z",
        cpd_hours: null,
        cpd_category: null,
        completion_score: null,
        created_at: "2026-03-15T10:00:00.000Z",
      },
      error: null,
    });
    // Capture the insert payload so we can assert on the generated number.
    (insertChain.insert as ReturnType<typeof vi.fn>).mockImplementation(
      (payload: Record<string, unknown>) => {
        captured = payload;
        return insertChain;
      },
    );

    const certCertQueue = [
      makeChain({ data: null }), // idempotency: none exists
      makeChain({ count: 0 }), // count this year
      insertChain, // insert
    ];
    mockAdminFrom.mockImplementation((table: string) => {
      switch (table) {
        case "courses":
          return makeChain({ data: COURSE });
        case "course_lessons":
          return makeChain({ data: [{ id: 1 }, { id: 2 }] });
        case "course_progress":
          return makeChain({ data: [{ lesson_id: 1 }, { lesson_id: 2 }] });
        case "professionals":
          return makeChain({ data: null });
        case "course_certificates":
          return certCertQueue.shift() ?? makeChain({ data: null });
        default:
          return makeChain({ data: null });
      }
    });

    await issueCertificate(USER, SLUG);

    expect(captured).toBeDefined();
    expect(captured!.certificate_number).toBe("INV-2026-00001");
  });

  it("increments the sequence from the current-year certificate count", async () => {
    // 41 existing certs this year → seq 42 → 00042
    let captured: Record<string, unknown> | undefined;
    const insertChain = makeInsertChain({
      data: { id: "cert-x", certificate_number: "" },
      error: null,
    });
    (insertChain.insert as ReturnType<typeof vi.fn>).mockImplementation(
      (payload: Record<string, unknown>) => {
        captured = payload;
        return insertChain;
      },
    );

    const certCertQueue = [
      makeChain({ data: null }),
      makeChain({ count: 41 }),
      insertChain,
    ];
    mockAdminFrom.mockImplementation((table: string) => {
      switch (table) {
        case "courses":
          return makeChain({ data: COURSE });
        case "course_lessons":
          return makeChain({ data: [{ id: 1 }] });
        case "course_progress":
          return makeChain({ data: [{ lesson_id: 1 }] });
        case "professionals":
          return makeChain({ data: null });
        case "course_certificates":
          return certCertQueue.shift() ?? makeChain({ data: null });
        default:
          return makeChain({ data: null });
      }
    });

    await issueCertificate(USER, SLUG);
    expect(captured!.certificate_number).toBe("INV-2026-00042");
  });
});

describe("issueCertificate — idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-15T10:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the existing certificate unchanged and does not insert a new row", async () => {
    const existing = {
      id: "cert-existing",
      user_id: USER,
      professional_id: null,
      course_id: COURSE.id,
      purchase_id: null,
      certificate_number: "INV-2025-00007",
      issued_at: "2025-09-01T00:00:00.000Z",
      cpd_hours: null,
      cpd_category: null,
      completion_score: null,
      created_at: "2025-09-01T00:00:00.000Z",
    };

    const insertChain = makeInsertChain({ data: { id: "should-not-happen" }, error: null });

    // course_certificates: first call (idempotency) returns the existing cert,
    // so neither the count query nor the insert should ever run.
    const certCertQueue = [makeChain({ data: existing }), makeChain({ count: 0 }), insertChain];
    mockAdminFrom.mockImplementation((table: string) => {
      switch (table) {
        case "courses":
          return makeChain({ data: COURSE });
        case "course_lessons":
          return makeChain({ data: [{ id: 1 }, { id: 2 }] });
        case "course_progress":
          return makeChain({ data: [{ lesson_id: 1 }, { lesson_id: 2 }] });
        case "professionals":
          return makeChain({ data: null });
        case "course_certificates":
          return certCertQueue.shift() ?? makeChain({ data: null });
        default:
          return makeChain({ data: null });
      }
    });

    const result = await issueCertificate(USER, SLUG);

    expect(result).toEqual(existing);
    expect(result?.certificate_number).toBe("INV-2025-00007");
    // The insert chain must never have been touched.
    expect(insertChain.insert).not.toHaveBeenCalled();
    // The count query (2nd course_certificates chain) must still be queued —
    // idempotency short-circuits before nextCertificateNumber().
    expect(certCertQueue).toHaveLength(2);
  });

  it("returns null without inserting when not all lessons are complete", async () => {
    const insertChain = makeInsertChain({ data: { id: "should-not-happen" }, error: null });
    const certCertQueue = [makeChain({ data: null }), makeChain({ count: 0 }), insertChain];
    mockAdminFrom.mockImplementation((table: string) => {
      switch (table) {
        case "courses":
          return makeChain({ data: COURSE });
        case "course_lessons":
          return makeChain({ data: [{ id: 1 }, { id: 2 }, { id: 3 }] });
        case "course_progress":
          // Only 2 of 3 lessons complete.
          return makeChain({ data: [{ lesson_id: 1 }, { lesson_id: 2 }] });
        case "professionals":
          return makeChain({ data: null });
        case "course_certificates":
          return certCertQueue.shift() ?? makeChain({ data: null });
        default:
          return makeChain({ data: null });
      }
    });

    const result = await issueCertificate(USER, SLUG);
    expect(result).toBeNull();
    expect(insertChain.insert).not.toHaveBeenCalled();
  });

  it("returns null when the course does not exist", async () => {
    wireHappyPath({ course: null });
    const result = await issueCertificate(USER, "does-not-exist");
    expect(result).toBeNull();
  });
});
