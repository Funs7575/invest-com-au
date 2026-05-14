/**
 * Pro Squad self-service creation helpers — pure logic + Supabase-backed
 * slug-dedup. Imported by `app/api/teams/new/route.ts`.
 *
 * Kept separate from `lib/expert-teams.ts` so the wizard path doesn't
 * couple to the admin-flow CRUD surface.
 */

// eslint-disable-next-line no-restricted-imports -- self-service squad creation writes across professionals/teams; service-role legitimate per CLAUDE.md.
import { createAdminClient } from "@/lib/supabase/admin";

/** Allowed member roles in the wizard. */
export const SQUAD_MEMBER_ROLES = ["lead", "specialist", "observer"] as const;
export type SquadMemberRole = (typeof SQUAD_MEMBER_ROLES)[number];

export function isValidSquadMemberRole(value: unknown): value is SquadMemberRole {
  return (
    typeof value === "string" &&
    (SQUAD_MEMBER_ROLES as readonly string[]).includes(value)
  );
}

/**
 * Kebab-case a free-text squad name into a URL-safe slug body.
 * - Lowercases.
 * - Strips anything outside a-z, 0-9, whitespace, dash.
 * - Collapses runs of whitespace + dashes to a single dash.
 * - Trims leading/trailing dashes.
 * - Caps at 64 chars so the `-N` dedup suffix fits inside the 80-char DB column.
 */
export function slugifySquadName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 64);
}

/**
 * Dedup a base slug against an `exists` predicate by appending `-2`, `-3`,
 * etc. until a free slot is found. Returns the chosen slug.
 *
 * The predicate is async + injectable so this is unit-testable without
 * Supabase: pass `(slug) => Promise.resolve(takenSet.has(slug))` from tests.
 *
 * Edge cases:
 *   - empty base → falls back to "squad".
 *   - 100+ collisions → throws; the wizard should surface a graceful 500.
 */
export async function dedupeSquadSlug(
  baseName: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const base = slugifySquadName(baseName) || "squad";
  if (!(await exists(base))) return base;
  for (let n = 2; n <= 100; n++) {
    const candidate = `${base}-${n}`;
    if (!(await exists(candidate))) return candidate;
  }
  throw new Error("slug_dedup_exhausted");
}

/** Production exists-predicate backed by Supabase. */
export async function expertTeamSlugTaken(slug: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("expert_teams")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  return Boolean(data);
}

/**
 * Categorise an invitee email by whether it matches an active professional.
 *
 * Returns:
 *   - `{ kind: "existing", professionalId }` if a row exists with status='active'.
 *   - `{ kind: "new" }` if no matching row.
 *
 * The injectable `lookup` parameter keeps this unit-testable; the
 * production binding is provided by `lookupProfessionalByEmail`.
 */
export type InviteeClassification =
  | { kind: "existing"; professionalId: number }
  | { kind: "new" };

export async function classifyInvitee(
  email: string,
  lookup: (email: string) => Promise<{ id: number } | null>,
): Promise<InviteeClassification> {
  const normalised = email.toLowerCase().trim();
  const row = await lookup(normalised);
  return row ? { kind: "existing", professionalId: row.id } : { kind: "new" };
}

/** Production lookup-by-email. */
export async function lookupProfessionalByEmail(
  email: string,
): Promise<{ id: number } | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("professionals")
    .select("id")
    .eq("email", email.toLowerCase().trim())
    .eq("status", "active")
    .maybeSingle();
  return (data as { id: number } | null) ?? null;
}
