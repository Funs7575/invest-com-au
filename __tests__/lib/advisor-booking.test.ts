import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

type Slot = {
  id: number;
  professional_id: number;
  starts_at: string;
  ends_at: string;
  duration_minutes: number;
  status: "open" | "taken" | "cancelled";
  booked_by_email: string | null;
  booked_by_name: string | null;
  booked_at: string | null;
  lead_id: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

let existingSlot: Slot | null = null;
let insertResult: { id: number } | null = { id: 10 };
let insertError: { message: string } | null = null;
let updateRow: Slot | null = null;
let updateError: { message: string } | null = null;
let listResult: Slot[] = [];

const insertCalls: Record<string, unknown>[] = [];
const updateCalls: { payload: Record<string, unknown>; filters: { col: string; val: unknown }[] }[] =
  [];

const mockFrom = vi.fn((table: string) => {
  if (table !== "advisor_booking_appointments") {
    throw new Error(`unexpected table: ${table}`);
  }
  return {
    insert: (row: Record<string, unknown>) => ({
      select: () => ({
        single: async () => {
          insertCalls.push(row);
          return insertError
            ? { data: null, error: insertError }
            : { data: insertResult, error: null };
        },
      }),
    }),
    select: () => {
      const filters: { col: string; val: unknown }[] = [];
      const chain = {
        eq(col: string, val: unknown) {
          filters.push({ col, val });
          return chain;
        },
        gte(col: string, val: unknown) {
          filters.push({ col, val });
          return chain;
        },
        order() {
          return chain;
        },
        limit: async () => ({ data: listResult, error: null }),
        maybeSingle: async () => ({ data: existingSlot, error: null }),
      };
      return chain;
    },
    update: (payload: Record<string, unknown>) => {
      const filters: { col: string; val: unknown }[] = [];
      const chain = {
        eq(col: string, val: unknown) {
          filters.push({ col, val });
          return chain;
        },
        select() {
          return {
            maybeSingle: async () => {
              updateCalls.push({ payload, filters: [...filters] });
              return updateError
                ? { data: null, error: updateError }
                : { data: updateRow, error: null };
            },
          };
        },
        then(cb: (v: { data: null; error: { message: string } | null }) => unknown) {
          updateCalls.push({ payload, filters: [...filters] });
          return Promise.resolve(cb({ data: null, error: updateError }));
        },
      };
      return chain;
    },
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import {
  addSlot,
  addSlots,
  listOpenSlots,
  claimSlot,
  cancelSlot,
} from "@/lib/advisor-booking";

describe("addSlot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertError = null;
    insertResult = { id: 10 };
    insertCalls.length = 0;
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  it("rejects zero/negative/oversized duration", async () => {
    expect(
      (await addSlot({ professionalId: 1, startsAt: "2030-01-01T10:00:00Z", durationMinutes: 0 })).error,
    ).toBe("duration_out_of_range");
    expect(
      (await addSlot({ professionalId: 1, startsAt: "2030-01-01T10:00:00Z", durationMinutes: 241 })).error,
    ).toBe("duration_out_of_range");
  });

  it("rejects unparseable starts_at", async () => {
    expect(
      (await addSlot({ professionalId: 1, startsAt: "not a date", durationMinutes: 30 })).error,
    ).toBe("invalid_starts_at");
  });

  it("inserts computed ends_at = starts + duration", async () => {
    await addSlot({
      professionalId: 5,
      startsAt: "2030-01-01T10:00:00Z",
      durationMinutes: 45,
    });
    expect(insertCalls[0]).toMatchObject({
      professional_id: 5,
      starts_at: "2030-01-01T10:00:00.000Z",
      ends_at: "2030-01-01T10:45:00.000Z",
      duration_minutes: 45,
    });
  });

  it("returns ok:false + error when insert fails", async () => {
    insertError = { message: "conflict" };
    expect(
      (await addSlot({ professionalId: 1, startsAt: "2030-01-01T10:00:00Z", durationMinutes: 30 })).error,
    ).toBe("conflict");
  });
});

describe("addSlots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertError = null;
  });

  it("counts succeeded / failed separately", async () => {
    let n = 0;
    const origFn = mockFrom.getMockImplementation();
    mockFrom.mockImplementation((...args) => {
      n += 1;
      if (n === 2) {
        insertError = { message: "x" };
      } else {
        insertError = null;
      }
      return origFn!(...args);
    });
    const res = await addSlots([
      { professionalId: 1, startsAt: "2030-01-01T10:00:00Z", durationMinutes: 30 },
      { professionalId: 1, startsAt: "2030-01-01T11:00:00Z", durationMinutes: 30 },
      { professionalId: 1, startsAt: "2030-01-01T12:00:00Z", durationMinutes: 30 },
    ]);
    expect(res.total).toBe(3);
    expect(res.succeeded + res.failed).toBe(3);
    mockFrom.mockImplementation(origFn!);
    insertError = null;
  });
});

describe("listOpenSlots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listResult = [];
  });

  it("returns empty when none", async () => {
    expect(await listOpenSlots(1)).toEqual([]);
  });

  it("returns rows when present", async () => {
    listResult = [
      {
        id: 1,
        professional_id: 5,
        starts_at: "2030-01-01T10:00:00Z",
        ends_at: "2030-01-01T10:30:00Z",
        duration_minutes: 30,
        status: "open",
        booked_by_email: null,
        booked_by_name: null,
        booked_at: null,
        lead_id: null,
        notes: null,
        created_at: "x",
        updated_at: "x",
      },
    ];
    const res = await listOpenSlots(5);
    expect(res).toHaveLength(1);
    expect(res[0]?.status).toBe("open");
  });
});

describe("claimSlot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    existingSlot = null;
    updateRow = null;
    updateError = null;
    updateCalls.length = 0;
  });

  it("rejects missing fields", async () => {
    expect(
      (await claimSlot({ slotId: 0, bookedByEmail: "a@b.com", bookedByName: "n" })).error,
    ).toBe("missing_fields");
    expect(
      (await claimSlot({ slotId: 1, bookedByEmail: "", bookedByName: "n" })).error,
    ).toBe("missing_fields");
    expect(
      (await claimSlot({ slotId: 1, bookedByEmail: "a@b.com", bookedByName: "" })).error,
    ).toBe("missing_fields");
  });

  it("returns not_found when the slot doesn't exist", async () => {
    existingSlot = null;
    expect(
      (await claimSlot({ slotId: 1, bookedByEmail: "a@b.com", bookedByName: "J" })).error,
    ).toBe("not_found");
  });

  it("returns already_taken when slot status is not open", async () => {
    existingSlot = makeSlot({ status: "taken" });
    expect(
      (await claimSlot({ slotId: 1, bookedByEmail: "a@b.com", bookedByName: "J" })).error,
    ).toBe("already_taken");
  });

  it("returns slot_in_past when starts_at is in the past", async () => {
    existingSlot = makeSlot({
      status: "open",
      starts_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    });
    expect(
      (await claimSlot({ slotId: 1, bookedByEmail: "a@b.com", bookedByName: "J" })).error,
    ).toBe("slot_in_past");
  });

  it("returns already_taken when conditional update affected 0 rows", async () => {
    existingSlot = makeSlot({ status: "open" });
    updateRow = null;
    expect(
      (await claimSlot({ slotId: 1, bookedByEmail: "a@b.com", bookedByName: "J" })).error,
    ).toBe("already_taken");
  });

  it("returns ok with updated slot on success", async () => {
    existingSlot = makeSlot({ status: "open" });
    updateRow = makeSlot({ status: "taken", booked_by_email: "a@b.com", booked_by_name: "J" });
    const res = await claimSlot({ slotId: 1, bookedByEmail: "A@B.com", bookedByName: "  J  " });
    expect(res.ok).toBe(true);
    expect(res.slot?.status).toBe("taken");
    expect(updateCalls[0]?.payload).toMatchObject({
      status: "taken",
      booked_by_email: "a@b.com", // lowercased + trimmed
      booked_by_name: "J", // trimmed
    });
    // Conditional update: optimistic lock on status='open'
    expect(updateCalls[0]?.filters).toContainEqual({ col: "status", val: "open" });
  });
});

describe("cancelSlot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    updateError = null;
    updateCalls.length = 0;
  });

  it("stamps status=cancelled", async () => {
    const res = await cancelSlot(42);
    expect(res.ok).toBe(true);
    expect(updateCalls[0]?.payload.status).toBe("cancelled");
    expect(updateCalls[0]?.filters).toContainEqual({ col: "id", val: 42 });
  });

  it("propagates error", async () => {
    updateError = { message: "constraint" };
    const res = await cancelSlot(1);
    expect(res.ok).toBe(false);
    expect(res.error).toBe("constraint");
  });
});

function makeSlot(overrides: Partial<Slot> = {}): Slot {
  return {
    id: 1,
    professional_id: 5,
    starts_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    ends_at: new Date(Date.now() + 25 * 60 * 60 * 1000).toISOString(),
    duration_minutes: 60,
    status: "open",
    booked_by_email: null,
    booked_by_name: null,
    booked_at: null,
    lead_id: null,
    notes: null,
    created_at: "x",
    updated_at: "x",
    ...overrides,
  };
}
