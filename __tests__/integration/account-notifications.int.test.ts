import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  installSupabaseFake,
  reset,
  setAuthUser,
  seedTable,
  getTable,
} from "./harness";

// Must install before importing the route handler so the mocks
// are applied when the handler pulls in its dependencies.
installSupabaseFake();

const { GET, PATCH } = await import("@/app/api/account/notifications/route");

function makeRequest(
  url: string,
  init?: { method?: string; body?: unknown },
): NextRequest {
  return new NextRequest(`http://test${url}`, {
    method: init?.method || "GET",
    headers: { "content-type": "application/json" },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
}

describe("integration: /api/account/notifications", () => {
  beforeEach(() => reset());

  it("returns 401 for unauthenticated callers", async () => {
    const res = await GET(makeRequest("/api/account/notifications"));
    expect(res.status).toBe(401);
  });

  it("GET returns the authenticated user's inbox with unread count", async () => {
    setAuthUser("u1", "alice@example.com");
    seedTable("user_notifications", [
      {
        user_id: "u1",
        type: "system",
        title: "First",
        body: "First body",
        link_url: null,
        read_at: null,
        email_delivery_key: null,
        created_at: new Date("2026-04-10").toISOString(),
      },
      {
        user_id: "u1",
        type: "fee_change",
        title: "Second",
        body: null,
        link_url: "/broker/stake",
        read_at: new Date().toISOString(),
        email_delivery_key: null,
        created_at: new Date("2026-04-12").toISOString(),
      },
      {
        user_id: "u2",
        type: "system",
        title: "Other user",
        body: null,
        link_url: null,
        read_at: null,
        email_delivery_key: null,
        created_at: new Date().toISOString(),
      },
    ]);

    const res = await GET(makeRequest("/api/account/notifications"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      unread: number;
      items: Array<{ title: string }>;
    };
    expect(json.unread).toBe(1);
    expect(json.items).toHaveLength(2);
    // Cross-user isolation
    expect(json.items.every((i) => i.title !== "Other user")).toBe(true);
  });

  it("GET with ?count=1 short-circuits to just the unread count", async () => {
    setAuthUser("u1", "alice@example.com");
    seedTable("user_notifications", [
      { user_id: "u1", type: "system", title: "a", read_at: null },
      { user_id: "u1", type: "system", title: "b", read_at: null },
      { user_id: "u1", type: "system", title: "c", read_at: new Date().toISOString() },
    ]);
    const res = await GET(makeRequest("/api/account/notifications?count=1"));
    expect(res.status).toBe(200);
    const json = (await res.json()) as { unread: number; items?: unknown };
    expect(json.unread).toBe(2);
    // Count mode should not return items
    expect(json.items).toBeUndefined();
  });

  it("PATCH { all: true } marks every unread notification read", async () => {
    setAuthUser("u1", "alice@example.com");
    seedTable("user_notifications", [
      { user_id: "u1", type: "system", title: "a", read_at: null },
      { user_id: "u1", type: "system", title: "b", read_at: null },
      { user_id: "u2", type: "system", title: "c", read_at: null },
    ]);
    const res = await PATCH(
      makeRequest("/api/account/notifications", {
        method: "PATCH",
        body: { all: true },
      }),
    );
    expect(res.status).toBe(200);
    const rows = getTable("user_notifications");
    // u1's two rows are now read; u2's row untouched.
    const u1Rows = rows.filter((r) => r.user_id === "u1");
    const u2Rows = rows.filter((r) => r.user_id === "u2");
    expect(u1Rows.every((r) => r.read_at != null)).toBe(true);
    expect(u2Rows.every((r) => r.read_at == null)).toBe(true);
  });

  it("PATCH { id } marks a single notification read", async () => {
    setAuthUser("u1", "alice@example.com");
    seedTable("user_notifications", [
      { user_id: "u1", type: "system", title: "a", read_at: null },
      { user_id: "u1", type: "system", title: "b", read_at: null },
    ]);
    const firstId = getTable("user_notifications")[0].id;
    const res = await PATCH(
      makeRequest("/api/account/notifications", {
        method: "PATCH",
        body: { id: firstId },
      }),
    );
    expect(res.status).toBe(200);
    const rows = getTable("user_notifications");
    const first = rows.find((r) => r.id === firstId)!;
    const second = rows.find((r) => r.id !== firstId)!;
    expect(first.read_at).toBeTruthy();
    expect(second.read_at).toBeNull();
  });

  it("PATCH with neither id nor all returns 400", async () => {
    setAuthUser("u1", "alice@example.com");
    const res = await PATCH(
      makeRequest("/api/account/notifications", {
        method: "PATCH",
        body: {},
      }),
    );
    expect(res.status).toBe(400);
  });
});
