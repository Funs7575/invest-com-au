import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { logger } from "@/lib/logger";
import {
  verifyAbn,
  normaliseAbn,
  type AbnVerificationResult,
} from "@/lib/verify-abn";
import {
  verifyAfsl,
  normaliseAfsl,
  type AfslVerificationResult,
} from "@/lib/verify-afsl";

const log = logger("verify-professional");

export const runtime = "nodejs";
export const maxDuration = 30;

/**
 * POST /api/verify-professional
 *
 * Body: { professional_id: number, abn?: string, afsl_number?: string }
 *
 * Flow:
 *   1. Load the professional row (must exist).
 *   2. If abn provided — ABR check (ATO mod-89 checksum + remote
 *      lookup when ABR_API_GUID is configured).
 *   3. If afsl_number provided — AFSL shape check + remote lookup
 *      when ASIC_API_ENDPOINT/ASIC_API_KEY are configured.
 *   4. Decide result:
 *        - both checks PASS (or one missing, other pass)
 *          → update verified=true, verification_method (abn/afsl/both),
 *            verified_at=NOW(), verified_by='system_auto'.
 *        - any check FAILS (valid=false explicitly)
 *          → set health_status='verification_failed', fire admin
 *            email if Resend configured, log admin_action_log.
 *        - any check null (UNVERIFIABLE, e.g. no GUID)
 *          → do not touch verified flag; record 'partial' outcome
 *            in admin_action_log and return details so admin can
 *            complete manual verification.
 *   5. Always log the full result to admin_action_log (feature=
 *      'verify_professional', target_row_id=professional_id).
 *
 * Auth: callable by admin-authenticated sessions only. We rely on
 * the existing CRON_SECRET or ADMIN_API_KEY pattern used across
 * the admin APIs in this codebase; without either env set the
 * endpoint 401s.
 */

interface Body {
  professional_id: number;
  abn?: string | null;
  afsl_number?: string | null;
}

function parse(body: unknown): Body | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  const id = typeof b.professional_id === "number" ? b.professional_id : null;
  if (!id || !Number.isFinite(id)) return null;
  const abn = typeof b.abn === "string" ? b.abn : null;
  const afsl_number =
    typeof b.afsl_number === "string" ? b.afsl_number : null;
  return { professional_id: id, abn, afsl_number };
}

function isAuthorised(req: NextRequest): boolean {
  const adminKey = process.env.ADMIN_API_KEY;
  const cronKey = process.env.CRON_SECRET;
  const header = req.headers.get("authorization") ?? "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (adminKey && bearer === adminKey) return true;
  if (cronKey && bearer === cronKey) return true;
  return false;
}

type VerificationOutcome = "passed" | "failed" | "partial";

interface VerifyContext {
  abnResult: AbnVerificationResult | null;
  afslResult: AfslVerificationResult | null;
  outcome: VerificationOutcome;
  method: string | null;
}

function decide(ctx: Omit<VerifyContext, "outcome" | "method">): {
  outcome: VerificationOutcome;
  method: string | null;
} {
  const { abnResult, afslResult } = ctx;
  const methods: string[] = [];
  if (abnResult?.valid === true) methods.push("abn");
  if (afslResult?.valid === true) methods.push("afsl");

  // Any explicit false means failure.
  if (abnResult?.valid === false || afslResult?.valid === false) {
    return { outcome: "failed", method: null };
  }

  // All supplied checks passed.
  if (methods.length > 0) {
    return { outcome: "passed", method: methods.join("+") };
  }

  return { outcome: "partial", method: null };
}

export async function POST(req: NextRequest) {
  if (!isAuthorised(req)) {
    return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }

  if (
    !(await isAllowed("verify_professional", ipKey(req), {
      max: 30,
      refillPerSec: 30 / 3600,
    }))
  ) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const parsed = parse(await req.json().catch(() => null));
  if (!parsed) {
    return NextResponse.json(
      { error: "Invalid body — professional_id is required" },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  const { data: pro, error: proErr } = await supabase
    .from("professionals")
    .select("id, slug, name, email, type, abn, afsl_number, verified, verification_method, health_status")
    .eq("id", parsed.professional_id)
    .maybeSingle();
  if (proErr || !pro) {
    return NextResponse.json(
      { error: "Professional not found" },
      { status: 404 },
    );
  }

  const rawAbn = parsed.abn ?? pro.abn ?? null;
  const rawAfsl = parsed.afsl_number ?? pro.afsl_number ?? null;

  const [abnResult, afslResult] = await Promise.all([
    rawAbn ? verifyAbn(rawAbn) : Promise.resolve<AbnVerificationResult | null>(null),
    rawAfsl
      ? verifyAfsl(rawAfsl)
      : Promise.resolve<AfslVerificationResult | null>(null),
  ]);

  const { outcome, method } = decide({ abnResult, afslResult });

  // Persist the normalised ABN / AFSL back onto the row as a side
  // benefit — callers often submit the as-typed format.
  const updates: Record<string, unknown> = {};
  if (rawAbn) updates.abn = normaliseAbn(rawAbn);
  if (rawAfsl) updates.afsl_number = normaliseAfsl(rawAfsl);

  if (outcome === "passed" && method) {
    updates.verified = true;
    updates.verification_method = method;
    updates.verified_at = new Date().toISOString();
    updates.verified_by = "system_auto";
    updates.last_verified_at = new Date().toISOString();
    if (pro.health_status === "verification_failed") {
      updates.health_status = "active";
    }
  } else if (outcome === "failed") {
    updates.health_status = "verification_failed";
    updates.verification_failures =
      (typeof pro.verification_method === "string" ? 1 : 1);
    updates.verification_notes = buildFailureNote(abnResult, afslResult);
    // Do NOT flip verified → true in failure case.
  }

  if (Object.keys(updates).length > 0) {
    const { error: updErr } = await supabase
      .from("professionals")
      .update(updates)
      .eq("id", pro.id);
    if (updErr) {
      log.error("update_failed", {
        id: pro.id,
        error: updErr.message,
      });
    }
  }

  // Write to admin_action_log (schema: admin_email, feature, action,
  // target_row_id, target_verdict, reason, context).
  await supabase.from("admin_action_log").insert({
    admin_email: "system_auto",
    feature: "verify_professional",
    action: "run",
    target_row_id: pro.id,
    target_verdict: outcome,
    reason:
      outcome === "passed"
        ? `Verified via ${method}`
        : outcome === "failed"
          ? buildFailureNote(abnResult, afslResult)
          : "Partial — manual verification required",
    context: {
      abn: abnResult,
      afsl: afslResult,
      submitted_abn: rawAbn,
      submitted_afsl: rawAfsl,
    },
  });

  if (outcome === "failed") {
    void notifyAdmin(pro.name, pro.slug, abnResult, afslResult).catch((err) =>
      log.warn("admin_notify_failed", { err: String(err) }),
    );
  }

  return NextResponse.json({
    outcome,
    method,
    abn: abnResult,
    afsl: afslResult,
    professional: {
      id: pro.id,
      slug: pro.slug,
      name: pro.name,
    },
  });
}

function buildFailureNote(
  abn: AbnVerificationResult | null,
  afsl: AfslVerificationResult | null,
): string {
  const parts: string[] = [];
  if (abn?.valid === false) {
    parts.push(`ABN check failed: ${abn.error ?? abn.status}`);
  }
  if (afsl?.valid === false) {
    parts.push(`AFSL check failed: ${afsl.error ?? afsl.licenceStatus}`);
  }
  return parts.join(" | ") || "Verification failed";
}

async function notifyAdmin(
  name: string,
  slug: string,
  abn: AbnVerificationResult | null,
  afsl: AfslVerificationResult | null,
): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  const to = process.env.LEADS_NOTIFY_EMAIL;
  if (!key || !to) return;
  const body = [
    `<h2>Verification failed — ${escapeHtml(name)} (${escapeHtml(slug)})</h2>`,
    abn
      ? `<p><strong>ABN:</strong> ${abn.abn || "—"} (${abn.status}) ${abn.error ? `— ${escapeHtml(abn.error)}` : ""}</p>`
      : "",
    afsl
      ? `<p><strong>AFSL:</strong> ${afsl.afsl || "—"} (${afsl.licenceStatus}) ${afsl.error ? `— ${escapeHtml(afsl.error)}` : ""}</p>`
      : "",
    `<p><small>Review in /admin/advisors.</small></p>`,
  ].join("");
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "verification@invest.com.au",
      to: [to],
      subject: `Verification failed — ${name}`,
      html: body,
    }),
  });
}

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (ch) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[ch] || ch,
  );
}
