/**
 * course-certificates.ts
 *
 * Handles course completion certificate issuance and CPD credit recording.
 * Uses createAdminClient() because:
 * - course_certificates INSERT policy is service_role-only
 * - cpd_credits INSERT policy is service_role-only
 * - We need to cross-reference professionals by user_id (no auth.uid() available
 *   in all call sites — e.g. progress route uses admin client throughout)
 */

// eslint-disable-next-line no-restricted-imports -- service_role-only INSERT policies on course_certificates + cpd_credits; cross-user professional lookup without auth.uid() context (see module JSDoc)
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

const log = logger("course-certificates");

// ── Types ─────────────────────────────────────────────────────────────────────

export interface CertificateRecord {
  id: string;
  user_id: string | null;
  professional_id: number | null;
  course_id: string;
  purchase_id: number | null;
  certificate_number: string;
  issued_at: string;
  cpd_hours: number | null;
  cpd_category: string | null;
  completion_score: number | null;
  created_at: string;
}

// ── CPD year helper ───────────────────────────────────────────────────────────

/**
 * Returns the ASIC CPD year for a given date.
 * ASIC CPD year runs July 1 to June 30.
 * cpd_year is the *ending* calendar year: e.g. Jul 2025–Jun 2026 → 2026.
 */
export function cpdYearFor(date: Date): number {
  const month = date.getUTCMonth(); // 0-indexed; 6 = July
  const year = date.getUTCFullYear();
  // July (6) onwards = new CPD year ending next calendar year
  return month >= 6 ? year + 1 : year;
}

// ── Certificate number generator ──────────────────────────────────────────────

/**
 * Generates the next certificate number in the format INV-YYYY-NNNNN.
 * Derives the sequence from the total count of certificates issued in this
 * calendar year. Not gap-free but collision-safe via UNIQUE constraint.
 */
async function nextCertificateNumber(): Promise<string> {
  const admin = createAdminClient();
  const year = new Date().getUTCFullYear();

  const { count } = await admin
    .from("course_certificates")
    .select("id", { count: "exact", head: true })
    .gte("issued_at", `${year}-01-01T00:00:00Z`)
    .lt("issued_at", `${year + 1}-01-01T00:00:00Z`);

  const seq = ((count ?? 0) + 1).toString().padStart(5, "0");
  return `INV-${year}-${seq}`;
}

// ── issueCertificate ──────────────────────────────────────────────────────────

/**
 * Issues a completion certificate for a user/course, and records CPD credits
 * if the course is CPD-eligible and the user is a licensed advisor.
 *
 * Idempotent: if a certificate already exists for this user+course, the
 * existing record is returned unchanged.
 *
 * @param userId     Supabase auth user ID
 * @param courseSlug The course slug (courses.slug)
 * @param purchaseId Numeric purchase ID (course_purchases.id), or null
 * @returns The certificate record, or null on failure/incomplete course
 */
export async function issueCertificate(
  userId: string,
  courseSlug: string,
  purchaseId: number | null = null,
): Promise<CertificateRecord | null> {
  const admin = createAdminClient();

  // ── 1. Fetch the course ──────────────────────────────────────────────────
  const { data: course } = await admin
    .from("courses")
    .select("id, title, slug, is_cpd_eligible, cpd_hours, cpd_category")
    .eq("slug", courseSlug)
    .maybeSingle();

  if (!course) {
    log.error("issueCertificate: course not found", { courseSlug });
    return null;
  }

  // ── 2. Check all lessons are complete ────────────────────────────────────
  const { data: lessons } = await admin
    .from("course_lessons")
    .select("id")
    .eq("course_slug", courseSlug);

  if (!lessons || lessons.length === 0) {
    log.error("issueCertificate: no lessons found for course", { courseSlug });
    return null;
  }

  const allLessonIds = (lessons as { id: number }[]).map((l) => l.id);

  const { data: completed } = await admin
    .from("course_progress")
    .select("lesson_id")
    .eq("user_id", userId)
    .in("lesson_id", allLessonIds);

  const completedIds = new Set(
    (completed ?? []).map((p: { lesson_id: number }) => p.lesson_id),
  );
  const allComplete = allLessonIds.every((id) => completedIds.has(id));

  if (!allComplete) {
    log.info("issueCertificate: not all lessons complete — skipping", {
      userId,
      courseSlug,
      completed: completedIds.size,
      total: allLessonIds.length,
    });
    return null;
  }

  // ── 3. Idempotency check — certificate already exists? ───────────────────
  const { data: existing } = await admin
    .from("course_certificates")
    .select("*")
    .eq("user_id", userId)
    .eq("course_id", course.id)
    .maybeSingle();

  if (existing) {
    log.info("issueCertificate: certificate already exists", {
      certificateNumber: (existing as CertificateRecord).certificate_number,
    });
    return existing as CertificateRecord;
  }

  // ── 4. Look up if user is a licensed advisor ─────────────────────────────
  const { data: professional } = await admin
    .from("professionals")
    .select("id")
    .eq("auth_user_id", userId)
    .in("status", ["active", "pending"])
    .maybeSingle();

  const professionalId = (professional as { id: number } | null)?.id ?? null;

  // ── 5. Generate certificate number and insert ────────────────────────────
  const certificateNumber = await nextCertificateNumber();
  const now = new Date();

  const { data: cert, error: certError } = await admin
    .from("course_certificates")
    .insert({
      user_id: userId,
      professional_id: professionalId,
      course_id: course.id,
      purchase_id: purchaseId,
      certificate_number: certificateNumber,
      issued_at: now.toISOString(),
      cpd_hours: course.is_cpd_eligible ? (course.cpd_hours ?? null) : null,
      cpd_category: course.is_cpd_eligible ? (course.cpd_category ?? null) : null,
      completion_score: null,
    })
    .select("*")
    .single();

  if (certError) {
    // Unique-constraint violation: another concurrent request inserted first
    if (certError.code === "23505") {
      const { data: raceCert } = await admin
        .from("course_certificates")
        .select("*")
        .eq("user_id", userId)
        .eq("course_id", course.id)
        .maybeSingle();
      return (raceCert as CertificateRecord | null) ?? null;
    }
    log.error("issueCertificate: certificate insert failed", {
      error: certError.message,
      userId,
      courseSlug,
    });
    return null;
  }

  log.info("issueCertificate: certificate issued", {
    certificateNumber,
    userId,
    courseSlug,
    professionalId,
  });

  // ── 6. If advisor and CPD-eligible, record CPD credits ───────────────────
  if (professionalId && course.is_cpd_eligible && course.cpd_hours) {
    const cpd_year = cpdYearFor(now);

    const { error: cpdError } = await admin
      .from("cpd_credits")
      .upsert(
        {
          professional_id: professionalId,
          course_id: course.id,
          purchase_id: purchaseId,
          certificate_id: (cert as CertificateRecord).id,
          hours_earned: course.cpd_hours,
          cpd_category: course.cpd_category ?? "technical",
          completed_at: now.toISOString(),
          certificate_issued_at: now.toISOString(),
          cpd_year,
        },
        { onConflict: "professional_id,course_id" },
      );

    if (cpdError) {
      log.error("issueCertificate: cpd_credits upsert failed", {
        error: cpdError.message,
        professionalId,
        courseSlug,
      });
      // Non-fatal: certificate was issued; CPD credit failure is logged only
    } else {
      log.info("issueCertificate: CPD credit recorded", {
        professionalId,
        courseSlug,
        hours: course.cpd_hours,
        cpd_year,
      });
    }
  }

  return cert as CertificateRecord;
}

// ── getCpdSummary ─────────────────────────────────────────────────────────────

export interface CpdCategoryBreakdown {
  technical: number;
  conduct: number;
  client_care: number;
  regulatory: number;
}

export interface CpdCourse {
  course_id: string;
  course_title: string;
  hours_earned: number;
  cpd_category: string;
  completed_at: string;
  certificate_number: string | null;
}

export interface CpdSummary {
  earned: number;
  target: number;
  remaining: number;
  year: string; // e.g. "2025-26"
  cpd_year: number;
  breakdown: CpdCategoryBreakdown;
  courses: CpdCourse[];
}

/**
 * Returns CPD summary for an advisor, scoped to the current CPD year.
 */
export async function getCpdSummary(professionalId: number): Promise<CpdSummary> {
  const admin = createAdminClient();
  const now = new Date();
  const cpd_year = cpdYearFor(now);

  const { data: credits } = await admin
    .from("cpd_credits")
    .select(
      "hours_earned, cpd_category, completed_at, course_id, courses(title), course_certificates(certificate_number)",
    )
    .eq("professional_id", professionalId)
    .eq("cpd_year", cpd_year);

  const breakdown: CpdCategoryBreakdown = {
    technical: 0,
    conduct: 0,
    client_care: 0,
    regulatory: 0,
  };

  const courses: CpdCourse[] = [];
  let earned = 0;

  for (const c of credits ?? []) {
    const hours = Number(c.hours_earned);
    earned += hours;

    const cat = c.cpd_category as keyof CpdCategoryBreakdown;
    if (cat in breakdown) {
      breakdown[cat] += hours;
    }

    courses.push({
      course_id: c.course_id as string,
      course_title: (c.courses as unknown as { title: string } | null)?.title ?? "Unknown course",
      hours_earned: hours,
      cpd_category: c.cpd_category as string,
      completed_at: c.completed_at as string,
      certificate_number:
        (c.course_certificates as unknown as { certificate_number: string } | null)?.certificate_number ??
        null,
    });
  }

  const target = 40;
  const yearLabel = `${cpd_year - 1}-${String(cpd_year).slice(-2)}`;

  return {
    earned: Math.round(earned * 100) / 100,
    target,
    remaining: Math.max(0, Math.round((target - earned) * 100) / 100),
    year: yearLabel,
    cpd_year,
    breakdown,
    courses,
  };
}
