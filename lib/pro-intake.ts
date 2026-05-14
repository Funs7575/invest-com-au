/**
 * Pro intake question customisation (MM-10).
 *
 * A professional or expert_team can declare 1-5 short qualifying prompts that
 * the consumer must answer between brief acceptance and contact unlock. The
 * cap is enforced here (not in a DB trigger) so the API returns a friendly
 * 4xx instead of trapping on a Postgres `RAISE EXCEPTION`.
 *
 * The two tables (`pro_intake_questions`, `pro_intake_answers`) sit behind RLS
 * (see `supabase/migrations/20260514_mm10_pro_intake_questions.sql`). The
 * helpers in this file always use the service-role client because they run on
 * behalf of cookie-session advisors (no Supabase JWT available) and need
 * cross-row checks for ownership/permission that anon-role policies can't
 * express.
 */

// eslint-disable-next-line no-restricted-imports -- service-role legitimate per CLAUDE.md: cookie-session advisors have no auth.uid(); permission checks happen in this module.
import { createAdminClient } from "@/lib/supabase/admin";
import { isProfessionalOnTeam } from "@/lib/expert-teams";
import { logger } from "@/lib/logger";

const log = logger("pro-intake");

export const MAX_QUESTIONS_PER_OWNER = 5;

export type IntakeQuestionKind = "text" | "number" | "select" | "phone" | "email";
export type IntakeOwnerKind = "professional" | "team";

export interface IntakeQuestion {
  id: number;
  owner_kind: IntakeOwnerKind;
  professional_id: number | null;
  team_id: number | null;
  prompt: string;
  kind: IntakeQuestionKind;
  options: string[];
  required: boolean;
  sort_order: number;
  enabled: boolean;
  created_at: string;
}

export interface IntakeAnswer {
  id: number;
  brief_id: number;
  question_id: number;
  answer: string;
  answered_at: string;
}

interface RawQuestion {
  id: number;
  owner_kind: IntakeOwnerKind;
  professional_id: number | null;
  team_id: number | null;
  prompt: string;
  kind: IntakeQuestionKind;
  options: unknown;
  required: boolean;
  sort_order: number;
  enabled: boolean;
  created_at: string;
}

function normaliseOptions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out: string[] = [];
  for (const value of raw) {
    if (typeof value === "string" && value.trim().length > 0) {
      out.push(value.trim());
    }
  }
  return out;
}

function hydrate(row: RawQuestion): IntakeQuestion {
  return {
    id: row.id,
    owner_kind: row.owner_kind,
    professional_id: row.professional_id,
    team_id: row.team_id,
    prompt: row.prompt,
    kind: row.kind,
    options: normaliseOptions(row.options),
    required: row.required,
    sort_order: row.sort_order,
    enabled: row.enabled,
    created_at: row.created_at,
  };
}

export class IntakeError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.name = "IntakeError";
    this.status = status;
  }
}

// ── Reads ───────────────────────────────────────────────────────────────────

export async function listForProfessional(
  professionalId: number,
  { onlyEnabled = false }: { onlyEnabled?: boolean } = {},
): Promise<IntakeQuestion[]> {
  const admin = createAdminClient();
  let query = admin
    .from("pro_intake_questions")
    .select(
      "id, owner_kind, professional_id, team_id, prompt, kind, options, required, sort_order, enabled, created_at",
    )
    .eq("professional_id", professionalId)
    .eq("owner_kind", "professional")
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  if (onlyEnabled) query = query.eq("enabled", true);
  const { data, error } = await query;
  if (error) {
    log.warn("listForProfessional failed", { professionalId, err: error.message });
    return [];
  }
  return ((data ?? []) as RawQuestion[]).map(hydrate);
}

export async function listForTeam(
  teamId: number,
  { onlyEnabled = false }: { onlyEnabled?: boolean } = {},
): Promise<IntakeQuestion[]> {
  const admin = createAdminClient();
  let query = admin
    .from("pro_intake_questions")
    .select(
      "id, owner_kind, professional_id, team_id, prompt, kind, options, required, sort_order, enabled, created_at",
    )
    .eq("team_id", teamId)
    .eq("owner_kind", "team")
    .order("sort_order", { ascending: true })
    .order("id", { ascending: true });
  if (onlyEnabled) query = query.eq("enabled", true);
  const { data, error } = await query;
  if (error) {
    log.warn("listForTeam failed", { teamId, err: error.message });
    return [];
  }
  return ((data ?? []) as RawQuestion[]).map(hydrate);
}

export async function getQuestionById(id: number): Promise<IntakeQuestion | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("pro_intake_questions")
    .select(
      "id, owner_kind, professional_id, team_id, prompt, kind, options, required, sort_order, enabled, created_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) {
    log.warn("getQuestionById failed", { id, err: error.message });
    return null;
  }
  if (!data) return null;
  return hydrate(data as RawQuestion);
}

// ── Permission helpers ──────────────────────────────────────────────────────

export async function isOwner(
  question: Pick<IntakeQuestion, "owner_kind" | "professional_id" | "team_id">,
  professionalId: number,
): Promise<boolean> {
  if (question.owner_kind === "professional") {
    return question.professional_id === professionalId;
  }
  if (question.owner_kind === "team" && question.team_id != null) {
    return isProfessionalOnTeam(question.team_id, professionalId);
  }
  return false;
}

async function countQuestions({
  ownerKind,
  ownerId,
}: {
  ownerKind: IntakeOwnerKind;
  ownerId: number;
}): Promise<number> {
  const admin = createAdminClient();
  const column = ownerKind === "professional" ? "professional_id" : "team_id";
  const { count, error } = await admin
    .from("pro_intake_questions")
    .select("id", { count: "exact", head: true })
    .eq(column, ownerId)
    .eq("owner_kind", ownerKind);
  if (error) {
    log.warn("countQuestions failed", { ownerKind, ownerId, err: error.message });
    return 0;
  }
  return count ?? 0;
}

// ── Writes ──────────────────────────────────────────────────────────────────

export interface UpsertQuestionInput {
  id?: number;
  owner_kind: IntakeOwnerKind;
  owner_id: number;
  /** The professional initiating the change — used for ownership verification. */
  acting_professional_id: number;
  prompt: string;
  kind?: IntakeQuestionKind;
  options?: string[];
  required?: boolean;
  sort_order?: number;
  enabled?: boolean;
}

export async function upsertQuestion(input: UpsertQuestionInput): Promise<IntakeQuestion> {
  const {
    id,
    owner_kind,
    owner_id,
    acting_professional_id,
    prompt,
    kind = "text",
    options = [],
    required = true,
    sort_order = 0,
    enabled = true,
  } = input;

  // Permission check first.
  if (owner_kind === "professional") {
    if (owner_id !== acting_professional_id) {
      throw new IntakeError("You can only manage your own intake questions.", 403);
    }
  } else {
    const isMember = await isProfessionalOnTeam(owner_id, acting_professional_id);
    if (!isMember) {
      throw new IntakeError("You are not an active member of this team.", 403);
    }
  }

  const trimmed = prompt.trim();
  if (trimmed.length < 3) {
    throw new IntakeError("Prompt must be at least 3 characters.", 400);
  }
  if (trimmed.length > 240) {
    throw new IntakeError("Prompt must be 240 characters or fewer.", 400);
  }

  const normalisedOptions = normaliseOptions(options);
  if (kind === "select" && normalisedOptions.length < 2) {
    throw new IntakeError("Select-style questions need at least 2 options.", 400);
  }

  const admin = createAdminClient();

  if (id == null) {
    // Enforce the 1-5 cap on creation. Updates do not increase the count.
    const existing = await countQuestions({ ownerKind: owner_kind, ownerId: owner_id });
    if (existing >= MAX_QUESTIONS_PER_OWNER) {
      throw new IntakeError(
        `You can have at most ${MAX_QUESTIONS_PER_OWNER} intake questions.`,
        400,
      );
    }
    const insertRow = {
      owner_kind,
      professional_id: owner_kind === "professional" ? owner_id : null,
      team_id: owner_kind === "team" ? owner_id : null,
      prompt: trimmed,
      kind,
      options: normalisedOptions,
      required,
      sort_order,
      enabled,
    };
    const { data, error } = await admin
      .from("pro_intake_questions")
      .insert(insertRow)
      .select(
        "id, owner_kind, professional_id, team_id, prompt, kind, options, required, sort_order, enabled, created_at",
      )
      .single();
    if (error || !data) {
      log.error("insert intake question failed", {
        err: error?.message ?? "no row returned",
      });
      throw new IntakeError("Failed to save intake question.", 500);
    }
    return hydrate(data as RawQuestion);
  }

  // Update path — verify the row exists and is owned by the same owner.
  const existing = await getQuestionById(id);
  if (!existing) {
    throw new IntakeError("Intake question not found.", 404);
  }
  if (
    existing.owner_kind !== owner_kind ||
    (owner_kind === "professional" && existing.professional_id !== owner_id) ||
    (owner_kind === "team" && existing.team_id !== owner_id)
  ) {
    throw new IntakeError("You are not the owner of this question.", 403);
  }

  const updateRow = {
    prompt: trimmed,
    kind,
    options: normalisedOptions,
    required,
    sort_order,
    enabled,
  };
  const { data, error } = await admin
    .from("pro_intake_questions")
    .update(updateRow)
    .eq("id", id)
    .select(
      "id, owner_kind, professional_id, team_id, prompt, kind, options, required, sort_order, enabled, created_at",
    )
    .single();
  if (error || !data) {
    log.error("update intake question failed", {
      id,
      err: error?.message ?? "no row returned",
    });
    throw new IntakeError("Failed to update intake question.", 500);
  }
  return hydrate(data as RawQuestion);
}

export async function removeQuestion(
  id: number,
  actingProfessionalId: number,
): Promise<void> {
  const existing = await getQuestionById(id);
  if (!existing) {
    throw new IntakeError("Intake question not found.", 404);
  }
  const owned = await isOwner(existing, actingProfessionalId);
  if (!owned) {
    throw new IntakeError("You are not the owner of this question.", 403);
  }
  const admin = createAdminClient();
  const { error } = await admin.from("pro_intake_questions").delete().eq("id", id);
  if (error) {
    log.error("delete intake question failed", { id, err: error.message });
    throw new IntakeError("Failed to delete intake question.", 500);
  }
}

// ── Answer flow ─────────────────────────────────────────────────────────────

export interface SubmitAnswerInput {
  question_id: number;
  answer: string;
}

interface BriefRowForIntake {
  id: number;
  accepted_by_professional_id: number | null;
  accepted_by_team_id: number | null;
  contact_email: string | null;
}

async function loadBrief(briefId: number): Promise<BriefRowForIntake | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("advisor_auctions")
    .select("id, accepted_by_professional_id, accepted_by_team_id, contact_email")
    .eq("id", briefId)
    .maybeSingle();
  if (error) {
    log.warn("loadBrief failed", { briefId, err: error.message });
    return null;
  }
  return (data as BriefRowForIntake | null) ?? null;
}

/**
 * Resolve the active intake questions a brief's accepting provider has
 * configured. Returns an empty array if nobody has accepted yet or the
 * provider hasn't configured any prompts.
 */
export async function getQuestionsForBrief(briefId: number): Promise<IntakeQuestion[]> {
  const brief = await loadBrief(briefId);
  if (!brief) return [];
  if (brief.accepted_by_team_id != null) {
    return listForTeam(brief.accepted_by_team_id, { onlyEnabled: true });
  }
  if (brief.accepted_by_professional_id != null) {
    return listForProfessional(brief.accepted_by_professional_id, { onlyEnabled: true });
  }
  return [];
}

export async function submitAnswers({
  briefId,
  answers,
}: {
  briefId: number;
  answers: SubmitAnswerInput[];
}): Promise<IntakeAnswer[]> {
  if (answers.length === 0) {
    throw new IntakeError("No answers supplied.", 400);
  }
  if (answers.length > MAX_QUESTIONS_PER_OWNER) {
    throw new IntakeError(
      `Cannot submit more than ${MAX_QUESTIONS_PER_OWNER} answers at once.`,
      400,
    );
  }
  const brief = await loadBrief(briefId);
  if (!brief) {
    throw new IntakeError("Brief not found.", 404);
  }
  if (
    brief.accepted_by_professional_id == null &&
    brief.accepted_by_team_id == null
  ) {
    throw new IntakeError("Brief has not been accepted yet.", 400);
  }

  // Validate each answer maps to one of the brief's pro's enabled questions.
  const eligible = await getQuestionsForBrief(briefId);
  const eligibleIds = new Set(eligible.map((q) => q.id));
  const questionById = new Map(eligible.map((q) => [q.id, q] as const));

  const rows = answers.map(({ question_id, answer }) => {
    if (!eligibleIds.has(question_id)) {
      throw new IntakeError(
        `Question ${question_id} is not part of this brief's intake.`,
        400,
      );
    }
    const trimmed = answer.trim();
    const question = questionById.get(question_id);
    if (question?.required && trimmed.length === 0) {
      throw new IntakeError(`Question ${question_id} requires an answer.`, 400);
    }
    if (trimmed.length > 1000) {
      throw new IntakeError(`Answer for question ${question_id} is too long.`, 400);
    }
    return { brief_id: briefId, question_id, answer: trimmed };
  });

  // Required-question coverage check — make sure every required question has
  // a non-empty answer in the payload.
  for (const q of eligible) {
    if (!q.required) continue;
    const submitted = rows.find((r) => r.question_id === q.id);
    if (!submitted || submitted.answer.length === 0) {
      throw new IntakeError(`Question ${q.id} requires an answer.`, 400);
    }
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("pro_intake_answers")
    .upsert(rows, { onConflict: "brief_id,question_id" })
    .select("id, brief_id, question_id, answer, answered_at");
  if (error) {
    log.error("submitAnswers failed", { briefId, err: error.message });
    throw new IntakeError("Failed to save answers.", 500);
  }
  return (data ?? []) as IntakeAnswer[];
}

/**
 * Load answers for a brief, checking the requesting professional is the
 * accepting provider (direct match or active team member). Brief-owner reads
 * happen via the API route, which derives identity from the magic-link token
 * or signed-in Supabase user.
 */
export async function getAnswersForBrief(
  briefId: number,
  requestingProfessionalId: number,
): Promise<IntakeAnswer[]> {
  const brief = await loadBrief(briefId);
  if (!brief) {
    throw new IntakeError("Brief not found.", 404);
  }
  let allowed = false;
  if (brief.accepted_by_professional_id === requestingProfessionalId) {
    allowed = true;
  } else if (brief.accepted_by_team_id != null) {
    allowed = await isProfessionalOnTeam(brief.accepted_by_team_id, requestingProfessionalId);
  }
  if (!allowed) {
    throw new IntakeError("You are not the accepting provider for this brief.", 403);
  }
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("pro_intake_answers")
    .select("id, brief_id, question_id, answer, answered_at")
    .eq("brief_id", briefId)
    .order("question_id", { ascending: true });
  if (error) {
    log.warn("getAnswersForBrief failed", { briefId, err: error.message });
    return [];
  }
  return (data ?? []) as IntakeAnswer[];
}
