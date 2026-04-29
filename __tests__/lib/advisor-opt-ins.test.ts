import { describe, it, expect, vi } from "vitest";
import { processAdvisorOptIns } from "@/lib/advisor-opt-ins";

/**
 * Builds a fake supabase admin client that records calls and returns
 * scripted responses. We don't need a real DB — these tests verify the
 * fan-out + filtering + status-update logic.
 */
function makeAdmin(overrides: { upsertResult?: { data: unknown; error: unknown }; insertLeadResult?: { data: unknown; error: unknown } } = {}) {
  const upsertCalls: unknown[] = [];
  const insertedLeadRows: unknown[] = [];
  const updatedOptInRows: { id: number; values: Record<string, unknown> }[] = [];

  const upsertResult = overrides.upsertResult ?? {
    data: [
      { id: 1, advisor_type: "mortgage_broker" },
      { id: 2, advisor_type: "buyers_agent" },
    ],
    error: null,
  };
  const insertLeadResult = overrides.insertLeadResult ?? {
    data: { id: 99 },
    error: null,
  };

  const admin = {
    from(table: string) {
      if (table === "listing_advisor_opt_ins") {
        return {
          upsert(rows: unknown[], _opts: unknown) {
            upsertCalls.push({ rows, opts: _opts });
            return {
              select(_cols: string) {
                return Promise.resolve(upsertResult);
              },
            };
          },
          update(values: Record<string, unknown>) {
            return {
              eq(_col: string, id: number) {
                updatedOptInRows.push({ id, values });
                return Promise.resolve({ data: null, error: null });
              },
            };
          },
        };
      }
      if (table === "leads") {
        return {
          insert(row: unknown) {
            insertedLeadRows.push(row);
            return {
              select(_cols: string) {
                return {
                  single() {
                    return Promise.resolve(insertLeadResult);
                  },
                };
              },
            };
          },
        };
      }
      throw new Error(`unexpected table: ${table}`);
    },
  };

  // Cast through unknown to a SupabaseClient-like type.
  return { admin: admin as unknown as Parameters<typeof processAdvisorOptIns>[0]["admin"], upsertCalls, insertedLeadRows, updatedOptInRows };
}

describe("processAdvisorOptIns", () => {
  it("filters out invalid advisor types", async () => {
    const { admin, upsertCalls } = makeAdmin();
    const result = await processAdvisorOptIns({
      admin,
      source: "investment_listing",
      advisor_types: ["mortgage_broker", "buyers_agent", "not_a_real_type", "definitely_fake"],
      contact_email: "user@example.com",
    });

    // Two valid types in, two leads queued out
    expect(result.inserted).toBe(2);
    expect(upsertCalls.length).toBe(1);
    const upserted = (upsertCalls[0] as { rows: { advisor_type: string }[] }).rows;
    expect(upserted.map((r) => r.advisor_type)).toEqual(["mortgage_broker", "buyers_agent"]);
  });

  it("returns zero-inserted when all types are invalid", async () => {
    const { admin, upsertCalls } = makeAdmin();
    const result = await processAdvisorOptIns({
      admin,
      source: "property_enquiry",
      advisor_types: ["foo", "bar"],
      contact_email: "user@example.com",
    });
    expect(result.inserted).toBe(0);
    // Doesn't even call upsert if nothing to do
    expect(upsertCalls.length).toBe(0);
  });

  it("normalises email to lowercase before persistence", async () => {
    const { admin, upsertCalls, insertedLeadRows } = makeAdmin({
      upsertResult: { data: [{ id: 1, advisor_type: "mortgage_broker" }], error: null },
    });

    await processAdvisorOptIns({
      admin,
      source: "investment_listing",
      advisor_types: ["mortgage_broker"],
      contact_email: "USER@Example.COM",
    });

    const upsertedRows = (upsertCalls[0] as { rows: { contact_email: string }[] }).rows;
    expect(upsertedRows[0].contact_email).toBe("user@example.com");
    expect((insertedLeadRows[0] as { user_email: string }).user_email).toBe("user@example.com");
  });

  it("creates one lead per valid opt-in and links lead_id back", async () => {
    const { admin, insertedLeadRows, updatedOptInRows } = makeAdmin();

    await processAdvisorOptIns({
      admin,
      source: "investment_listing",
      investment_listing_id: 42,
      advisor_types: ["mortgage_broker", "buyers_agent"],
      contact_email: "u@example.com",
      contact_name: "Tess",
      user_location_state: "NSW",
    });

    // One leads insert per opt-in
    expect(insertedLeadRows.length).toBe(2);
    expect((insertedLeadRows[0] as { lead_type: string }).lead_type).toBe("advisor");
    expect((insertedLeadRows[0] as { user_location_state: string }).user_location_state).toBe("NSW");

    // Each opt-in gets its lead_id linked back via update
    expect(updatedOptInRows.length).toBe(2);
    expect((updatedOptInRows[0].values as { lead_id: number }).lead_id).toBe(99);
    expect((updatedOptInRows[0].values as { status: string }).status).toBe("sent");
  });

  it("marks opt-in as failed when lead insert fails", async () => {
    const { admin, updatedOptInRows } = makeAdmin({
      upsertResult: { data: [{ id: 1, advisor_type: "mortgage_broker" }], error: null },
      insertLeadResult: { data: null, error: { message: "DB blew up" } },
    });

    const result = await processAdvisorOptIns({
      admin,
      source: "investment_listing",
      advisor_types: ["mortgage_broker"],
      contact_email: "u@example.com",
    });

    expect(result.inserted).toBe(0);
    expect(result.results[0]?.status).toBe("failed");
    expect((updatedOptInRows[0]?.values as { status: string })?.status).toBe("failed");
  });

  it("returns failure summary when upsert fails entirely", async () => {
    const { admin } = makeAdmin({
      upsertResult: { data: null, error: { message: "constraint violation" } },
    });

    const result = await processAdvisorOptIns({
      admin,
      source: "job_posting",
      advisor_types: ["mortgage_broker", "tax_agent"],
      contact_email: "u@example.com",
    });

    expect(result.inserted).toBe(0);
    expect(result.results.every((r) => r.status === "failed")).toBe(true);
    expect(result.results.length).toBe(2);
  });

  it("handles empty advisor_types as a no-op", async () => {
    const { admin, upsertCalls } = makeAdmin();
    const result = await processAdvisorOptIns({
      admin,
      source: "quiz_post",
      advisor_types: [],
      contact_email: "u@example.com",
    });
    expect(result.inserted).toBe(0);
    expect(upsertCalls.length).toBe(0);
  });
});

describe("processAdvisorOptIns — sources", () => {
  it("supports each opt-in source", async () => {
    const sources: Array<"investment_listing" | "property_enquiry" | "quiz_post" | "job_posting"> = [
      "investment_listing",
      "property_enquiry",
      "quiz_post",
      "job_posting",
    ];

    for (const source of sources) {
      const { admin, upsertCalls } = makeAdmin();
      await processAdvisorOptIns({
        admin,
        source,
        advisor_types: ["mortgage_broker"],
        contact_email: "u@example.com",
      });
      const row = (upsertCalls[0] as { rows: { source: string }[] }).rows[0];
      expect(row?.source).toBe(source);
    }
  });
});

// Silence the logger output during tests
vi.mock("@/lib/logger", () => ({
  logger: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }),
}));
