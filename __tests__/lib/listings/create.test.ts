import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Unit tests for lib/listings/create.ts.
 *
 *   - happy path: returns ok:true with a Listing
 *   - slug collision: retries once on 23505 and ultimately succeeds
 *   - slug collision exhausted: returns ok:false after MAX_SLUG_RETRIES
 *   - slugifyTitle: deterministic, URL-safe, capped at 64 chars
 */

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import { createListing, slugifyTitle } from "@/lib/listings/create";

interface ChainOptions {
  single?: { data: unknown; error?: unknown };
}

function chain(opts: ChainOptions = {}) {
  const builder: Record<string, unknown> = {};
  const passthrough = () => builder;
  for (const m of ["select", "insert", "update", "eq", "in", "order", "limit"]) {
    builder[m] = vi.fn(passthrough);
  }
  builder.single = vi.fn(() =>
    Promise.resolve(opts.single ?? { data: null, error: null }),
  );
  return builder;
}

function fakeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "11111111-1111-1111-1111-111111111111",
    slug: "test-listing-abc",
    owner_user_id: "user-1",
    owner_email: "owner@example.com",
    title: "Test listing",
    kind: "property",
    asking_price_cents: 100000,
    currency: "AUD",
    location_state: "NSW",
    description: null,
    payload: {},
    status: "draft",
    moderation_notes: null,
    view_count: 0,
    match_request_count: 0,
    created_at: "2026-05-14T00:00:00Z",
    updated_at: "2026-05-14T00:00:00Z",
    approved_at: null,
    rejected_at: null,
    ...overrides,
  };
}

describe("slugifyTitle", () => {
  it("lowercases, trims, replaces spaces with hyphens", () => {
    expect(slugifyTitle("  Hello World  ")).toBe("hello-world");
  });

  it("strips punctuation and diacritics", () => {
    expect(slugifyTitle("Brisbane Café — owner retiring!")).toBe(
      "brisbane-cafe-owner-retiring",
    );
  });

  it("caps at 64 chars", () => {
    const long = "a".repeat(120);
    expect(slugifyTitle(long).length).toBe(64);
  });

  it("returns 'listing' when input has no usable characters", () => {
    expect(slugifyTitle("$$$ !!! ---")).toBe("listing");
  });
});

describe("createListing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns ok:true and the listing on the happy path", async () => {
    const insertChain = chain({ single: { data: fakeRow() } });
    mockFrom.mockReturnValueOnce(insertChain);

    const result = await createListing({
      ownerUserId: "user-1",
      ownerEmail: "owner@example.com",
      title: "Test listing",
      kind: "property",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.listing.title).toBe("Test listing");
      expect(result.listing.kind).toBe("property");
      expect(result.listing.status).toBe("draft");
      expect(result.listing.ownerEmail).toBe("owner@example.com");
    }
  });

  it("retries once on slug collision (23505) and ultimately succeeds", async () => {
    const firstAttempt = chain({
      single: { data: null, error: { code: "23505", message: "dup" } },
    });
    const secondAttempt = chain({ single: { data: fakeRow({ slug: "retry-ok" }) } });
    mockFrom.mockReturnValueOnce(firstAttempt).mockReturnValueOnce(secondAttempt);

    const result = await createListing({
      ownerUserId: "user-1",
      ownerEmail: "owner@example.com",
      title: "Retry me",
      kind: "business",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.listing.slug).toBe("retry-ok");
    }
    expect(mockFrom).toHaveBeenCalledTimes(2);
  });

  it("returns ok:false when slug collision exhausts retries", async () => {
    const failing = () =>
      chain({
        single: { data: null, error: { code: "23505", message: "dup" } },
      });
    // Loop runs attempts 0,1,2 — 3 retries that all collide.
    mockFrom
      .mockReturnValueOnce(failing())
      .mockReturnValueOnce(failing())
      .mockReturnValueOnce(failing());

    const result = await createListing({
      ownerUserId: "user-1",
      ownerEmail: "owner@example.com",
      title: "Always colliding",
      kind: "syndicate",
    });

    expect(result.ok).toBe(false);
  });

  it("returns ok:false on a non-collision DB error without retrying", async () => {
    const erroring = chain({
      single: { data: null, error: { code: "42501", message: "permission denied" } },
    });
    mockFrom.mockReturnValueOnce(erroring);

    const result = await createListing({
      ownerUserId: "user-1",
      ownerEmail: "owner@example.com",
      title: "Forbidden",
      kind: "asset_other",
    });

    expect(result.ok).toBe(false);
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});
