import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Unit tests for lib/listings/moderate.ts.
 *
 *   - approveListing: idempotent on already-approved rows
 *   - approveListing: updates status + approved_at when pending
 *   - rejectListing: requires non-empty notes
 *   - rejectListing: stamps notes + rejected_at
 *   - rejectListing: idempotent when same notes already present
 *   - submitListingForReview: gates by owner + draft status
 */

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import {
  approveListing,
  rejectListing,
  submitListingForReview,
} from "@/lib/listings/moderate";

interface ChainOptions {
  maybeSingle?: { data: unknown; error?: unknown };
  single?: { data: unknown; error?: unknown };
}

function chain(opts: ChainOptions = {}) {
  const builder: Record<string, unknown> = {};
  const passthrough = () => builder;
  for (const m of ["select", "insert", "update", "eq", "in", "order", "limit"]) {
    builder[m] = vi.fn(passthrough);
  }
  builder.maybeSingle = vi.fn(() =>
    Promise.resolve(opts.maybeSingle ?? { data: null, error: null }),
  );
  builder.single = vi.fn(() =>
    Promise.resolve(opts.single ?? { data: null, error: null }),
  );
  return builder;
}

function fakeRow(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: "id-1",
    slug: "fake-listing-abc",
    owner_user_id: "owner-1",
    owner_email: "owner@example.com",
    title: "Fake listing",
    kind: "property",
    asking_price_cents: null,
    currency: "AUD",
    location_state: null,
    description: null,
    payload: {},
    status: "pending_review",
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

describe("approveListing", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns noOp:true when already approved, no update issued", async () => {
    const fetch = chain({
      maybeSingle: { data: fakeRow({ status: "approved", approved_at: "2026-05-13T00:00:00Z" }) },
    });
    mockFrom.mockReturnValueOnce(fetch);

    const result = await approveListing("id-1", "admin-1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.noOp).toBe(true);
      expect(result.listing.status).toBe("approved");
    }
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });

  it("flips pending_review → approved and stamps approved_at", async () => {
    const fetch = chain({ maybeSingle: { data: fakeRow({ status: "pending_review" }) } });
    const update = chain({
      single: { data: fakeRow({ status: "approved", approved_at: "2026-05-14T01:00:00Z" }) },
    });
    mockFrom.mockReturnValueOnce(fetch).mockReturnValueOnce(update);

    const result = await approveListing("id-1", "admin-1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.noOp).toBe(false);
      expect(result.listing.status).toBe("approved");
      expect(result.listing.approvedAt).toBe("2026-05-14T01:00:00Z");
    }
  });

  it("returns ok:false with error:'not_found' when no row", async () => {
    const fetch = chain({ maybeSingle: { data: null } });
    mockFrom.mockReturnValueOnce(fetch);

    const result = await approveListing("missing", "admin-1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("not_found");
    }
  });
});

describe("rejectListing", () => {
  beforeEach(() => vi.clearAllMocks());

  it("rejects when notes are empty/whitespace", async () => {
    const result = await rejectListing("id-1", "admin-1", "   ");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("notes_required");
    }
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("stamps notes + rejected_at on first reject", async () => {
    const fetch = chain({ maybeSingle: { data: fakeRow({ status: "pending_review" }) } });
    const update = chain({
      single: {
        data: fakeRow({
          status: "rejected",
          moderation_notes: "Too vague",
          rejected_at: "2026-05-14T01:00:00Z",
        }),
      },
    });
    mockFrom.mockReturnValueOnce(fetch).mockReturnValueOnce(update);

    const result = await rejectListing("id-1", "admin-1", "Too vague");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.noOp).toBe(false);
      expect(result.listing.status).toBe("rejected");
      expect(result.listing.moderationNotes).toBe("Too vague");
      expect(result.listing.rejectedAt).toBe("2026-05-14T01:00:00Z");
    }
  });

  it("is idempotent when same notes are already stored", async () => {
    const fetch = chain({
      maybeSingle: {
        data: fakeRow({
          status: "rejected",
          moderation_notes: "Too vague",
          rejected_at: "2026-05-13T01:00:00Z",
        }),
      },
    });
    mockFrom.mockReturnValueOnce(fetch);

    const result = await rejectListing("id-1", "admin-1", "Too vague");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.noOp).toBe(true);
    }
    // Only the fetch happened — no update.
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});

describe("submitListingForReview", () => {
  beforeEach(() => vi.clearAllMocks());

  it("flips draft → pending_review for the owner", async () => {
    const fetch = chain({
      maybeSingle: {
        data: fakeRow({ status: "draft", owner_user_id: "owner-1" }),
      },
    });
    const update = chain({
      single: { data: fakeRow({ status: "pending_review", owner_user_id: "owner-1" }) },
    });
    mockFrom.mockReturnValueOnce(fetch).mockReturnValueOnce(update);

    const result = await submitListingForReview("id-1", "owner-1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.listing.status).toBe("pending_review");
    }
  });

  it("returns forbidden when caller is not the owner", async () => {
    const fetch = chain({
      maybeSingle: { data: fakeRow({ status: "draft", owner_user_id: "owner-1" }) },
    });
    mockFrom.mockReturnValueOnce(fetch);

    const result = await submitListingForReview("id-1", "someone-else");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("forbidden");
    }
  });

  it("is idempotent when already pending_review", async () => {
    const fetch = chain({
      maybeSingle: { data: fakeRow({ status: "pending_review", owner_user_id: "owner-1" }) },
    });
    mockFrom.mockReturnValueOnce(fetch);

    const result = await submitListingForReview("id-1", "owner-1");
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.noOp).toBe(true);
    }
  });

  it("refuses transitions from non-draft non-pending statuses", async () => {
    const fetch = chain({
      maybeSingle: { data: fakeRow({ status: "approved", owner_user_id: "owner-1" }) },
    });
    mockFrom.mockReturnValueOnce(fetch);

    const result = await submitListingForReview("id-1", "owner-1");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("cannot_submit_from_approved");
    }
  });
});
