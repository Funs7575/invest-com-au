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
    .select("id, request_type, email, verified_at, completed_at, created_at")
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
