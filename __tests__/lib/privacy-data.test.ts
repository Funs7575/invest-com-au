import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { exportUserData, eraseUserData, PII_SURFACES } from "@/lib/privacy-data";

/**
 * We build a minimal fake supabase client that:
 *  - On select+eq, returns pre-seeded rows matching the email
 *  - On delete+eq, returns count=N for N matching rows
 *  - On update+eq, returns count=N and records the new email
 */
function makeFakeSupabase(seed: Record<string, Array<Record<string, unknown>>>) {
  const state = { ...seed };
  const updates: Array<{ table: string; patch: Record<string, unknown> }> = [];

  const client = {
    from: (table: string) => {
      const builder: Record<string, unknown> = {};
      let currentOp: "select" | "delete" | "update" = "select";
      let updatePatch: Record<string, unknown> = {};
      builder.select = () => builder;
      builder.delete = () => {
        currentOp = "delete";
        return builder;
      };
      builder.update = (patch: Record<string, unknown>) => {
        currentOp = "update";
        updatePatch = patch;
        return builder;
      };
      builder.eq = async (_col: string, value: unknown) => {
        const rows = state[table] || [];
        const matching = rows.filter((r) => r.email === value);
        if (currentOp === "delete") {
          state[table] = rows.filter((r) => r.email !== value);
          return { error: null, count: matching.length };
        }
        if (currentOp === "update") {
          for (const row of matching) {
            Object.assign(row, updatePatch);
          }
          updates.push({ table, patch: updatePatch });
          return { error: null, count: matching.length };
        }
        // select
        return { data: matching, error: null };
      };
      return builder;
    },
  };

  return { client: client as unknown as SupabaseClient, state, updates };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("exportUserData", () => {
  it("returns empty arrays when nothing is stored", async () => {
    const { client } = makeFakeSupabase({});
    const bundle = await exportUserData(client, "alice@example.com");
    for (const surface of PII_SURFACES) {
      if (surface.exportable) {
        expect(bundle[surface.table]).toEqual([]);
      }
    }
  });

  it("returns matching rows per table", async () => {
    const { client } = makeFakeSupabase({
      email_captures: [{ email: "alice@example.com", topic: "deals" }],
      quiz_leads: [{ email: "alice@example.com", score: 7 }],
      professional_leads: [{ email: "alice@example.com", professional_id: 42 }],
    });
    const bundle = await exportUserData(client, "alice@example.com");
    expect(bundle.email_captures).toHaveLength(1);
    expect(bundle.quiz_leads).toHaveLength(1);
    expect(bundle.professional_leads).toHaveLength(1);
  });

  it("lower-cases the email before matching", async () => {
    const { client } = makeFakeSupabase({
      email_captures: [{ email: "bob@example.com" }],
    });
    const bundle = await exportUserData(client, "BOB@EXAMPLE.COM");
    expect(bundle.email_captures).toHaveLength(1);
  });
});

describe("eraseUserData", () => {
  it("deletes from tables with delete strategy, anonymises the rest", async () => {
    const { client, state } = makeFakeSupabase({
      email_captures: [{ email: "alice@example.com" }],
      quiz_leads: [{ email: "alice@example.com" }],
      user_reviews: [{ email: "alice@example.com", rating: 5, body: "great" }],
      professional_leads: [{ email: "alice@example.com", professional_id: 1 }],
    });

    const affected = await eraseUserData(client, "alice@example.com");

    // email_captures and quiz_leads are delete-strategy → row gone
    expect(state.email_captures).toHaveLength(0);
    expect(state.quiz_leads).toHaveLength(0);
    expect(affected.email_captures).toBe(1);
    expect(affected.quiz_leads).toBe(1);

    // user_reviews is anonymise-strategy → row still exists but email changed
    expect(state.user_reviews).toHaveLength(1);
    expect(state.user_reviews[0].email).not.toBe("alice@example.com");
    expect((state.user_reviews[0].email as string)).toMatch(/^anonymised-.*@privacy/);

    // Body preserved so the broker review remains useful
    expect(state.user_reviews[0].body).toBe("great");
  });

  it("uses a deterministic anonymisation placeholder", async () => {
    const { client: c1, state: s1 } = makeFakeSupabase({
      user_reviews: [{ email: "x@y.com" }],
    });
    const { client: c2, state: s2 } = makeFakeSupabase({
      user_reviews: [{ email: "x@y.com" }],
    });
    await eraseUserData(c1, "x@y.com");
    await eraseUserData(c2, "x@y.com");
    expect(s1.user_reviews[0].email).toBe(s2.user_reviews[0].email);
  });
});

describe("PII_SURFACES", () => {
  it("includes the known PII tables", () => {
    const names = PII_SURFACES.map((s) => s.table);
    expect(names).toContain("email_captures");
    expect(names).toContain("quiz_leads");
    expect(names).toContain("professional_leads");
    expect(names).toContain("user_reviews");
  });

  it("every surface is either delete or anonymise", () => {
    for (const surface of PII_SURFACES) {
      expect(["delete", "anonymise"]).toContain(surface.deleteStrategy);
    }
  });
});
