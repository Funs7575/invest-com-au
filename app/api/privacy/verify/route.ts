/**
 * GET /api/privacy/verify?token=...
 *
 * Verification endpoint. Exchanges the one-time token emailed to the
 * requester for the actual export/delete action. For exports, streams
 * back a JSON bundle. For deletions, runs the erase across every
 * PII table and returns a per-table row count.
 *
 * Expires 24 hours after request creation. Single-use — marks
 * verified_at on success so the link can't be replayed.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import { exportUserData, eraseUserData } from "@/lib/privacy-data";

const log = logger("privacy-verify");

export const runtime = "nodejs";

const LINK_TTL_HOURS = 24;

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: req, error: fetchErr } = await admin
    .from("privacy_data_requests")
    .select("id, request_type, email, verified_at, completed_at, created_at, rows_affected")
    .eq("verification_token", token)
    .maybeSingle();

  if (fetchErr || !req) {
    return NextResponse.json({ error: "Invalid or expired link" }, { status: 404 });
  }
  if (req.completed_at) {
    return NextResponse.json({ error: "This request has already been completed" }, { status: 410 });
  }

  const age = Date.now() - new Date(req.created_at as string).getTime();
  if (age > LINK_TTL_HOURS * 3600 * 1000) {
    return NextResponse.json({ error: "Link expired — request a new one" }, { status: 410 });
  }

  // Mark verified so the token can't be replayed even if processing
  // takes a while
  await admin
    .from("privacy_data_requests")
    .update({ verified_at: new Date().toISOString() })
    .eq("id", req.id);

  try {
    if (req.request_type === "export") {
      const bundle = await exportUserData(admin, req.email as string);
      await admin
        .from("privacy_data_requests")
        .update({
          completed_at: new Date().toISOString(),
          rows_affected: Object.fromEntries(
            Object.entries(bundle).map(([k, v]) => [k, (v as unknown[]).length]),
          ),
        })
        .eq("id", req.id);

      log.info("Privacy export fulfilled", {
        email: req.email,
        tableCount: Object.keys(bundle).length,
      });

      // Return the JSON bundle directly as a downloadable file
      return new NextResponse(JSON.stringify({ email: req.email, data: bundle }, null, 2), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="invest-com-au-data-${(req.email as string).replace(/[^a-z0-9]/gi, "_")}.json"`,
        },
      });
    }

    if (req.request_type === "correct") {
      // Read the pending correction out of rows_affected, apply
      // to allow-listed tables, stamp completed_at. Only three
      // whitelisted fields are ever touched.
      const pending = (req.rows_affected as
        | { pending_correction?: { field: string; new_value: string } }
        | null
      )?.pending_correction;
      if (!pending || !pending.field) {
        return NextResponse.json(
          { error: "Malformed correction request — no pending correction found" },
          { status: 400 },
        );
      }
      const ALLOWED = new Set(["name", "phone", "preference_cadence"]);
      if (!ALLOWED.has(pending.field)) {
        return NextResponse.json({ error: "Field not allowed" }, { status: 400 });
      }

      const affected: Record<string, number> = {};
      if (pending.field === "name") {
        const { count } = await admin
          .from("email_captures")
          .update({ name: pending.new_value }, { count: "exact" })
          .eq("email", req.email as string);
        affected.email_captures = count || 0;
        const { count: ncount } = await admin
          .from("newsletter_subscribers")
          .update({ name: pending.new_value }, { count: "exact" })
          .eq("email", req.email as string);
        affected.newsletter_subscribers = ncount || 0;
      } else if (pending.field === "preference_cadence") {
        const validPref = ["weekly", "monthly", "quarterly"].includes(
          pending.new_value,
        )
          ? pending.new_value
          : null;
        if (!validPref) {
          return NextResponse.json(
            { error: "Invalid cadence — must be weekly | monthly | quarterly" },
            { status: 400 },
          );
        }
        const { count } = await admin
          .from("newsletter_subscribers")
          .update({ preference: validPref }, { count: "exact" })
          .eq("email", req.email as string);
        affected.newsletter_subscribers = count || 0;
      } else if (pending.field === "phone") {
        const { count } = await admin
          .from("professional_leads")
          .update({ user_phone: pending.new_value }, { count: "exact" })
          .eq("user_email", req.email as string);
        affected.professional_leads = count || 0;
      }

      await admin
        .from("privacy_data_requests")
        .update({
          completed_at: new Date().toISOString(),
          rows_affected: { correction_applied: pending, affected },
        })
        .eq("id", req.id);

      log.info("Privacy correction fulfilled", {
        email: req.email,
        field: pending.field,
        affected,
      });

      return NextResponse.json({
        ok: true,
        message: "Your data has been updated.",
        field: pending.field,
        affected,
      });
    }

    // Delete path
    const affected = await eraseUserData(admin, req.email as string);
    await admin
      .from("privacy_data_requests")
      .update({
        completed_at: new Date().toISOString(),
        rows_affected: affected,
      })
      .eq("id", req.id);

    log.warn("Privacy erasure fulfilled", {
      email: req.email,
      affected,
    });

    return NextResponse.json({
      ok: true,
      message: "Your personal data has been erased from our systems.",
      affected,
    });
  } catch (err) {
    log.error("Privacy verify handler threw", {
      err: err instanceof Error ? err.message : String(err),
    });
    return NextResponse.json({ error: "Processing failed" }, { status: 500 });
  }
}
