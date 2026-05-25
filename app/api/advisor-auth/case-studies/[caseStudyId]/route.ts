import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
 
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isRateLimited } from "@/lib/rate-limit";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";

type RouteContext = { params: Promise<{ caseStudyId: string }> };

const PatchBody = z.object({
  title: z.string().min(5).max(150).optional(),
  situation: z.string().min(20).max(1000).optional(),
  approach: z.string().min(20).max(1000).optional(),
  outcome: z.string().min(20).max(500).optional(),
  client_type: z.enum(["individual", "couple", "family", "business", "smsf", "retiree"]).optional(),
  outcome_type: z.enum(["wealth_growth", "tax_saving", "debt_reduction", "retirement_planning", "insurance", "estate_planning", "business_succession", "other"]).optional(),
  status: z.enum(["draft", "published"]).optional(),
});

export const PATCH = withValidatedBody(PatchBody, async (request, body, context?: RouteContext) => {
  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (await isRateLimited(`advisor_case_studies_patch:${ip}:${advisorId}`, 30, 1)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const { caseStudyId } = await (context as RouteContext).params;
  const id = parseInt(caseStudyId, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid case study ID" }, { status: 400 });

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("advisor_case_studies")
    .select("id")
    .eq("id", id)
    .eq("professional_id", advisorId)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: "Case study not found" }, { status: 404 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.title !== undefined) updates.title = body.title;
  if (body.situation !== undefined) updates.situation = body.situation;
  if (body.approach !== undefined) updates.approach = body.approach;
  if (body.outcome !== undefined) updates.outcome = body.outcome;
  if (body.client_type !== undefined) updates.client_type = body.client_type;
  if (body.outcome_type !== undefined) updates.outcome_type = body.outcome_type;
  if (body.status !== undefined) updates.status = body.status;

  const { data, error } = await admin
    .from("advisor_case_studies")
    .update(updates)
    .eq("id", id)
    .select("id, title, situation, approach, outcome, client_type, outcome_type, status, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: "Failed to update case study" }, { status: 500 });

  return NextResponse.json({ caseStudy: data });
});

export async function DELETE(request: NextRequest, context: RouteContext) {
  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (await isRateLimited(`advisor_case_studies_patch:${ip}:${advisorId}`, 30, 1)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const { caseStudyId } = await context.params;
  const id = parseInt(caseStudyId, 10);
  if (isNaN(id)) return NextResponse.json({ error: "Invalid case study ID" }, { status: 400 });

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("advisor_case_studies")
    .select("id")
    .eq("id", id)
    .eq("professional_id", advisorId)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: "Case study not found" }, { status: 404 });

  const { error } = await admin
    .from("advisor_case_studies")
    .update({ status: "draft", updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: "Failed to delete case study" }, { status: 500 });

  return NextResponse.json({ success: true });
}
