/**
 * lib/pro-intake unit tests.
 *
 * The module reads/writes via the service-role Supabase client and
 * checks team membership via lib/expert-teams. Both are mocked. The
 * Supabase mock is a tiny in-memory implementation of the chained
 * builder methods we touch (select/eq/insert/update/delete/upsert/etc.).
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

interface Question {
  id: number;
  owner_kind: "professional" | "team";
  professional_id: number | null;
  team_id: number | null;
  prompt: string;
  kind: "text" | "number" | "select" | "phone" | "email";
  options: string[];
  required: boolean;
  sort_order: number;
  enabled: boolean;
  created_at: string;
}

interface Answer {
  id: number;
  brief_id: number;
  question_id: number;
  answer: string;
  answered_at: string;
}

interface Brief {
  id: number;
  accepted_by_professional_id: number | null;
  accepted_by_team_id: number | null;
  contact_email: string | null;
}

const store = vi.hoisted(() => ({
  questions: [] as Question[],
  answers: [] as Answer[],
  briefs: [] as Brief[],
  nextQId: 1,
  nextAId: 1,
}));

function buildQuery(table: string) {
  const filters: Array<(row: Record<string, unknown>) => boolean> = [];
  let updatePayload: Record<string, unknown> | null = null;
  let insertPayload: Record<string, unknown> | Record<string, unknown>[] | null = null;
  let upsertPayload: Record<string, unknown>[] | null = null;
  let isDelete = false;
  let returnSingle: "single" | "maybe" | "none" = "none";
  const order: { col: string; asc: boolean }[] = [];
  let countMode = false;

  const dataset = (): Record<string, unknown>[] => {
    if (table === "pro_intake_questions") {
      return store.questions as unknown as Record<string, unknown>[];
    }
    if (table === "pro_intake_answers") {
      return store.answers as unknown as Record<string, unknown>[];
    }
    if (table === "advisor_auctions") {
      return store.briefs as unknown as Record<string, unknown>[];
    }
    return [];
  };

  function applyFilters(rows: Record<string, unknown>[]): Record<string, unknown>[] {
    return rows.filter((row) => filters.every((f) => f(row)));
  }

  function applyOrder(rows: Record<string, unknown>[]): Record<string, unknown>[] {
    const copy = [...rows];
    for (const o of order) {
      copy.sort((a, b) => {
        const av = a[o.col] as number;
        const bv = b[o.col] as number;
        const cmp = av === bv ? 0 : av < bv ? -1 : 1;
        return o.asc ? cmp : -cmp;
      });
    }
    return copy;
  }

  function execute(): { data: unknown; error: null; count?: number } {
    if (isDelete) {
      const target = applyFilters(dataset());
      const ids = new Set(target.map((r) => r["id"]));
      if (table === "pro_intake_questions") {
        store.questions = store.questions.filter((q) => !ids.has(q.id));
      } else if (table === "pro_intake_answers") {
        store.answers = store.answers.filter((a) => !ids.has(a.id));
      }
      return { data: target, error: null };
    }
    if (insertPayload) {
      const rows = Array.isArray(insertPayload) ? insertPayload : [insertPayload];
      const inserted: Record<string, unknown>[] = [];
      for (const row of rows) {
        if (table === "pro_intake_questions") {
          const q: Question = {
            id: store.nextQId++,
            owner_kind: row["owner_kind"] as Question["owner_kind"],
            professional_id: (row["professional_id"] as number | null) ?? null,
            team_id: (row["team_id"] as number | null) ?? null,
            prompt: row["prompt"] as string,
            kind: (row["kind"] as Question["kind"]) ?? "text",
            options: (row["options"] as string[]) ?? [],
            required: (row["required"] as boolean) ?? true,
            sort_order: (row["sort_order"] as number) ?? 0,
            enabled: (row["enabled"] as boolean) ?? true,
            created_at: new Date().toISOString(),
          };
          store.questions.push(q);
          inserted.push(q as unknown as Record<string, unknown>);
        }
      }
      const out =
        returnSingle === "single" || returnSingle === "maybe"
          ? (inserted[0] ?? null)
          : inserted;
      return { data: out, error: null };
    }
    if (upsertPayload) {
      const upserted: Record<string, unknown>[] = [];
      for (const row of upsertPayload) {
        if (table === "pro_intake_answers") {
          const existing = store.answers.find(
            (a) => a.brief_id === row["brief_id"] && a.question_id === row["question_id"],
          );
          if (existing) {
            existing.answer = row["answer"] as string;
            existing.answered_at = new Date().toISOString();
            upserted.push(existing as unknown as Record<string, unknown>);
          } else {
            const a: Answer = {
              id: store.nextAId++,
              brief_id: row["brief_id"] as number,
              question_id: row["question_id"] as number,
              answer: row["answer"] as string,
              answered_at: new Date().toISOString(),
            };
            store.answers.push(a);
            upserted.push(a as unknown as Record<string, unknown>);
          }
        }
      }
      return { data: upserted, error: null };
    }
    if (updatePayload) {
      const target = applyFilters(dataset());
      for (const row of target) {
        for (const [k, v] of Object.entries(updatePayload)) {
          (row as Record<string, unknown>)[k] = v;
        }
      }
      const data =
        returnSingle === "single" || returnSingle === "maybe"
          ? (target[0] ?? null)
          : target;
      return { data, error: null };
    }
    // SELECT
    const filtered = applyFilters(dataset());
    const ordered = applyOrder(filtered);
    if (countMode) {
      return { data: null, error: null, count: ordered.length };
    }
    const data =
      returnSingle === "single"
        ? (ordered[0] ?? null)
        : returnSingle === "maybe"
          ? (ordered[0] ?? null)
          : ordered;
    return { data, error: null };
  }

  const chain = {
    select(_cols?: string, opts?: { count?: string; head?: boolean }) {
      if (opts?.count === "exact") {
        countMode = true;
      }
      return chain;
    },
    eq(col: string, value: unknown) {
      filters.push((row) => row[col] === value);
      return chain;
    },
    in(col: string, values: unknown[]) {
      filters.push((row) => values.includes(row[col]));
      return chain;
    },
    order(col: string, opts?: { ascending?: boolean }) {
      order.push({ col, asc: opts?.ascending !== false });
      return chain;
    },
    insert(payload: Record<string, unknown> | Record<string, unknown>[]) {
      insertPayload = payload;
      return chain;
    },
    update(payload: Record<string, unknown>) {
      updatePayload = payload;
      return chain;
    },
    upsert(payload: Record<string, unknown>[], _opts?: { onConflict?: string }) {
      upsertPayload = payload;
      return chain;
    },
    delete() {
      isDelete = true;
      return chain;
    },
    single() {
      returnSingle = "single";
      return execute();
    },
    maybeSingle() {
      returnSingle = "maybe";
      return execute();
    },
    then(resolve: (value: unknown) => void) {
      resolve(execute());
    },
  };
  return chain;
}

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => buildQuery(table),
  }),
}));

vi.mock("@/lib/expert-teams", () => ({
  isProfessionalOnTeam: vi.fn(async (teamId: number, professionalId: number) => {
    // Membership rule for tests: prof 99 is on team 7; prof 99 is on team 8.
    if (professionalId === 99 && (teamId === 7 || teamId === 8)) return true;
    return false;
  }),
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
  MAX_QUESTIONS_PER_OWNER,
  IntakeError,
  upsertQuestion,
  listForProfessional,
  listForTeam,
  removeQuestion,
  submitAnswers,
  getQuestionsForBrief,
  getAnswersForBrief,
} from "@/lib/pro-intake";

beforeEach(() => {
  store.questions = [];
  store.answers = [];
  store.briefs = [];
  store.nextQId = 1;
  store.nextAId = 1;
});

describe("upsertQuestion (create path)", () => {
  it("creates a new question for the calling professional", async () => {
    const q = await upsertQuestion({
      owner_kind: "professional",
      owner_id: 42,
      acting_professional_id: 42,
      prompt: "How urgent is this?",
    });
    expect(q.id).toBeGreaterThan(0);
    expect(q.prompt).toBe("How urgent is this?");
    expect(q.kind).toBe("text");
    const all = await listForProfessional(42);
    expect(all).toHaveLength(1);
  });

  it("refuses to create when acting professional isn't the owner", async () => {
    await expect(
      upsertQuestion({
        owner_kind: "professional",
        owner_id: 42,
        acting_professional_id: 7,
        prompt: "Some question",
      }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("enforces the 5-question cap", async () => {
    for (let i = 0; i < MAX_QUESTIONS_PER_OWNER; i++) {
      await upsertQuestion({
        owner_kind: "professional",
        owner_id: 42,
        acting_professional_id: 42,
        prompt: `Q ${i + 1}`,
      });
    }
    expect(await listForProfessional(42)).toHaveLength(MAX_QUESTIONS_PER_OWNER);
    await expect(
      upsertQuestion({
        owner_kind: "professional",
        owner_id: 42,
        acting_professional_id: 42,
        prompt: "One too many",
      }),
    ).rejects.toBeInstanceOf(IntakeError);
  });

  it("requires at least 2 options for select-kind questions", async () => {
    await expect(
      upsertQuestion({
        owner_kind: "professional",
        owner_id: 42,
        acting_professional_id: 42,
        prompt: "Pick one",
        kind: "select",
        options: ["only"],
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("allows a team member to manage team questions", async () => {
    const q = await upsertQuestion({
      owner_kind: "team",
      owner_id: 7,
      acting_professional_id: 99,
      prompt: "Team prompt",
    });
    expect(q.team_id).toBe(7);
    const list = await listForTeam(7);
    expect(list).toHaveLength(1);
  });
});

describe("removeQuestion", () => {
  it("deletes a question owned by the calling professional", async () => {
    const q = await upsertQuestion({
      owner_kind: "professional",
      owner_id: 42,
      acting_professional_id: 42,
      prompt: "Doomed",
    });
    await removeQuestion(q.id, 42);
    expect(await listForProfessional(42)).toHaveLength(0);
  });

  it("rejects deletion by a non-owner", async () => {
    const q = await upsertQuestion({
      owner_kind: "professional",
      owner_id: 42,
      acting_professional_id: 42,
      prompt: "Survives",
    });
    await expect(removeQuestion(q.id, 7)).rejects.toMatchObject({ status: 403 });
    expect(await listForProfessional(42)).toHaveLength(1);
  });
});

describe("submitAnswers / getQuestionsForBrief", () => {
  it("rejects when the brief has not been accepted", async () => {
    store.briefs.push({
      id: 1001,
      accepted_by_professional_id: null,
      accepted_by_team_id: null,
      contact_email: "owner@example.com",
    });
    await expect(
      submitAnswers({ briefId: 1001, answers: [{ question_id: 1, answer: "x" }] }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("persists answers for an accepted brief and enforces eligible-question scoping", async () => {
    const q1 = await upsertQuestion({
      owner_kind: "professional",
      owner_id: 42,
      acting_professional_id: 42,
      prompt: "Urgency?",
    });
    const q2 = await upsertQuestion({
      owner_kind: "professional",
      owner_id: 42,
      acting_professional_id: 42,
      prompt: "Budget?",
      required: false,
    });
    store.briefs.push({
      id: 2001,
      accepted_by_professional_id: 42,
      accepted_by_team_id: null,
      contact_email: "owner@example.com",
    });

    const saved = await submitAnswers({
      briefId: 2001,
      answers: [
        { question_id: q1.id, answer: "high" },
        { question_id: q2.id, answer: "10k" },
      ],
    });
    expect(saved).toHaveLength(2);

    await expect(
      submitAnswers({
        briefId: 2001,
        answers: [{ question_id: 999, answer: "x" }],
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("blocks getAnswersForBrief for a non-accepting professional", async () => {
    store.briefs.push({
      id: 3001,
      accepted_by_professional_id: 42,
      accepted_by_team_id: null,
      contact_email: "owner@example.com",
    });
    await expect(getAnswersForBrief(3001, 99)).rejects.toMatchObject({ status: 403 });
  });

  it("getQuestionsForBrief returns the accepting pro's enabled questions", async () => {
    const q = await upsertQuestion({
      owner_kind: "professional",
      owner_id: 42,
      acting_professional_id: 42,
      prompt: "Tell me more",
    });
    store.briefs.push({
      id: 4001,
      accepted_by_professional_id: 42,
      accepted_by_team_id: null,
      contact_email: "owner@example.com",
    });
    const list = await getQuestionsForBrief(4001);
    expect(list).toHaveLength(1);
    expect(list[0]?.id).toBe(q.id);
  });
});
