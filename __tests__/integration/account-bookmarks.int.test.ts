import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  installSupabaseFake,
  reset,
  setAuthUser,
  getTable,
  seedTable,
} from "./harness";

installSupabaseFake();

const { GET, POST, DELETE } = await import(
  "@/app/api/account/bookmarks/route"
);

function makeRequest(init?: {
  method?: string;
  body?: unknown;
}): NextRequest {
  return new NextRequest("http://test/api/account/bookmarks", {
    method: init?.method || "GET",
    headers: { "content-type": "application/json" },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
}

describe("integration: /api/account/bookmarks", () => {
  beforeEach(() => reset());

  it("GET requires auth", async () => {
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("authenticated POST adds a bookmark to user_bookmarks", async () => {
    setAuthUser("u1", "alice@example.com");
    const res = await POST(
      makeRequest({
        method: "POST",
        body: { type: "broker", ref: "stake", label: "Stake Trading" },
      }),
    );
    expect(res.status).toBe(200);
    const rows = getTable("user_bookmarks");
    expect(rows).toHaveLength(1);
    expect(rows[0].user_id).toBe("u1");
    expect(rows[0].bookmark_type).toBe("broker");
    expect(rows[0].ref).toBe("stake");
  });

  it("anonymous POST with session_id writes to anonymous_saves instead", async () => {
    setAuthUser(null); // no user
    const res = await POST(
      makeRequest({
        method: "POST",
        body: {
          type: "broker",
          ref: "stake",
          label: "Stake",
          session_id: "sess-anon",
        },
      }),
    );
    expect(res.status).toBe(200);
    const json = (await res.json()) as { anonymous: boolean };
    expect(json.anonymous).toBe(true);
    expect(getTable("user_bookmarks")).toHaveLength(0);
    expect(getTable("anonymous_saves")).toHaveLength(1);
  });

  it("anonymous POST without session_id returns 400", async () => {
    setAuthUser(null);
    const res = await POST(
      makeRequest({
        method: "POST",
        body: { type: "broker", ref: "stake" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("rejects an invalid bookmark type", async () => {
    setAuthUser("u1");
    const res = await POST(
      makeRequest({
        method: "POST",
        body: { type: "spaceship", ref: "x" },
      }),
    );
    expect(res.status).toBe(400);
  });

  it("GET returns only the current user's bookmarks", async () => {
    setAuthUser("u1", "alice@example.com");
    seedTable("user_bookmarks", [
      {
        user_id: "u1",
        bookmark_type: "broker",
        ref: "stake",
        label: "Stake",
        note: null,
        created_at: new Date().toISOString(),
      },
      {
        user_id: "u2",
        bookmark_type: "broker",
        ref: "cmc",
        label: "CMC",
        note: null,
        created_at: new Date().toISOString(),
      },
    ]);
    const res = await GET();
    expect(res.status).toBe(200);
    const json = (await res.json()) as { items: Array<{ user_id: string }> };
    expect(json.items).toHaveLength(1);
    expect(json.items[0].user_id).toBe("u1");
  });

  it("DELETE removes a bookmark", async () => {
    setAuthUser("u1", "alice@example.com");
    seedTable("user_bookmarks", [
      {
        user_id: "u1",
        bookmark_type: "broker",
        ref: "stake",
        label: "Stake",
        note: null,
        created_at: new Date().toISOString(),
      },
    ]);
    const res = await DELETE(
      makeRequest({
        method: "DELETE",
        body: { type: "broker", ref: "stake" },
      }),
    );
    expect(res.status).toBe(200);
    expect(getTable("user_bookmarks")).toHaveLength(0);
  });
});
