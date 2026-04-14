import { describe, it, expect, beforeEach, vi } from "vitest";

interface Row {
  id: number;
  article_slug: string;
  author_id: string | null;
  author_name: string;
  author_email: string;
  parent_id: number | null;
  body: string;
  status: string;
  helpful_count: number;
  created_at: string;
}

let commentRows: Row[] = [];
let reactionRows: Array<{
  id: number;
  article_slug: string;
  user_id: string | null;
  ip_hash: string | null;
  reaction: string;
}> = [];
let nextCommentId = 1;
let nextReactionId = 1;

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => {
    const builder = (table: string) => {
      const state: {
        op: "select" | "insert" | "update";
        slugFilter?: string;
        statusFilter?: string;
        payload?: Partial<Row>;
        reactionPayload?: {
          article_slug?: string;
          user_id?: string | null;
          ip_hash?: string | null;
          reaction?: string;
        };
        isArticleComments: boolean;
        isReactions: boolean;
      } = {
        op: "select",
        isArticleComments: table === "article_comments",
        isReactions: table === "article_reactions",
      };

      const api: Record<string, unknown> = {};

      api.select = () => api;
      api.insert = (payload: Record<string, unknown>) => {
        if (state.isArticleComments) {
          const newRow: Row = {
            id: nextCommentId++,
            article_slug: (payload.article_slug as string) || "",
            author_id: (payload.author_id as string | null) ?? null,
            author_name: (payload.author_name as string) || "",
            author_email: (payload.author_email as string) || "",
            parent_id: (payload.parent_id as number | null) ?? null,
            body: (payload.body as string) || "",
            status: (payload.status as string) || "pending",
            helpful_count: 0,
            created_at: new Date().toISOString(),
          };
          commentRows.push(newRow);
          // Return thenable that mimics .select("id").single()
          const result = { data: { id: newRow.id }, error: null };
          return {
            select: () => ({
              single: () => Promise.resolve(result),
            }),
          };
        }
        if (state.isReactions) {
          // Check uniqueness dedup
          const slug = payload.article_slug as string;
          const userId = (payload.user_id as string | null) ?? null;
          const ipHash = (payload.ip_hash as string | null) ?? null;
          const reaction = payload.reaction as string;
          const dup = reactionRows.some(
            (r) =>
              r.article_slug === slug &&
              r.user_id === userId &&
              r.ip_hash === ipHash &&
              r.reaction === reaction,
          );
          if (dup) {
            return Promise.resolve({
              error: { message: "duplicate key" },
            });
          }
          reactionRows.push({
            id: nextReactionId++,
            article_slug: slug,
            user_id: userId,
            ip_hash: ipHash,
            reaction,
          });
          return Promise.resolve({ error: null });
        }
        return Promise.resolve({ error: null });
      };
      api.eq = (col: string, val: string) => {
        if (col === "article_slug") state.slugFilter = val;
        if (col === "status") state.statusFilter = val;
        return api;
      };
      api.order = () => api;
      api.limit = () => api;
      api.then = (resolve: (v: unknown) => void) => {
        if (state.isArticleComments) {
          const matched = commentRows.filter(
            (r) =>
              (!state.slugFilter || r.article_slug === state.slugFilter) &&
              (!state.statusFilter || r.status === state.statusFilter),
          );
          return resolve({ data: matched, error: null });
        }
        if (state.isReactions) {
          const matched = reactionRows.filter(
            (r) => !state.slugFilter || r.article_slug === state.slugFilter,
          );
          return resolve({ data: matched, error: null });
        }
        return resolve({ data: [], error: null });
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
  submitComment,
  listPublishedComments,
  reactToArticle,
  getReactionCounts,
  hashIp,
  isValidReaction,
} from "@/lib/article-comments";

beforeEach(() => {
  commentRows = [];
  reactionRows = [];
  nextCommentId = 1;
  nextReactionId = 1;
});

describe("submitComment", () => {
  it("rejects too-short bodies", async () => {
    const r = await submitComment({
      articleSlug: "hi",
      authorId: null,
      authorName: "Alice",
      authorEmail: "a@b.co",
      body: "short",
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("too_short");
  });

  it("rejects missing author fields", async () => {
    const r = await submitComment({
      articleSlug: "hi",
      authorId: null,
      authorName: "",
      authorEmail: "",
      body: "This is a perfectly valid comment body.",
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("missing_author");
  });

  it("auto-publishes a benign comment and returns the id", async () => {
    const r = await submitComment({
      articleSlug: "best-brokers",
      authorId: "u1",
      authorName: "Alice",
      authorEmail: "alice@example.com",
      body: "Really useful comparison, especially the ETF section. Thanks for writing this up!",
    });
    expect(r.ok).toBe(true);
    expect(r.status).toBe("published");
    expect(r.id).toBeGreaterThan(0);
    expect(commentRows).toHaveLength(1);
  });

  it("flags defamation phrases as pending instead of publishing", async () => {
    const r = await submitComment({
      articleSlug: "best-brokers",
      authorId: null,
      authorName: "Bob",
      authorEmail: "bob@example.com",
      body: "This company is a fraud and they scammed me out of thousands of dollars right now.",
    });
    expect(r.ok).toBe(true);
    // Legal-risk phrases escalate, not publish
    expect(r.status === "pending" || r.status === "rejected").toBe(true);
  });
});

describe("listPublishedComments", () => {
  it("only returns published rows for the matching slug", async () => {
    await submitComment({
      articleSlug: "a",
      authorId: "u1",
      authorName: "Alice",
      authorEmail: "a@b.co",
      body: "A thoughtful and genuine comment with enough length.",
    });
    await submitComment({
      articleSlug: "b",
      authorId: "u2",
      authorName: "Bob",
      authorEmail: "b@b.co",
      body: "Another thoughtful and genuine comment with enough length.",
    });
    const a = await listPublishedComments("a");
    expect(a).toHaveLength(1);
    expect(a[0].article_slug).toBe("a");
  });
});

describe("reactToArticle", () => {
  it("dedups per (slug, user, reaction)", async () => {
    const first = await reactToArticle({
      articleSlug: "a",
      reaction: "helpful",
      userId: "u1",
      ipHash: null,
    });
    const second = await reactToArticle({
      articleSlug: "a",
      reaction: "helpful",
      userId: "u1",
      ipHash: null,
    });
    expect(first).toBe(true);
    expect(second).toBe(true); // duplicate key is treated as success
    expect(reactionRows).toHaveLength(1);
  });

  it("allows different users to react the same way", async () => {
    await reactToArticle({
      articleSlug: "a",
      reaction: "helpful",
      userId: "u1",
      ipHash: null,
    });
    await reactToArticle({
      articleSlug: "a",
      reaction: "helpful",
      userId: "u2",
      ipHash: null,
    });
    expect(reactionRows).toHaveLength(2);
  });

  it("rejects invalid reaction types", async () => {
    const ok = await reactToArticle({
      articleSlug: "a",
      // @ts-expect-error testing runtime validation
      reaction: "fire",
      userId: "u1",
      ipHash: null,
    });
    expect(ok).toBe(false);
  });
});

describe("getReactionCounts", () => {
  it("aggregates counts by reaction kind", async () => {
    await reactToArticle({ articleSlug: "a", reaction: "helpful", userId: "u1", ipHash: null });
    await reactToArticle({ articleSlug: "a", reaction: "helpful", userId: "u2", ipHash: null });
    await reactToArticle({ articleSlug: "a", reaction: "like", userId: "u3", ipHash: null });
    const counts = await getReactionCounts("a");
    expect(counts.helpful).toBe(2);
    expect(counts.like).toBe(1);
    expect(counts.confused).toBe(0);
  });
});

describe("helpers", () => {
  it("hashIp returns a deterministic hex slice", () => {
    const a = hashIp("1.2.3.4");
    const b = hashIp("1.2.3.4");
    expect(a).toBe(b);
    expect(a.length).toBe(32);
  });

  it("isValidReaction accepts only known kinds", () => {
    expect(isValidReaction("helpful")).toBe(true);
    expect(isValidReaction("nope")).toBe(false);
    expect(isValidReaction(null)).toBe(false);
  });
});
