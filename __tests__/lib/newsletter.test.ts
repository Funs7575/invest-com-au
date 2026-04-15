import { describe, it, expect, beforeEach, vi } from "vitest";

interface Row {
  id: number;
  email: string;
  segment_slug: string | null;
  confirmed: boolean;
  confirmation_token: string | null;
  unsubscribe_token: string;
  unsubscribed_at: string | null;
  confirmed_at: string | null;
  created_at: string;
}

let rows: Row[] = [];
let nextId = 1;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    const builder = (table: string) => {
      const state: {
        op: "select" | "insert" | "update";
        filters: Record<string, unknown>;
        nullFilters: Record<string, boolean>;
        updatePayload?: Partial<Row>;
        single?: "maybeSingle";
        selectOpts?: { count?: string; head?: boolean };
      } = { op: "select", filters: {}, nullFilters: {} };

      const api: Record<string, unknown> = {};
      api.select = (
        _cols?: string,
        opts?: { count?: string; head?: boolean },
      ) => {
        state.selectOpts = opts;
        return api;
      };
      api.insert = (payload: Row) => {
        if (table === "newsletter_subscriptions") {
          const newRow: Row = {
            id: nextId++,
            email: payload.email,
            segment_slug: payload.segment_slug ?? null,
            confirmed: payload.confirmed ?? false,
            confirmation_token: payload.confirmation_token ?? null,
            unsubscribe_token: payload.unsubscribe_token,
            unsubscribed_at: null,
            confirmed_at: null,
            created_at: new Date().toISOString(),
          };
          rows.push(newRow);
        }
        return Promise.resolve({ error: null });
      };
      api.update = (payload: Partial<Row>) => {
        state.updatePayload = payload;
        state.op = "update";
        return api;
      };
      api.eq = (col: string, val: unknown) => {
        state.filters[col] = val;
        return api;
      };
      api.is = (col: string, val: unknown) => {
        if (val === null) state.nullFilters[col] = true;
        return api;
      };
      api.maybeSingle = () => {
        state.single = "maybeSingle";
        return run();
      };
      (api as Record<string, unknown>).then = (
        resolve: (v: unknown) => void,
      ) => {
        resolve(run());
      };

      function run() {
        if (table !== "newsletter_subscriptions") {
          return Promise.resolve({ data: [], error: null, count: 0 });
        }
        const matched = rows.filter((r) => {
          for (const [k, v] of Object.entries(state.filters)) {
            if ((r as unknown as Record<string, unknown>)[k] !== v) return false;
          }
          for (const k of Object.keys(state.nullFilters)) {
            if ((r as unknown as Record<string, unknown>)[k] != null) return false;
          }
          return true;
        });

        if (state.op === "update" && state.updatePayload) {
          matched.forEach((r) => Object.assign(r, state.updatePayload));
          return Promise.resolve({ error: null });
        }
        if (state.selectOpts?.count === "exact") {
          return Promise.resolve({
            data: null,
            count: matched.length,
            error: null,
          });
        }
        if (state.single === "maybeSingle") {
          return Promise.resolve({ data: matched[0] || null, error: null });
        }
        return Promise.resolve({ data: matched, error: null });
      }
      return api;
    };
    return { from: builder };
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: () => ({
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  }),
}));

import {
  subscribeToNewsletter,
  confirmSubscription,
  unsubscribeByToken,
  countConfirmedSubscribers,
} from "@/lib/newsletter";

beforeEach(() => {
  rows = [];
  nextId = 1;
});

describe("subscribeToNewsletter", () => {
  it("rejects an invalid email", async () => {
    const r = await subscribeToNewsletter({ email: "not-an-email" });
    expect(r.ok).toBe(false);
    expect(r.error).toBe("invalid_email");
  });

  it("creates a new subscription with tokens", async () => {
    const r = await subscribeToNewsletter({
      email: "alice@example.com",
      segmentSlug: "weekly",
    });
    expect(r.ok).toBe(true);
    expect(r.confirmationToken).toBeTruthy();
    expect(r.unsubscribeToken).toBeTruthy();
    expect(rows).toHaveLength(1);
    expect(rows[0].email).toBe("alice@example.com");
    expect(rows[0].segment_slug).toBe("weekly");
    expect(rows[0].confirmed).toBe(false);
  });

  it("lowercases and trims the email", async () => {
    await subscribeToNewsletter({ email: "  Alice@Example.com  " });
    expect(rows[0].email).toBe("alice@example.com");
  });

  it("repeat subscribe for a confirmed user is a no-op success", async () => {
    rows.push({
      id: 1,
      email: "bob@example.com",
      segment_slug: null,
      confirmed: true,
      confirmation_token: null,
      unsubscribe_token: "existing-unsub-token-32-chars-long",
      unsubscribed_at: null,
      confirmed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });
    const r = await subscribeToNewsletter({ email: "bob@example.com" });
    expect(r.ok).toBe(true);
    expect(r.alreadyConfirmed).toBe(true);
    expect(rows).toHaveLength(1);
  });

  it("repeat subscribe for an unconfirmed user refreshes the token", async () => {
    rows.push({
      id: 1,
      email: "carol@example.com",
      segment_slug: null,
      confirmed: false,
      confirmation_token: "old-token",
      unsubscribe_token: "carol-unsub-token-stays-the-same",
      unsubscribed_at: null,
      confirmed_at: null,
      created_at: new Date().toISOString(),
    });
    const r = await subscribeToNewsletter({ email: "carol@example.com" });
    expect(r.ok).toBe(true);
    expect(r.confirmationToken).not.toBe("old-token");
    expect(rows[0].confirmation_token).toBe(r.confirmationToken);
    // unsubscribe token stays stable
    expect(r.unsubscribeToken).toBe("carol-unsub-token-stays-the-same");
  });

  it("resurrects an unsubscribed user on a fresh subscribe", async () => {
    rows.push({
      id: 1,
      email: "dave@example.com",
      segment_slug: null,
      confirmed: true,
      confirmation_token: null,
      unsubscribe_token: "dave-unsub",
      unsubscribed_at: new Date().toISOString(),
      confirmed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });
    const r = await subscribeToNewsletter({ email: "dave@example.com" });
    expect(r.ok).toBe(true);
    expect(rows[0].unsubscribed_at).toBeNull();
  });
});

describe("confirmSubscription", () => {
  it("rejects a short/empty token", async () => {
    const r = await confirmSubscription("");
    expect(r.ok).toBe(false);
    expect(r.error).toBe("invalid_token");
  });

  it("marks the row as confirmed", async () => {
    rows.push({
      id: 1,
      email: "alice@example.com",
      segment_slug: null,
      confirmed: false,
      confirmation_token: "known-token-over-16-chars-long-ok",
      unsubscribe_token: "alice-unsub",
      unsubscribed_at: null,
      confirmed_at: null,
      created_at: new Date().toISOString(),
    });
    const r = await confirmSubscription("known-token-over-16-chars-long-ok");
    expect(r.ok).toBe(true);
    expect(r.email).toBe("alice@example.com");
    expect(rows[0].confirmed).toBe(true);
    expect(rows[0].confirmed_at).toBeTruthy();
  });

  it("returns ok for an already-confirmed user", async () => {
    rows.push({
      id: 1,
      email: "bob@example.com",
      segment_slug: null,
      confirmed: true,
      confirmation_token: null,
      unsubscribe_token: "bob-unsub",
      unsubscribed_at: null,
      confirmed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });
    // Adding a row with a known token so the lookup succeeds
    rows[0].confirmation_token = "confirmed-already-token-ok-long";
    rows[0].confirmed = true;
    const r = await confirmSubscription("confirmed-already-token-ok-long");
    expect(r.ok).toBe(true);
  });
});

describe("unsubscribeByToken", () => {
  it("stamps unsubscribed_at", async () => {
    rows.push({
      id: 1,
      email: "alice@example.com",
      segment_slug: null,
      confirmed: true,
      confirmation_token: null,
      unsubscribe_token: "alice-unsub-token-over-16-chars",
      unsubscribed_at: null,
      confirmed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });
    const r = await unsubscribeByToken("alice-unsub-token-over-16-chars");
    expect(r.ok).toBe(true);
    expect(rows[0].unsubscribed_at).toBeTruthy();
  });

  it("is idempotent for an already-unsubscribed user", async () => {
    rows.push({
      id: 1,
      email: "alice@example.com",
      segment_slug: null,
      confirmed: true,
      confirmation_token: null,
      unsubscribe_token: "alice-unsub-token-over-16-chars",
      unsubscribed_at: new Date().toISOString(),
      confirmed_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
    });
    const stamp = rows[0].unsubscribed_at;
    const r = await unsubscribeByToken("alice-unsub-token-over-16-chars");
    expect(r.ok).toBe(true);
    // Already-unsubscribed users: we return ok but don't bump the stamp
    expect(rows[0].unsubscribed_at).toBe(stamp);
  });

  it("returns not_found for an unknown token", async () => {
    const r = await unsubscribeByToken("zzzzzzzzzzzzzzzzzzzz");
    expect(r.ok).toBe(false);
    expect(r.error).toBe("not_found");
  });
});

describe("countConfirmedSubscribers", () => {
  it("counts only confirmed, non-unsubscribed rows", async () => {
    rows.push(
      {
        id: 1,
        email: "a@example.com",
        segment_slug: "weekly",
        confirmed: true,
        confirmation_token: null,
        unsubscribe_token: "a-unsub",
        unsubscribed_at: null,
        confirmed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
      {
        id: 2,
        email: "b@example.com",
        segment_slug: "weekly",
        confirmed: false,
        confirmation_token: "tkn",
        unsubscribe_token: "b-unsub",
        unsubscribed_at: null,
        confirmed_at: null,
        created_at: new Date().toISOString(),
      },
      {
        id: 3,
        email: "c@example.com",
        segment_slug: "weekly",
        confirmed: true,
        confirmation_token: null,
        unsubscribe_token: "c-unsub",
        unsubscribed_at: new Date().toISOString(),
        confirmed_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      },
    );
    const n = await countConfirmedSubscribers("weekly");
    expect(n).toBe(1);
  });
});
