import { describe, it, expect, vi } from "vitest";

// The module imports createAdminClient at module scope (for the async DB fns).
// We only exercise the PURE helpers here, but the import must not blow up, so
// stub the admin client via vi.hoisted.
const { mockCreateAdminClient } = vi.hoisted(() => ({
  mockCreateAdminClient: vi.fn(() => ({})),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: mockCreateAdminClient,
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));

import { toggleChecklistItem, newShareToken } from "@/lib/getmatched/action-plans";
import type { ChecklistItem } from "@/lib/getmatched/types";

describe("toggleChecklistItem", () => {
  const base = (): ChecklistItem[] => [
    { label: "Open account", done: false },
    { label: "Fund account", done: true },
    { label: "Place first trade", done: false },
  ];

  it("flips done at the given index and leaves all others untouched", () => {
    const input = base();
    const out = toggleChecklistItem(input, 0);

    expect(out[0]?.done).toBe(true);
    // Other items unchanged in value
    expect(out[1]?.done).toBe(true);
    expect(out[2]?.done).toBe(false);
    expect(out[1]?.label).toBe("Fund account");
    expect(out[2]?.label).toBe("Place first trade");
  });

  it("toggles a true item back to false", () => {
    const out = toggleChecklistItem(base(), 1);
    expect(out[1]?.done).toBe(false);
  });

  it("treats undefined done as falsy and flips it to true", () => {
    const input: ChecklistItem[] = [{ label: "No flag set" }];
    const out = toggleChecklistItem(input, 0);
    expect(out[0]?.done).toBe(true);
  });

  it("returns a NEW array and a NEW object at the toggled index (immutability)", () => {
    const input = base();
    const out = toggleChecklistItem(input, 0);

    expect(out).not.toBe(input);
    expect(out[0]).not.toBe(input[0]); // toggled item is a fresh object
    // The original array and its items are not mutated.
    expect(input[0]?.done).toBe(false);
  });

  it("keeps untouched items as the SAME object references (only the target is replaced)", () => {
    const input = base();
    const out = toggleChecklistItem(input, 0);
    expect(out[1]).toBe(input[1]);
    expect(out[2]).toBe(input[2]);
  });

  it("returns an equivalent copy with nothing toggled for an out-of-range positive index", () => {
    const input = base();
    const out = toggleChecklistItem(input, 99);

    expect(out).not.toBe(input);
    expect(out).toEqual(input);
    expect(out.map((i) => i.done)).toEqual([false, true, false]);
  });

  it("returns an equivalent copy with nothing toggled for a negative index", () => {
    const input = base();
    const out = toggleChecklistItem(input, -1);

    expect(out).not.toBe(input);
    expect(out).toEqual(input);
  });

  it("returns an empty array for an empty checklist", () => {
    const out = toggleChecklistItem([], 0);
    expect(out).toEqual([]);
    expect(out).toHaveLength(0);
  });
});

describe("newShareToken", () => {
  it("returns a 48-char lowercase hex string (randomBytes(24).toString('hex'))", () => {
    const token = newShareToken();
    expect(token).toHaveLength(48);
    expect(token).toMatch(/^[0-9a-f]{48}$/);
  });

  it("returns a different token on each call (uniqueness)", () => {
    const tokens = new Set(
      Array.from({ length: 50 }, () => newShareToken()),
    );
    expect(tokens.size).toBe(50);
  });
});
