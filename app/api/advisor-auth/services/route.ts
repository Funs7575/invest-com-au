import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

const log = logger("advisor-auth:services");

const ServiceSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional().nullable(),
  price_type: z
    .enum(["fixed", "hourly", "on_application", "contact"])
    .optional()
    .default("contact"),
  price_from_cents: z.number().int().min(0).optional().nullable(),
  price_to_cents: z.number().int().min(0).optional().nullable(),
});

const DeleteServiceSchema = z.object({
  serviceId: z.coerce.number().int().positive(),
});

/**
 * POST /api/advisor-auth/services
 * Create a new service for the authenticated advisor.
 */
export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (await isRateLimited(`advisor_services_post:${ip}`, 30, 60)) {
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

  const parsed = ServiceSchema.safeParse(raw);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0];
    const path = firstIssue?.path?.join(".") ?? "";
    const message = firstIssue?.message ?? "Invalid request body";
    const error = path ? `${path}: ${message}` : message;
    return NextResponse.json({ error }, { status: 400 });
  }

  const { name, description, price_type, price_from_cents, price_to_cents } = parsed.data;

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("advisor_services")
    .insert({
      professional_id: advisorId,
      name,
      description: description ?? null,
      price_type,
      price_from_cents: price_from_cents ?? null,
      price_to_cents: price_to_cents ?? null,
    })
    .select()
    .single();

  if (error) {
    log.error("advisor_services insert failed", { advisorId, error });
    return NextResponse.json({ error: "Failed to create service" }, { status: 500 });
  }

  return NextResponse.json({ service: data }, { status: 201 });
}

/**
 * DELETE /api/advisor-auth/services
 * Soft-delete (is_active=false) a service. Verifies ownership.
 */
export async function DELETE(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (await isRateLimited(`advisor_services_delete:${ip}`, 30, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Support serviceId from URL params or body
  const url = new URL(request.url);
  const paramId = url.searchParams.get("serviceId");

  let serviceId: number;
  if (paramId !== null) {
    const parsed = DeleteServiceSchema.safeParse({ serviceId: paramId });
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid serviceId" }, { status: 400 });
    }
    serviceId = parsed.data.serviceId;
  } else {
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = DeleteServiceSchema.safeParse(raw);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      const path = firstIssue?.path?.join(".") ?? "";
      const message = firstIssue?.message ?? "Invalid request body";
      const error = path ? `${path}: ${message}` : message;
      return NextResponse.json({ error }, { status: 400 });
    }
    serviceId = parsed.data.serviceId;
  }

  const admin = createAdminClient();

  // Verify ownership before soft-deleting
  const { data: service } = await admin
    .from("advisor_services")
    .select("professional_id")
    .eq("id", serviceId)
    .single();

  if (!service || service.professional_id !== advisorId) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const { error } = await admin
    .from("advisor_services")
    .update({ is_active: false })
    .eq("id", serviceId);

  if (error) {
    log.error("advisor_services soft-delete failed", { advisorId, serviceId, error });
    return NextResponse.json({ error: "Failed to delete service" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
