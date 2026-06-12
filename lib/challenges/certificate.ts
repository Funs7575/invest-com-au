/**
 * Challenge completion certificates.
 *
 * The existing `course_certificates` table is COURSE-BOUND (`course_id` is NOT
 * NULL with a UNIQUE(user_id, course_id) constraint and FKs to `courses`), so a
 * challenge — which has no `courses` row — cannot mint into it without faking a
 * course. Per the build brief, challenge certificates are therefore stored
 * INLINE on `challenge_enrolments` (`certificate_id` + `certificate_issued_at`)
 * and rendered by a challenge-specific certificate page.
 *
 * The certificate id mirrors the visual style of course certs
 * (`INV-YYYY-NNNNN`) but uses a distinct, unguessable form so the two never
 * collide and the id can't be enumerated:  `CC-YYYY-<10 hex>`.
 */

// eslint-disable-next-line no-restricted-imports -- trusted server-side certificate mint invoked from both the mark-complete route and the daily-nudge cron; the enrolment UPDATE is scoped by primary key + guarded by IS NULL. Documented exception in CLAUDE.md § "Two Supabase clients".
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { isComplete, getCurriculum } from "./progress";
import type { EnrolmentRow } from "./data";

const log = logger("challenges:certificate");

/** Build an unguessable challenge-certificate id: `CC-2026-1a2b3c4d5e`. */
export function generateCertificateId(now: Date = new Date()): string {
  const year = now.getUTCFullYear();
  // 5 bytes → 10 hex chars of entropy; crypto-strong, non-enumerable.
  const bytes = new Uint8Array(5);
  globalThis.crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `CC-${year}-${hex}`;
}

export interface MintResult {
  certificateId: string;
  alreadyIssued: boolean;
}

/**
 * Issue a completion certificate for an enrolment IF every task is complete.
 *
 * - Idempotent: if the enrolment already carries a `certificate_id`, that id is
 *   returned with `alreadyIssued: true` and no write happens.
 * - Returns null if the program is not 100% complete, or on any failure
 *   (fail-soft — never throws to the caller).
 * - Also stamps `completed_at` when first completing.
 *
 * Service-role admin client: the daily-nudge cron and the mark-complete route
 * both mint, and the enrolment update is a trusted server action. The write is
 * scoped by the enrolment's primary key.
 */
export async function maybeIssueCertificate(
  enrolment: Pick<
    EnrolmentRow,
    "id" | "certificate_id" | "completed_at"
  >,
  curriculumKey: string,
  completedKeys: Iterable<string>,
  now: Date = new Date(),
): Promise<MintResult | null> {
  if (enrolment.certificate_id) {
    return { certificateId: enrolment.certificate_id, alreadyIssued: true };
  }

  const curriculum = getCurriculum(curriculumKey);
  if (!curriculum) return null;
  if (!isComplete(curriculum, completedKeys)) return null;

  const certificateId = generateCertificateId(now);
  const nowIso = now.toISOString();

  try {
    const admin = createAdminClient();
    // Only stamp if not already certified (defends against a concurrent mint);
    // the UNIQUE(certificate_id) constraint is the hard backstop.
    const { data, error } = await admin
      .from("challenge_enrolments")
      .update({
        certificate_id: certificateId,
        certificate_issued_at: nowIso,
        completed_at: enrolment.completed_at ?? nowIso,
      })
      .eq("id", enrolment.id)
      .is("certificate_id", null)
      .select("certificate_id")
      .maybeSingle();

    if (error) {
      log.warn("maybeIssueCertificate update failed", {
        enrolmentId: enrolment.id,
        error: error.message,
      });
      return null;
    }

    if (!data) {
      // Lost the race — re-read the now-present id.
      const { data: existing } = await admin
        .from("challenge_enrolments")
        .select("certificate_id")
        .eq("id", enrolment.id)
        .maybeSingle();
      const existingId = (existing as { certificate_id: string | null } | null)
        ?.certificate_id;
      return existingId
        ? { certificateId: existingId, alreadyIssued: true }
        : null;
    }

    log.info("challenge certificate issued", {
      enrolmentId: enrolment.id,
      certificateId,
    });
    return { certificateId, alreadyIssued: false };
  } catch (err) {
    log.warn("maybeIssueCertificate threw", {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

export interface CertificateView {
  certificateId: string;
  issuedAt: string;
  challengeTitle: string;
  curriculumTitle: string;
  holderName: string;
}
