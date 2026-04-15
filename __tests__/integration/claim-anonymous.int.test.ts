import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  installSupabaseFake,
  reset,
  setAuthUser,
  seedTable,
  getTable,
} from "./harness";

installSupabaseFake();

const { POST } = await import("@/app/api/account/claim-anonymous/route");

function makeRequest(body: unknown): NextRequest {
  return new NextRequest("http://test/api/account/claim-anonymous", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("integration: /api/account/claim-anonymous", () => {
  beforeEach(() => reset());

  it("requires auth", async () => {
    const res = await POST(makeRequest({ session_id: "sess-1" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 when session_id is missing", async () => {
    setAuthUser("u1");
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("replays anonymous saves + quiz history into the user's record", async () => {
    setAuthUser("u1");

    // Seed two anonymous bookmark saves tied to this session_id
    seedTable("anonymous_saves", [
      {
        session_id: "sess-1",
        bookmark_type: "broker",
        ref: "stake",
        label: "Stake",
        created_at: new Date().toISOString(),
        claimed_at: null,
      },
      {
        session_id: "sess-1",
        bookmark_type: "article",
        ref: "best-etfs-australia",
        label: "Best ETFs",
        created_at: new Date().toISOString(),
        claimed_at: null,
      },
      // A row for a different session — should NOT be claimed
      {
        session_id: "other-sess",
        bookmark_type: "broker",
        ref: "cmc",
        label: "CMC",
        created_at: new Date().toISOString(),
        claimed_at: null,
      },
    ]);

    // Seed a quiz run made anonymously under the same session_id
    seedTable("user_quiz_history", [
      {
        user_id: null,
        session_id: "sess-1",
        answers: { raw: ["beginner", "small"] },
        inferred_vertical: "shares",
        top_match_slug: "stake",
        completed_at: new Date().toISOString(),
        resumed_from: null,
        created_at: new Date().toISOString(),
      },
    ]);

    const res = await POST(makeRequest({ session_id: "sess-1" }));
    expect(res.status).toBe(200);
    const json = (await res.json()) as {
      ok: boolean;
      bookmarks_claimed: number;
      quizzes_claimed: number;
    };
    expect(json.ok).toBe(true);
    expect(json.bookmarks_claimed).toBe(2);
    expect(json.quizzes_claimed).toBe(1);

    // user_bookmarks should have the two rows attributed to u1
    const bookmarks = getTable("user_bookmarks");
    expect(bookmarks).toHaveLength(2);
    for (const b of bookmarks) {
      expect(b.user_id).toBe("u1");
    }

    // The other session's row must be untouched
    const anon = getTable("anonymous_saves");
    const unclaimed = anon.filter((r) => r.claimed_at == null);
    expect(unclaimed).toHaveLength(1);
    expect(unclaimed[0].session_id).toBe("other-sess");

    // quiz history row is now attributed to u1
    const quiz = getTable("user_quiz_history");
    expect(quiz[0].user_id).toBe("u1");
  });

  it("is idempotent — replaying the same claim is a safe no-op", async () => {
    setAuthUser("u1");
    seedTable("anonymous_saves", [
      {
        session_id: "sess-1",
        bookmark_type: "broker",
        ref: "stake",
        label: "Stake",
        created_at: new Date().toISOString(),
        claimed_at: null,
      },
    ]);

    const first = await POST(makeRequest({ session_id: "sess-1" }));
    const firstJson = (await first.json()) as { bookmarks_claimed: number };
    expect(firstJson.bookmarks_claimed).toBe(1);

    const second = await POST(makeRequest({ session_id: "sess-1" }));
    expect(second.status).toBe(200);
    const secondJson = (await second.json()) as { bookmarks_claimed: number };
    // Second call sees zero unclaimed rows so the count is 0
    expect(secondJson.bookmarks_claimed).toBe(0);

    // The bookmark is still there, not duplicated
    expect(getTable("user_bookmarks")).toHaveLength(1);
  });
});
