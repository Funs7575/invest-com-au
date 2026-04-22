import { describe, it, expect, vi, beforeEach, afterAll } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────

vi.mock("@/lib/logger", () => ({
  logger: vi.fn(() => ({
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  })),
}));

vi.mock("@sentry/nextjs", () => ({
  captureMessage: vi.fn(),
}));

type Row = {
  id: number;
  token: string;
  article_slug: string;
  revoked_at: string | null;
  expires_at: string;
  opened_count: number;
};

let maybeSingleResult: { data: Row | null } = { data: null };
let insertError: { message: string } | null = null;
let updateError: { message: string } | null = null;
let throwOnFrom = false;

type InsertCall = { table: string; row: Record<string, unknown> };
const insertCalls: InsertCall[] = [];
type UpdateCall = { table: string; payload: Record<string, unknown>; eqCol: string; eqVal: unknown };
const updateCalls: UpdateCall[] = [];
const orderCalls: string[] = [];

const mockFrom = vi.fn((table: string) => {
  if (throwOnFrom) throw new Error("boom");
  return {
    insert: async (row: Record<string, unknown>) => {
      insertCalls.push({ table, row });
      return { data: null, error: insertError };
    },
    select: () => ({
      eq: (_col: string, _val: unknown) => ({
        maybeSingle: async () => maybeSingleResult,
        order: async (col: string) => {
          orderCalls.push(col);
          return { data: [maybeSingleResult.data].filter(Boolean) };
        },
      }),
    }),
    update: (payload: Record<string, unknown>) => ({
      eq: (col: string, val: unknown) => {
        updateCalls.push({ table, payload, eqCol: col, eqVal: val });
        // Fire-and-forget path uses .then(); resolvePreviewToken's
        // bump-counter call chains .eq().then(). Real Supabase returns
        // a thenable; we mock the thenable too.
        const thenable: Promise<{ error: typeof updateError }> & {
          then: (
            a?: (v: { error: typeof updateError }) => unknown,
            b?: (e: unknown) => unknown,
          ) => Promise<unknown>;
        } = Promise.resolve({ error: updateError }) as never;
        return thenable;
      },
    }),
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(() => ({ from: mockFrom })),
}));

import {
  createPreviewToken,
  resolvePreviewToken,
  revokePreviewToken,
  listTokensForArticle,
} from "@/lib/article-preview-tokens";

// ─── Tests ───────────────────────────────────────────────────────────

describe("article-preview-tokens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    maybeSingleResult = { data: null };
    insertError = null;
    updateError = null;
    throwOnFrom = false;
    insertCalls.length = 0;
    updateCalls.length = 0;
    orderCalls.length = 0;
  });

  afterAll(() => {
    vi.restoreAllMocks();
  });

  describe("createPreviewToken", () => {
    it("inserts a row with article_slug + created_by and returns the token", async () => {
      const result = await createPreviewToken({
        articleSlug: "etf-guide",
        createdBy: "reviewer@invest.com.au",
        note: "share with Jane",
      });
      expect(result.ok).toBe(true);
      expect(result.token).toBeTruthy();
      expect(result.token!.length).toBeGreaterThanOrEqual(24);

      expect(insertCalls).toHaveLength(1);
      const row = insertCalls[0]!.row;
      expect(row.article_slug).toBe("etf-guide");
      expect(row.created_by).toBe("reviewer@invest.com.au");
      expect(row.note).toBe("share with Jane");
      expect(row.token).toEqual(expect.any(String));
      // expires_at is an ISO string for ~72h from now by default
      expect(row.expires_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("honours a custom ttlHours", async () => {
      const result = await createPreviewToken({
        articleSlug: "etf-guide",
        createdBy: "me@invest.com.au",
        ttlHours: 1,
      });
      expect(result.ok).toBe(true);

      const expiresAt = insertCalls[0]!.row.expires_at as string;
      const expiresAtMs = new Date(expiresAt).getTime();
      const now = Date.now();
      // Within a reasonable window around "now + 1h"
      const diffMs = expiresAtMs - now;
      expect(diffMs).toBeGreaterThan(55 * 60 * 1000);
      expect(diffMs).toBeLessThan(65 * 60 * 1000);
    });

    it("defaults note to null when omitted", async () => {
      await createPreviewToken({
        articleSlug: "etf-guide",
        createdBy: "me@invest.com.au",
      });
      expect(insertCalls[0]!.row.note).toBeNull();
    });

    it("returns { ok: false, error } when the insert errors", async () => {
      insertError = { message: "unique violation" };
      const result = await createPreviewToken({
        articleSlug: "etf-guide",
        createdBy: "me@invest.com.au",
      });
      expect(result).toEqual({ ok: false, error: "unique violation" });
    });

    it("catches a thrown createAdminClient and returns { ok: false }", async () => {
      throwOnFrom = true;
      const result = await createPreviewToken({
        articleSlug: "etf-guide",
        createdBy: "me@invest.com.au",
      });
      expect(result.ok).toBe(false);
      expect(result.error).toBe("boom");
    });
  });

  describe("resolvePreviewToken", () => {
    function makeRow(overrides: Partial<Row> = {}): Row {
      return {
        id: 1,
        token: "t".repeat(32),
        article_slug: "etf-guide",
        revoked_at: null,
        expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
        opened_count: 0,
        ...overrides,
      };
    }

    it("returns null for empty / non-string / too-short tokens without DB access", async () => {
      expect(await resolvePreviewToken("")).toBeNull();
      expect(await resolvePreviewToken("short")).toBeNull();
      // maybeSingle should not have been invoked
      expect(mockFrom).not.toHaveBeenCalled();
    });

    it("returns null when the token is not found", async () => {
      maybeSingleResult = { data: null };
      expect(await resolvePreviewToken("x".repeat(32))).toBeNull();
    });

    it("returns null when the token has been revoked", async () => {
      maybeSingleResult = {
        data: makeRow({ revoked_at: new Date().toISOString() }),
      };
      expect(await resolvePreviewToken("x".repeat(32))).toBeNull();
    });

    it("returns null when the token has expired", async () => {
      maybeSingleResult = {
        data: makeRow({
          expires_at: new Date(Date.now() - 60 * 1000).toISOString(),
        }),
      };
      expect(await resolvePreviewToken("x".repeat(32))).toBeNull();
    });

    it("returns { slug } on a valid token and bumps the open counter (fire-and-forget)", async () => {
      const row = makeRow({ opened_count: 3, article_slug: "super-guide" });
      maybeSingleResult = { data: row };

      const result = await resolvePreviewToken("x".repeat(32));
      expect(result).toEqual({ slug: "super-guide" });

      // The bump-counter update is fire-and-forget, so it may or may
      // not have landed by the time resolve returns. Wait a tick.
      await Promise.resolve();

      const bump = updateCalls.find(
        (c) => c.table === "article_preview_tokens" && c.eqVal === row.id,
      );
      expect(bump?.payload.opened_count).toBe(4);
      expect(bump?.payload.last_opened_at).toEqual(expect.any(String));
    });

    it("returns null when createAdminClient throws (caught-and-swallowed)", async () => {
      throwOnFrom = true;
      expect(await resolvePreviewToken("x".repeat(32))).toBeNull();
    });
  });

  describe("revokePreviewToken", () => {
    it("stamps revoked_at and returns ok:true on success", async () => {
      const result = await revokePreviewToken(42);
      expect(result).toEqual({ ok: true });

      const call = updateCalls.find((c) => c.eqVal === 42);
      expect(call?.payload.revoked_at).toEqual(expect.any(String));
    });

    it("returns ok:false when update errors", async () => {
      updateError = { message: "fk constraint" };
      const result = await revokePreviewToken(42);
      expect(result).toEqual({ ok: false });
    });

    it("returns ok:false on a thrown error", async () => {
      throwOnFrom = true;
      const result = await revokePreviewToken(42);
      expect(result).toEqual({ ok: false });
    });
  });

  describe("listTokensForArticle", () => {
    it("returns rows ordered by created_at desc", async () => {
      maybeSingleResult = {
        data: {
          id: 1,
          token: "t".repeat(32),
          article_slug: "etf-guide",
          revoked_at: null,
          expires_at: new Date().toISOString(),
          opened_count: 0,
        },
      };
      const rows = await listTokensForArticle("etf-guide");
      expect(rows).toHaveLength(1);
      expect(orderCalls).toContain("created_at");
    });

    it("returns [] on error (never throws)", async () => {
      throwOnFrom = true;
      expect(await listTokensForArticle("etf-guide")).toEqual([]);
    });
  });
});
