import { describe, it, expect, beforeEach, vi } from "vitest";

interface Row {
  id: number;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  link_url: string | null;
  email_delivery_key: string | null;
  read_at: string | null;
}

let rows: Row[] = [];
let nextId = 1;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    const builder = (table: string) => {
      const state: {
        userId?: string;
        idFilter?: number;
        keyFilter?: string;
        unread?: boolean;
        payload?: Partial<Row>;
        op: "select" | "insert" | "update" | "count";
        count: boolean;
      } = { op: "select", count: false };
      const api: Record<string, unknown> = {};
      api.select = (_cols: string, opts?: { count: string; head: boolean }) => {
        state.op = opts?.count ? "count" : "select";
        state.count = !!opts?.count;
        return api;
      };
      api.insert = async (payload: Partial<Row>) => {
        const newRow: Row = {
          id: nextId++,
          user_id: payload.user_id || "",
          type: payload.type || "system",
          title: payload.title || "",
          body: payload.body ?? null,
          link_url: payload.link_url ?? null,
          email_delivery_key: payload.email_delivery_key ?? null,
          read_at: null,
        };
        rows.push(newRow);
        return { error: null };
      };
      api.update = (payload: Partial<Row>) => {
        state.payload = payload;
        state.op = "update";
        return api;
      };
      api.eq = (col: string, val: string | number) => {
        if (col === "user_id") state.userId = String(val);
        if (col === "id") state.idFilter = Number(val);
        if (col === "email_delivery_key") state.keyFilter = String(val);
        return api;
      };
      api.is = (col: string, val: unknown) => {
        if (col === "read_at" && val === null) state.unread = true;
        return api;
      };
      api.limit = () => api;
      api.then = (resolve: (v: unknown) => void) => {
        if (table !== "user_notifications") {
          return resolve({ data: [], error: null, count: 0 });
        }
        let matched = rows.filter(
          (r) =>
            (!state.userId || r.user_id === state.userId) &&
            (!state.keyFilter || r.email_delivery_key === state.keyFilter) &&
            (!state.unread || r.read_at == null) &&
            (!state.idFilter || r.id === state.idFilter),
        );
        if (state.op === "update" && state.payload) {
          matched.forEach((r) => Object.assign(r, state.payload));
          return resolve({ error: null });
        }
        if (state.count) {
          return resolve({ count: matched.length, error: null });
        }
        return resolve({ data: matched, error: null });
      };
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
  notifyUser,
  getUnreadCount,
  markRead,
  markAllRead,
} from "@/lib/notifications";

beforeEach(() => {
  rows = [];
  nextId = 1;
});

describe("notifyUser", () => {
  it("inserts a row and returns true", async () => {
    const ok = await notifyUser({
      userId: "u1",
      type: "system",
      title: "Welcome",
    });
    expect(ok).toBe(true);
    expect(rows).toHaveLength(1);
    expect(rows[0].title).toBe("Welcome");
  });

  it("dedups when emailDeliveryKey matches an existing row", async () => {
    await notifyUser({
      userId: "u1",
      type: "deal",
      title: "Deal",
      emailDeliveryKey: "deal-2026-04",
    });
    const second = await notifyUser({
      userId: "u1",
      type: "deal",
      title: "Duplicate",
      emailDeliveryKey: "deal-2026-04",
    });
    expect(second).toBe(false);
    expect(rows).toHaveLength(1);
  });

  it("allows the same key for different users", async () => {
    await notifyUser({
      userId: "u1",
      type: "deal",
      title: "A",
      emailDeliveryKey: "shared-key",
    });
    const second = await notifyUser({
      userId: "u2",
      type: "deal",
      title: "B",
      emailDeliveryKey: "shared-key",
    });
    expect(second).toBe(true);
    expect(rows).toHaveLength(2);
  });

  it("truncates overly long title and body", async () => {
    const longTitle = "x".repeat(5000);
    await notifyUser({
      userId: "u1",
      type: "system",
      title: longTitle,
      body: "y".repeat(5000),
    });
    expect(rows[0].title.length).toBe(200);
    expect(rows[0].body?.length).toBe(2000);
  });
});

describe("getUnreadCount", () => {
  it("returns the unread count for a user", async () => {
    await notifyUser({ userId: "u1", type: "system", title: "1" });
    await notifyUser({ userId: "u1", type: "system", title: "2" });
    await notifyUser({ userId: "u2", type: "system", title: "3" });
    expect(await getUnreadCount("u1")).toBe(2);
    expect(await getUnreadCount("u2")).toBe(1);
  });

  it("returns 0 when the user has no notifications", async () => {
    expect(await getUnreadCount("nobody")).toBe(0);
  });
});

describe("markRead + markAllRead", () => {
  it("marks one notification read", async () => {
    await notifyUser({ userId: "u1", type: "system", title: "a" });
    await notifyUser({ userId: "u1", type: "system", title: "b" });
    expect(await getUnreadCount("u1")).toBe(2);
    await markRead("u1", 1);
    expect(await getUnreadCount("u1")).toBe(1);
  });

  it("marks all of a user's unread notifications read", async () => {
    await notifyUser({ userId: "u1", type: "system", title: "a" });
    await notifyUser({ userId: "u1", type: "system", title: "b" });
    await notifyUser({ userId: "u2", type: "system", title: "c" });
    await markAllRead("u1");
    expect(await getUnreadCount("u1")).toBe(0);
    // u2 unaffected
    expect(await getUnreadCount("u2")).toBe(1);
  });
});
