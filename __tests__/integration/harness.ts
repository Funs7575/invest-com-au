/**
 * Integration test harness.
 *
 * Provides a shared in-memory fake of the parts of supabase-js
 * that route handlers + lib functions depend on, so vitest can
 * exercise full API routes end-to-end without a network-attached
 * Supabase.
 *
 * This is NOT a unit test — each test imports a real route
 * handler (e.g. `POST` from /app/api/account/bookmarks/route.ts)
 * and invokes it with a real `NextRequest`. The harness wires
 * `@/lib/supabase/admin` + `@/lib/supabase/server` so the routes
 * use the same in-memory store and auth identity.
 *
 * What's real:
 *   - Route handler code (validation, status codes, payload shape)
 *   - Every lib function the handler calls
 *   - classifyText, rate limiting, notification helpers, etc.
 *
 * What's faked:
 *   - The Supabase query builder (in-memory tables keyed by name)
 *   - Supabase auth (you set the current user with `setAuthUser`)
 *   - Storage (upload/remove are no-ops)
 *
 * Usage:
 *
 *   import { installSupabaseFake, reset, setAuthUser, getTable } from "./harness";
 *   installSupabaseFake();
 *   beforeEach(() => reset());
 *
 *   it("POST /api/account/bookmarks stores a row", async () => {
 *     setAuthUser("u1");
 *     const { POST } = await import("@/app/api/account/bookmarks/route");
 *     const res = await POST(new NextRequest("http://test", {
 *       method: "POST",
 *       body: JSON.stringify({ type: "broker", ref: "stake" }),
 *     }));
 *     expect(res.status).toBe(200);
 *     expect(getTable("user_bookmarks")).toHaveLength(1);
 *   });
 */

import { vi } from "vitest";

// ─── In-memory state ────────────────────────────────────────────

interface Row {
  id?: number;
  [key: string]: unknown;
}

const store = new Map<string, Row[]>();
const nextIds = new Map<string, number>();

let currentUser: { id: string; email: string } | null = null;
let authUsers: Array<{ id: string; email: string }> = [];

// Rate limits live in the shared store under "rate_limit_bucket"
// so rate-limit-db.ts thinks it's persisting properly.

export function reset() {
  store.clear();
  nextIds.clear();
  currentUser = null;
  authUsers = [];
}

export function setAuthUser(userId: string | null, email = "test@example.com") {
  currentUser = userId ? { id: userId, email } : null;
  if (userId && !authUsers.find((u) => u.id === userId)) {
    authUsers.push({ id: userId, email });
  }
}

export function addAuthUser(userId: string, email: string) {
  authUsers.push({ id: userId, email });
}

export function getTable(name: string): Row[] {
  return store.get(name) || [];
}

export function seedTable(name: string, rows: Row[]) {
  const existing = store.get(name) || [];
  for (const r of rows) {
    if (r.id == null) {
      const next = (nextIds.get(name) || 1);
      r.id = next;
      nextIds.set(name, next + 1);
    }
  }
  store.set(name, [...existing, ...rows]);
}

// ─── Query builder fake ────────────────────────────────────────

interface Filter {
  col: string;
  op: "eq" | "neq" | "in" | "is" | "gte" | "lte" | "lt" | "gt" | "contains" | "overlaps" | "ilike";
  val: unknown;
}

interface BuilderState {
  table: string;
  op: "select" | "insert" | "update" | "upsert" | "delete";
  selectCols?: string;
  selectOpts?: { count?: string; head?: boolean };
  filters: Filter[];
  payload?: Row | Row[];
  upsertOpts?: { onConflict?: string };
  orderBy?: { col: string; asc: boolean };
  limitN?: number;
  singleMode?: "single" | "maybeSingle" | null;
}

function matchesFilter(row: Row, filter: Filter): boolean {
  const v = row[filter.col];
  switch (filter.op) {
    case "eq":
      return v === filter.val;
    case "neq":
      return v !== filter.val;
    case "in":
      return Array.isArray(filter.val) && (filter.val as unknown[]).includes(v);
    case "is":
      return v === filter.val;
    case "gte":
      return v != null && (v as number | string) >= (filter.val as number | string);
    case "lte":
      return v != null && (v as number | string) <= (filter.val as number | string);
    case "gt":
      return v != null && (v as number | string) > (filter.val as number | string);
    case "lt":
      return v != null && (v as number | string) < (filter.val as number | string);
    case "contains":
      return Array.isArray(v) && Array.isArray(filter.val) && (filter.val as unknown[]).every((x) => (v as unknown[]).includes(x));
    case "overlaps":
      return Array.isArray(v) && Array.isArray(filter.val) && (filter.val as unknown[]).some((x) => (v as unknown[]).includes(x));
    case "ilike":
      return typeof v === "string" && typeof filter.val === "string" &&
        v.toLowerCase() === (filter.val as string).replace(/%/g, "").toLowerCase();
    default:
      return true;
  }
}

function conflictMatch(target: Row, existing: Row, onConflict: string): boolean {
  const cols = onConflict.split(",").map((c) => c.trim());
  return cols.every((c) => target[c] === existing[c]);
}

function assignId(table: string, row: Row): Row {
  if (row.id != null) return row;
  const next = nextIds.get(table) || 1;
  nextIds.set(table, next + 1);
  return { ...row, id: next };
}

function makeBuilder(table: string) {
  const state: BuilderState = {
    table,
    op: "select",
    filters: [],
    singleMode: null,
  };

  const api: Record<string, unknown> = {};

  api.select = (cols?: string, opts?: { count?: string; head?: boolean }) => {
    // In supabase-js, .update(...).select("*") chains a "return
    // the updated rows" hint onto the existing update op — it
    // does NOT switch the operation to a read. Only set op="select"
    // when we're not already in a write mode.
    if (state.op === "select") {
      state.op = "select";
    }
    state.selectCols = cols;
    state.selectOpts = opts;
    return api;
  };
  api.insert = (payload: Row | Row[]) => {
    state.op = "insert";
    state.payload = payload;
    return api;
  };
  api.update = (payload: Row, opts?: { count?: string }) => {
    state.op = "update";
    state.payload = payload;
    // `claimSessionQuizzes` calls .update(payload, { count: "exact" })
    // to get back the number of rows changed. Thread the option through.
    if (opts?.count) state.selectOpts = opts;
    return api;
  };
  api.upsert = (payload: Row | Row[], opts?: { onConflict?: string }) => {
    state.op = "upsert";
    state.payload = payload;
    state.upsertOpts = opts;
    return api;
  };
  api.delete = () => {
    state.op = "delete";
    return api;
  };

  const addFilter = (op: Filter["op"]) => (col: string, val: unknown) => {
    state.filters.push({ col, op, val });
    return api;
  };

  api.eq = addFilter("eq");
  api.neq = addFilter("neq");
  api.in = addFilter("in");
  api.is = addFilter("is");
  api.gte = addFilter("gte");
  api.lte = addFilter("lte");
  api.gt = addFilter("gt");
  api.lt = addFilter("lt");
  api.contains = addFilter("contains");
  api.overlaps = addFilter("overlaps");
  api.ilike = addFilter("ilike");
  api.not = (col: string, op: string, val: unknown) => {
    // Used by e.g. .not("read_at", "is", null)
    if (op === "is") {
      state.filters.push({ col, op: "neq", val });
    } else if (op === "in") {
      state.filters.push({ col, op: "neq", val: Array.isArray(val) ? val : [val] });
      // Convert to a pseudo "exclude in" by post-filtering
      const filter = state.filters[state.filters.length - 1];
      // Re-tag with a sentinel so we can handle it below
      (filter as Filter & { _notIn?: boolean })._notIn = true;
    }
    return api;
  };
  api.or = (_expr: string) => api; // no-op in the harness
  api.order = (col: string, opts?: { ascending: boolean }) => {
    state.orderBy = { col, asc: opts?.ascending !== false };
    return api;
  };
  api.limit = (n: number) => {
    state.limitN = n;
    return api;
  };
  api.single = () => {
    state.singleMode = "single";
    return run();
  };
  api.maybeSingle = () => {
    state.singleMode = "maybeSingle";
    return run();
  };

  // Execute on await (thenable)
  (api as Record<string, unknown>).then = (resolve: (v: unknown) => void, reject?: (err: unknown) => void) => {
    try {
      resolve(run());
    } catch (err) {
      reject?.(err);
    }
    return undefined as unknown;
  };

  function run(): Promise<{ data: unknown; error: unknown; count?: number }> | { data: unknown; error: unknown; count?: number } {
    const rows = store.get(state.table) || [];

    const filterRows = (list: Row[]): Row[] =>
      list.filter((r) =>
        state.filters.every((f) => {
          const notIn = (f as Filter & { _notIn?: boolean })._notIn;
          if (notIn) {
            return !(Array.isArray(f.val) && (f.val as unknown[]).includes(r[f.col]));
          }
          return matchesFilter(r, f);
        }),
      );

    if (state.op === "insert") {
      const payloads = Array.isArray(state.payload) ? state.payload : [state.payload!];
      const inserted: Row[] = [];
      for (const raw of payloads) {
        const row = assignId(state.table, { ...raw });
        const list = store.get(state.table) || [];
        store.set(state.table, [...list, row]);
        inserted.push(row);
      }
      const data = state.singleMode ? inserted[0] : inserted;
      return Promise.resolve({ data, error: null });
    }

    if (state.op === "upsert") {
      const payloads = Array.isArray(state.payload) ? state.payload : [state.payload!];
      const list = [...(store.get(state.table) || [])];
      const inserted: Row[] = [];
      for (const raw of payloads) {
        let existingIdx = -1;
        if (state.upsertOpts?.onConflict) {
          existingIdx = list.findIndex((r) =>
            conflictMatch(raw, r, state.upsertOpts!.onConflict!),
          );
        }
        if (existingIdx >= 0) {
          list[existingIdx] = { ...list[existingIdx], ...raw };
          inserted.push(list[existingIdx]);
        } else {
          const row = assignId(state.table, { ...raw });
          list.push(row);
          inserted.push(row);
        }
      }
      store.set(state.table, list);
      const data = state.singleMode ? inserted[0] : inserted;
      return Promise.resolve({ data, error: null });
    }

    if (state.op === "update") {
      const matched = filterRows(rows);
      matched.forEach((r) => Object.assign(r, state.payload));
      const data = state.singleMode ? matched[0] || null : matched;
      const result: { data: unknown; error: unknown; count?: number } = {
        data,
        error: null,
      };
      if (state.selectOpts?.count === "exact") {
        result.count = matched.length;
      }
      return Promise.resolve(result);
    }

    if (state.op === "delete") {
      const matched = filterRows(rows);
      const remaining = rows.filter((r) => !matched.includes(r));
      store.set(state.table, remaining);
      return Promise.resolve({ data: matched, error: null });
    }

    // select
    let matched = filterRows(rows);

    if (state.orderBy) {
      const { col, asc } = state.orderBy;
      matched = [...matched].sort((a, b) => {
        const va = a[col];
        const vb = b[col];
        if (va == null && vb == null) return 0;
        if (va == null) return asc ? -1 : 1;
        if (vb == null) return asc ? 1 : -1;
        if (va < vb) return asc ? -1 : 1;
        if (va > vb) return asc ? 1 : -1;
        return 0;
      });
    }
    if (state.limitN != null) matched = matched.slice(0, state.limitN);

    if (state.selectOpts?.count === "exact") {
      return Promise.resolve({
        data: state.selectOpts.head ? null : matched,
        error: null,
        count: matched.length,
      });
    }
    if (state.singleMode === "single") {
      return Promise.resolve({
        data: matched[0] || null,
        error: matched.length === 0 ? { message: "no row" } : null,
      });
    }
    if (state.singleMode === "maybeSingle") {
      return Promise.resolve({ data: matched[0] || null, error: null });
    }
    return Promise.resolve({ data: matched, error: null });
  }

  return api;
}

// ─── Supabase client fake ────────────────────────────────────────

function createFakeClient() {
  return {
    from: (table: string) => makeBuilder(table),
    auth: {
      getUser: async () => ({
        data: { user: currentUser },
        error: null,
      }),
      admin: {
        listUsers: async ({ page, perPage }: { page: number; perPage: number }) => {
          const start = (page - 1) * perPage;
          return {
            data: { users: authUsers.slice(start, start + perPage) },
            error: null,
          };
        },
        createUser: async ({ email }: { email: string }) => {
          const id = `u${authUsers.length + 1}`;
          authUsers.push({ id, email });
          return { data: { user: { id, email } }, error: null };
        },
      },
    },
    storage: {
      from: () => ({
        upload: async () => ({ data: { path: "" }, error: null }),
        remove: async () => ({ error: null }),
        list: async () => ({ data: [], error: null }),
        getPublicUrl: () => ({ data: { publicUrl: "" } }),
      }),
    },
  };
}

// ─── Install the fake onto the module system ───────────────────

/**
 * Call this at the top of the test file (before any imports of
 * handlers / libs that use supabase) to wire the fakes.
 */
export function installSupabaseFake() {
  vi.mock("@/lib/supabase/admin", () => ({
    createAdminClient: () => createFakeClient(),
  }));
  vi.mock("@/lib/supabase/server", () => ({
    createClient: async () => createFakeClient(),
  }));
  vi.mock("@/lib/logger", () => ({
    logger: () => ({
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
    }),
  }));
  // Rate limit has its own DB-backed bucket; short-circuit it so
  // integration tests don't get throttled by a fake ticker.
  vi.mock("@/lib/rate-limit-db", () => ({
    isAllowed: async () => true,
    ipKey: () => "127.0.0.1",
  }));
}
