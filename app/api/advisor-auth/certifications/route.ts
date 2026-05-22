import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger("advisor-auth:certifications");

const CertSchema = z.object({
  name: z.string().min(2).max(150),
  issuer: z.string().min(2).max(150),
  credential_id: z.string().max(100).optional().nullable(),
  issued_at: z.string().optional().nullable(),
  expires_at: z.string().optional().nullable(),
  cert_url: z.string().url().optional().nullable(),
});

const DeleteCertSchema = z.object({
  certId: z.coerce.number().int().positive(),
});

/**
 * POST /api/advisor-auth/certifications
 * Add a certification for the authenticated advisor.
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (await isRateLimited(`advisor_certs_post:${ip}`, 30, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = CertSchema.safeParse(raw);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const path = firstIssue?.path?.join(".") ?? "";
    const message = firstIssue?.message ?? "Invalid request body";
    const error = path ? `${path}: ${message}` : message;
    return NextResponse.json({ error }, { status: 400 });
  }

  const { name, issuer, credential_id, issued_at, expires_at, cert_url } = parsed.data;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("advisor_certifications")
    .insert({
      professional_id: advisorId,
      name,
      issuer,
      credential_id: credential_id ?? null,
      issued_at: issued_at ?? null,
      expires_at: expires_at ?? null,
      cert_url: cert_url ?? null,
    })
    .select()
    .single();

  if (error) {
    log.error("advisor_certifications insert failed", { advisorId, error });
    return NextResponse.json({ error: "Failed to add certification" }, { status: 500 });
  }

  return NextResponse.json({ certification: data }, { status: 201 });
}

/**
 * DELETE /api/advisor-auth/certifications
 * Soft-delete (is_active=false) a certification. Verifies ownership.
 */
export async function DELETE(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (await isRateLimited(`advisor_certs_delete:${ip}`, 30, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Support certId from URL params or body
  const url = new URL(request.url);
  const paramId = url.searchParams.get("certId");

  let certId: number;
  if (paramId !== null) {
    const parsed = DeleteCertSchema.safeParse({ certId: paramId });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid certId" }, { status: 400 });
    }
    certId = parsed.data.certId;
  } else {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = DeleteCertSchema.safeParse(raw);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const path = firstIssue?.path?.join(".") ?? "";
      const message = firstIssue?.message ?? "Invalid request body";
      const error = path ? `${path}: ${message}` : message;
      return NextResponse.json({ error }, { status: 400 });
    }
    certId = parsed.data.certId;
  }

  const admin = createAdminClient();

  // Verify ownership before soft-deleting
  const { data: cert } = await admin
    .from("advisor_certifications")
    .select("professional_id")
    .eq("id", certId)
    .single();

  if (!cert || cert.professional_id !== advisorId) {
    return NextResponse.json({ error: "Certification not found" }, { status: 404 });
  }

  const { error } = await admin
    .from("advisor_certifications")
    .update({ is_active: false })
    .eq("id", certId);

  if (error) {
    log.error("advisor_certifications soft-delete failed", { advisorId, certId, error });
    return NextResponse.json({ error: "Failed to delete certification" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
