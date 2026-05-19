import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  syncSharesightHoldings,
  SharesightSyncError,
} from "@/lib/sharesight/sync";
import {
  encryptToken,
  decryptToken,
} from "@/lib/sharesight/token-crypto";
import type { SharesightConfig } from "@/lib/sharesight/oauth";

const HEX_KEY = "1".repeat(64);

function makeConfig(): SharesightConfig {
  return {
    clientId: "cid",
    clientSecret: "csec",
    redirectUri: "https://example.com/cb",
    baseUrl: "https://api.sharesight.test",
    scope: "user_data",
  };
}

/**
 * Minimal supabase mock that records every call so tests can assert on
 * order + filters. Supports the exact call shapes used by sync.ts:
 *   from(...).select(...).eq(...).maybeSingle()
 *   from(...).select(...).eq(...)
 *   from(...).insert(payload, { count })
 *   from(...).update(...).eq(...)
 */
interface MockState {
  oauthRow: Record<string, unknown> | null;
  existingHoldings: { ticker: string; exchange: string; acquired_at: string; shares: number }[];
  insertedRows: Record<string, unknown>[];
  oauthUpdates: Record<string, unknown>[];
  insertError: string | null;
}

function makeSupabase(state: MockState): {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: any;
  state: MockState;
} {
  const builder = (table: string) => {
    return {
      select: (_cols: string) => ({
        eq: (_col: string, _val: unknown) => {
          // Returned object is both a thenable (for `await ...select().eq()`)
          // and exposes `maybeSingle()` for the connection-row read.
          return {
            maybeSingle: async () => {
              if (table === "investor_oauth_connections") {
                return { data: state.oauthRow, error: null };
              }
              return { data: null, error: null };
            },
            then: (resolve: (v: { data: unknown; error: null }) => void) => {
              if (table === "investor_holdings") {
                resolve({ data: state.existingHoldings, error: null });
              } else if (table === "investor_oauth_connections") {
                resolve({
                  data: state.oauthRow ? [state.oauthRow] : [],
                  error: null,
                });
              } else {
                resolve({ data: [], error: null });
              }
            },
          };
        },
      }),
      insert: (payload: unknown, opts?: { count?: string }) => {
        const arr = Array.isArray(payload) ? payload : [payload];
        if (state.insertError) {
          return Promise.resolve({
            error: { message: state.insertError },
            count: null,
          });
        }
        state.insertedRows.push(...(arr as Record<string, unknown>[]));
        return Promise.resolve({
          error: null,
          count: opts?.count === "exact" ? arr.length : null,
        });
      },
      update: (payload: Record<string, unknown>) => ({
        eq: (_col: string, _val: unknown) => {
          state.oauthUpdates.push(payload);
          // Mirror the update back onto the oauth row so subsequent reads
          // see the new state.
          if (state.oauthRow) {
            state.oauthRow = { ...state.oauthRow, ...payload };
          }
          return Promise.resolve({ error: null });
        },
      }),
      delete: () => ({
        eq: (_col: string, _val: unknown) =>
          Promise.resolve({ error: null }),
      }),
    };
  };

  return {
    client: { from: builder },
    state,
  };
}

describe("syncSharesightHoldings", () => {
  beforeEach(() => {
    vi.stubEnv("SHARESIGHT_TOKEN_KEY", HEX_KEY);
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws config_missing when no config + no env", async () => {
    const state: MockState = {
      oauthRow: null,
      existingHoldings: [],
      insertedRows: [],
      oauthUpdates: [],
      insertError: null,
    };
    const { client } = makeSupabase(state);
    await expect(
      syncSharesightHoldings({
        supabase: client,
        userId: "u1",
        // no config; env stripped below
      }),
    ).rejects.toMatchObject({ code: "config_missing" });
  });

  it("throws not_connected when no oauth row exists", async () => {
    const state: MockState = {
      oauthRow: null,
      existingHoldings: [],
      insertedRows: [],
      oauthUpdates: [],
      insertError: null,
    };
    const { client } = makeSupabase(state);
    await expect(
      syncSharesightHoldings({
        supabase: client,
        userId: "u1",
        config: makeConfig(),
      }),
    ).rejects.toMatchObject({ code: "not_connected" });
  });

  it("syncs holdings end-to-end with a valid non-expired token", async () => {
    const accessTokenPlain = "valid-access-token";
    const futureExpiry = new Date(Date.now() + 60 * 60_000).toISOString();
    const state: MockState = {
      oauthRow: {
        id: 1,
        access_token_enc: encryptToken(accessTokenPlain),
        refresh_token_enc: encryptToken("refresh-token"),
        expires_at: futureExpiry,
        scope: "user_data",
        external_account_id: null,
      },
      existingHoldings: [],
      insertedRows: [],
      oauthUpdates: [],
      insertError: null,
    };
    const { client } = makeSupabase(state);

    const fakeFetch: typeof fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      // Token refresh should NOT be called when not expired.
      if (url.includes("/oauth2/token")) {
        throw new Error("unexpected refresh call");
      }
      const auth = (init?.headers as Record<string, string> | undefined)?.[
        "Authorization"
      ];
      expect(auth).toBe(`Bearer ${accessTokenPlain}`);
      if (url.endsWith("/api/v3/portfolios")) {
        return new Response(
          JSON.stringify({ portfolios: [{ id: 7, name: "Main", currency_code: "AUD" }] }),
          { status: 200 },
        );
      }
      if (url.endsWith("/api/v3/portfolios/7/holdings")) {
        return new Response(
          JSON.stringify({
            holdings: [
              {
                id: 100,
                instrument: { code: "BHP", market_code: "ASX" },
                quantity: 10,
                cost_base: 452.0,
                grant_date: "2025-01-15",
              },
              {
                id: 101,
                instrument: { code: "VAS", market_code: "AU" },
                quantity: 5,
                cost_base: 500.0,
                grant_date: "2025-02-20",
              },
            ],
          }),
          { status: 200 },
        );
      }
      throw new Error(`unexpected fetch ${url}`);
    });

    const result = await syncSharesightHoldings({
      supabase: client,
      userId: "u1",
      config: makeConfig(),
      fetchImpl: fakeFetch,
    });
    expect(result.inserted).toBe(2);
    expect(result.skippedAsDuplicate).toBe(0);
    expect(result.errors).toEqual([]);

    // Both rows landed with the right shape
    expect(state.insertedRows).toHaveLength(2);
    expect(state.insertedRows[0]).toMatchObject({
      auth_user_id: "u1",
      ticker: "BHP",
      exchange: "ASX",
      shares: 10,
      cost_basis_per_share_cents: 4520,
      acquired_at: "2025-01-15",
      broker_slug: "sharesight",
    });

    // last_synced_at + last_sync_error cleared
    const finalUpdate = state.oauthUpdates.at(-1)!;
    expect(finalUpdate.last_synced_at).toBeDefined();
    expect(finalUpdate.last_sync_error).toBeNull();
  });

  it("dedupes against existing sharesight-sourced rows", async () => {
    const accessTokenPlain = "valid-access-token";
    const futureExpiry = new Date(Date.now() + 60 * 60_000).toISOString();
    const state: MockState = {
      oauthRow: {
        id: 1,
        access_token_enc: encryptToken(accessTokenPlain),
        refresh_token_enc: encryptToken("refresh-token"),
        expires_at: futureExpiry,
        scope: "user_data",
        external_account_id: null,
      },
      // Already have BHP/ASX/2025-01-15/10
      existingHoldings: [
        { ticker: "BHP", exchange: "ASX", acquired_at: "2025-01-15", shares: 10 },
      ],
      insertedRows: [],
      oauthUpdates: [],
      insertError: null,
    };
    const { client } = makeSupabase(state);

    const fakeFetch: typeof fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith("/api/v3/portfolios")) {
        return new Response(
          JSON.stringify({ portfolios: [{ id: 7, currency_code: "AUD" }] }),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify({
          holdings: [
            // Duplicate of existing — should be skipped
            {
              id: 100,
              instrument: { code: "BHP", market_code: "ASX" },
              quantity: 10,
              cost_base: 452.0,
              grant_date: "2025-01-15",
            },
            // New
            {
              id: 101,
              instrument: { code: "VAS", market_code: "ASX" },
              quantity: 5,
              cost_base: 500.0,
              grant_date: "2025-02-20",
            },
          ],
        }),
        { status: 200 },
      );
    });

    const result = await syncSharesightHoldings({
      supabase: client,
      userId: "u1",
      config: makeConfig(),
      fetchImpl: fakeFetch,
    });
    expect(result.inserted).toBe(1);
    expect(result.skippedAsDuplicate).toBe(1);
    expect(state.insertedRows).toHaveLength(1);
    expect(state.insertedRows[0]?.ticker).toBe("VAS");
  });

  it("refreshes an expired token before fetching", async () => {
    const accessTokenPlain = "OLD-ACCESS";
    const pastExpiry = new Date(Date.now() - 60_000).toISOString();
    const state: MockState = {
      oauthRow: {
        id: 1,
        access_token_enc: encryptToken(accessTokenPlain),
        refresh_token_enc: encryptToken("OLD-REFRESH"),
        expires_at: pastExpiry,
        scope: "user_data",
        external_account_id: null,
      },
      existingHoldings: [],
      insertedRows: [],
      oauthUpdates: [],
      insertError: null,
    };
    const { client } = makeSupabase(state);

    let refreshHit = false;
    const fakeFetch: typeof fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith("/oauth2/token")) {
        const body = String(init?.body ?? "");
        expect(body).toContain("grant_type=refresh_token");
        expect(body).toContain("refresh_token=OLD-REFRESH");
        refreshHit = true;
        return new Response(
          JSON.stringify({
            access_token: "NEW-ACCESS",
            refresh_token: "NEW-REFRESH",
            expires_in: 7200,
          }),
          { status: 200 },
        );
      }
      const auth = (init?.headers as Record<string, string> | undefined)?.[
        "Authorization"
      ];
      // After refresh, the new access token must be used downstream
      expect(auth).toBe("Bearer NEW-ACCESS");
      if (url.endsWith("/api/v3/portfolios")) {
        return new Response(
          JSON.stringify({ portfolios: [{ id: 7, currency_code: "AUD" }] }),
          { status: 200 },
        );
      }
      return new Response(JSON.stringify({ holdings: [] }), { status: 200 });
    });

    const result = await syncSharesightHoldings({
      supabase: client,
      userId: "u1",
      config: makeConfig(),
      fetchImpl: fakeFetch,
    });
    expect(refreshHit).toBe(true);
    expect(result.inserted).toBe(0);

    // The refreshed token + new expiry must have been persisted (encrypted)
    const updates = state.oauthUpdates;
    const refreshUpdate = updates.find((u) => "access_token_enc" in u);
    expect(refreshUpdate).toBeDefined();
    expect(decryptToken(refreshUpdate!.access_token_enc as string)).toBe(
      "NEW-ACCESS",
    );
  });

  it("stamps last_sync_error when portfolios fetch fails", async () => {
    const futureExpiry = new Date(Date.now() + 60 * 60_000).toISOString();
    const state: MockState = {
      oauthRow: {
        id: 1,
        access_token_enc: encryptToken("VALID"),
        refresh_token_enc: encryptToken("R"),
        expires_at: futureExpiry,
        scope: null,
        external_account_id: null,
      },
      existingHoldings: [],
      insertedRows: [],
      oauthUpdates: [],
      insertError: null,
    };
    const { client } = makeSupabase(state);
    const fakeFetch = vi.fn(
      async () => new Response("server down", { status: 500 }),
    );
    await expect(
      syncSharesightHoldings({
        supabase: client,
        userId: "u1",
        config: makeConfig(),
        fetchImpl: fakeFetch,
      }),
    ).rejects.toMatchObject({ code: "fetch_failed" });
    const errorUpdate = state.oauthUpdates.find(
      (u) => typeof u.last_sync_error === "string",
    );
    expect(errorUpdate?.last_sync_error).toMatch(/portfolios|500/);
  });

  it("returns no-op success when user has no Sharesight portfolios yet", async () => {
    const futureExpiry = new Date(Date.now() + 60 * 60_000).toISOString();
    const state: MockState = {
      oauthRow: {
        id: 1,
        access_token_enc: encryptToken("VALID"),
        refresh_token_enc: encryptToken("R"),
        expires_at: futureExpiry,
        scope: null,
        external_account_id: null,
      },
      existingHoldings: [],
      insertedRows: [],
      oauthUpdates: [],
      insertError: null,
    };
    const { client } = makeSupabase(state);
    const fakeFetch = vi.fn(
      async () => new Response(JSON.stringify({ portfolios: [] }), { status: 200 }),
    );
    const result = await syncSharesightHoldings({
      supabase: client,
      userId: "u1",
      config: makeConfig(),
      fetchImpl: fakeFetch,
    });
    expect(result).toEqual({ inserted: 0, skippedAsDuplicate: 0, errors: [] });
  });

  it("throws SharesightSyncError instance (typed branch)", () => {
    const err = new SharesightSyncError("not_connected", "no row");
    expect(err.code).toBe("not_connected");
    expect(err.message).toBe("no row");
    expect(err.name).toBe("SharesightSyncError");
  });
});
