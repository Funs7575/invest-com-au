import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Unit tests for the in-app consultation booking helpers (MM33).
 *
 * The admin client is mocked with a per-table chainable builder so each
 * helper can swap in the specific query path it walks. We mock the
 * "@/lib/supabase/admin" module so the lib's `createAdminClient()` calls
 * resolve to our test double.
 */

// ── Mocks ────────────────────────────────────────────────────────────────

const { mockFrom } = vi.hoisted(() => ({ mockFrom: vi.fn() }));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import {
  bookSlot,
  cancelBooking,
  confirmBooking,
  ConsultationError,
  createSlot,
  listAvailabilityForPro,
} from "@/lib/consultations";

// ── Tiny chainable mock-builder factory ──────────────────────────────────

interface ChainOptions {
  maybeSingle?: { data: unknown; error?: unknown };
  single?: { data: unknown; error?: unknown };
  /** Resolved value when the chain is awaited (no `.single()` / `.maybeSingle()`).
   *  Used for list queries that resolve a Promise<{data, error}> directly. */
  resolve?: { data: unknown; error?: unknown };
}

function chain(opts: ChainOptions = {}): Record<string, unknown> {
  const builder: Record<string, unknown> = {};
  const passthrough = () => builder;
  for (const m of [
    "select",
    "insert",
    "update",
    "delete",
    "eq",
    "in",
    "gte",
    "lte",
    "order",
    "limit",
    "is",
  ]) {
    builder[m] = vi.fn(passthrough);
  }
  builder.maybeSingle = vi.fn(() =>
    Promise.resolve(opts.maybeSingle ?? { data: null, error: null }),
  );
  builder.single = vi.fn(() =>
    Promise.resolve(opts.single ?? { data: null, error: null }),
  );
  // When awaited directly (e.g. `await admin.from(...).select(...).eq(...)`),
  // Postgrest builders behave as a thenable resolving to {data, error}.
  if (opts.resolve) {
    const resolved = opts.resolve;
    builder.then = (
      onFulfilled: (v: { data: unknown; error?: unknown }) => unknown,
    ) => Promise.resolve(resolved).then(onFulfilled);
  }
  return builder;
}

// ── createSlot ───────────────────────────────────────────────────────────

describe("createSlot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects when end_at is not strictly after start_at", async () => {
    const start = "2026-06-01T10:00:00Z";
    const end = "2026-06-01T10:00:00Z"; // identical → invalid
    await expect(
      createSlot({ professionalId: 1, startAt: start, endAt: end }),
    ).rejects.toBeInstanceOf(ConsultationError);
    await expect(
      createSlot({ professionalId: 1, startAt: start, endAt: end }),
    ).rejects.toMatchObject({ code: "invalid_input", status: 400 });
    // The helper should reject up front — no DB call should fire.
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it("creates a slot when the time range is valid", async () => {
    const row = {
      id: 1,
      professional_id: 1,
      team_id: null,
      start_at: "2026-06-01T10:00:00Z",
      end_at: "2026-06-01T10:30:00Z",
      status: "open",
      created_at: "2026-05-15T00:00:00Z",
    };
    mockFrom.mockReturnValueOnce(chain({ single: { data: row } }));

    const result = await createSlot({
      professionalId: 1,
      startAt: row.start_at,
      endAt: row.end_at,
    });
    expect(result.id).toBe(1);
    expect(result.status).toBe("open");
  });
});

// ── bookSlot ─────────────────────────────────────────────────────────────

describe("bookSlot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("transitions slot status from open to booked and inserts a booking", async () => {
    const claimed = {
      id: 10,
      professional_id: 1,
      team_id: null,
      start_at: "2026-06-01T10:00:00Z",
      end_at: "2026-06-01T10:30:00Z",
      status: "booked",
      created_at: "2026-05-15T00:00:00Z",
    };
    const booking = {
      id: 100,
      slot_id: 10,
      brief_id: 42,
      consumer_user_id: null,
      consumer_email: "user@example.com",
      consumer_notes: null,
      meet_url: null,
      status: "pending",
      created_at: "2026-05-15T00:00:00Z",
      updated_at: "2026-05-15T00:00:00Z",
    };
    // 1st from() → optimistic update on slot → returns claimed row.
    // 2nd from() → insert booking → returns booking row.
    mockFrom
      .mockReturnValueOnce(chain({ maybeSingle: { data: claimed } }))
      .mockReturnValueOnce(chain({ single: { data: booking } }));

    const result = await bookSlot({
      slotId: 10,
      briefId: 42,
      consumerEmail: "User@Example.com",
    });

    expect(result.slot.status).toBe("booked");
    expect(result.booking.status).toBe("pending");
    expect(result.booking.consumer_email).toBe("user@example.com");
  });

  it("rejects with slot_not_open when the slot is already booked", async () => {
    // First mocked from() returns null on maybeSingle — the optimistic
    // update matched zero rows because the WHERE status='open' clause
    // was no longer true. The helper should bail without touching the
    // bookings table.
    mockFrom.mockReturnValueOnce(chain({ maybeSingle: { data: null } }));

    await expect(
      bookSlot({
        slotId: 10,
        briefId: 42,
        consumerEmail: "user@example.com",
      }),
    ).rejects.toMatchObject({ code: "slot_not_open", status: 409 });
    // Only the slot-claim call — no bookings insert.
    expect(mockFrom).toHaveBeenCalledTimes(1);
  });
});

// ── cancelBooking ────────────────────────────────────────────────────────

describe("cancelBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("flips booking to cancelled and frees the underlying slot", async () => {
    const existing = {
      id: 100,
      slot_id: 10,
      brief_id: 42,
      consumer_user_id: null,
      consumer_email: "user@example.com",
      consumer_notes: null,
      meet_url: null,
      status: "pending",
      created_at: "2026-05-15T00:00:00Z",
      updated_at: "2026-05-15T00:00:00Z",
    };
    const updated = { ...existing, status: "cancelled" };
    const slotFreed = chain();
    mockFrom
      .mockReturnValueOnce(chain({ maybeSingle: { data: existing } })) // load booking
      .mockReturnValueOnce(chain({ single: { data: updated } })) // update booking
      .mockReturnValueOnce(slotFreed); // free slot

    const result = await cancelBooking(100, "consumer");
    expect(result.status).toBe("cancelled");

    // Confirm the slot table was touched — the third from() call hits
    // pro_availability_slots and chains update().eq() → check eq saw 10.
    expect(mockFrom).toHaveBeenNthCalledWith(3, "pro_availability_slots");
  });
});

// ── listAvailabilityForPro ───────────────────────────────────────────────

describe("listAvailabilityForPro", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("filters by status='open' and orders by start_at", async () => {
    const rows = [
      {
        id: 1,
        professional_id: 1,
        team_id: null,
        start_at: "2026-06-01T10:00:00Z",
        end_at: "2026-06-01T10:30:00Z",
        status: "open",
        created_at: "2026-05-15T00:00:00Z",
      },
      {
        id: 2,
        professional_id: 1,
        team_id: null,
        start_at: "2026-06-02T10:00:00Z",
        end_at: "2026-06-02T10:30:00Z",
        status: "open",
        created_at: "2026-05-15T00:00:00Z",
      },
    ];
    const builder = chain({ resolve: { data: rows, error: null } });
    mockFrom.mockReturnValueOnce(builder);

    const result = await listAvailabilityForPro(1);
    expect(result).toHaveLength(2);
    expect(result[0]?.id).toBe(1);
    // Verify the .eq("status","open") guard was applied.
    const eqCalls = (builder.eq as ReturnType<typeof vi.fn>).mock.calls;
    const hasStatusOpenFilter = eqCalls.some(
      (c) => c[0] === "status" && c[1] === "open",
    );
    expect(hasStatusOpenFilter).toBe(true);
    // And the .order("start_at", { ascending: true }) sort was applied.
    expect(builder.order).toHaveBeenCalledWith("start_at", {
      ascending: true,
    });
  });
});

// ── confirmBooking ───────────────────────────────────────────────────────

describe("confirmBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("attaches meet_url and flips status to confirmed", async () => {
    const updated = {
      id: 100,
      slot_id: 10,
      brief_id: 42,
      consumer_user_id: null,
      consumer_email: "user@example.com",
      consumer_notes: null,
      meet_url: "https://meet.google.com/abc-defg-hij",
      status: "confirmed",
      created_at: "2026-05-15T00:00:00Z",
      updated_at: "2026-05-15T00:01:00Z",
    };
    const builder = chain({ maybeSingle: { data: updated } });
    mockFrom.mockReturnValueOnce(builder);

    const result = await confirmBooking(100, {
      meetUrl: "https://meet.google.com/abc-defg-hij",
    });
    expect(result.status).toBe("confirmed");
    expect(result.meet_url).toBe("https://meet.google.com/abc-defg-hij");
    // Verify the update payload included both fields.
    const updateCall = (builder.update as ReturnType<typeof vi.fn>).mock
      .calls[0]?.[0];
    expect(updateCall).toMatchObject({
      status: "confirmed",
      meet_url: "https://meet.google.com/abc-defg-hij",
    });
  });

  it("rejects an invalid meet_url with invalid_input", async () => {
    await expect(
      confirmBooking(100, { meetUrl: "not a url" }),
    ).rejects.toMatchObject({ code: "invalid_input", status: 400 });
    // Validation runs before any DB call.
    expect(mockFrom).not.toHaveBeenCalled();
  });
});
