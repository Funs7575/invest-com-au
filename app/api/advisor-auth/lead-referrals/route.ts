import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isRateLimited } from "@/lib/rate-limit";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import {
  createLeadReferral,
  listReferralsForAdvisor,
  respondToLeadReferral,
} from "@/lib/advisor-lead-referrals";

function failureStatus(reason: "unavailable" | "not_found" | "forbidden" | "invalid" | "error"): number {
  switch (reason) {
    case "unavailable":
      return 503;
    case "not_found":
      return 404;
    case "forbidden":
      return 403;
    case "invalid":
      return 400;
    default:
      return 500;
  }
}

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (await isRateLimited(`lead_referrals_get:${ip}`, 30, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const professionalId = await requireAdvisorSession(request);
  if (!professionalId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const referrals = await listReferralsForAdvisor(professionalId);
  return NextResponse.json({ referrals });
}

const CreateSchema = z.object({
  toEmail: z.string().email().max(200),
  clientName: z.string().min(1).max(120),
  clientEmail: z.string().email().max(200),
  clientPhone: z.string().max(30).optional().nullable(),
  note: z.string().max(500).optional().nullable(),
  sourceLeadId: z.coerce.number().int().positive().optional().nullable(),
});

export const POST = withValidatedBody(CreateSchema, async (request, body) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (await isRateLimited(`lead_referrals_create:${ip}`, 10, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const professionalId = await requireAdvisorSession(request);
  if (!professionalId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const result = await createLeadReferral({
    fromProfessionalId: professionalId,
    toProfessionalEmail: body.toEmail,
    clientName: body.clientName,
    clientEmail: body.clientEmail,
    clientPhone: body.clientPhone ?? null,
    note: body.note ?? null,
    sourceLeadId: body.sourceLeadId ?? null,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: failureStatus(result.reason) });
  }
  return NextResponse.json({ referral: result.referral }, { status: 201 });
});

const RespondSchema = z.object({
  referralId: z.coerce.number().int().positive(),
  accept: z.boolean(),
});

export const PATCH = withValidatedBody(RespondSchema, async (request, body) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (await isRateLimited(`lead_referrals_respond:${ip}`, 20, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const professionalId = await requireAdvisorSession(request);
  if (!professionalId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const result = await respondToLeadReferral({
    referralId: body.referralId,
    professionalId,
    accept: body.accept,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: failureStatus(result.reason) });
  }
  return NextResponse.json({ success: true, createdLeadId: result.createdLeadId });
});
