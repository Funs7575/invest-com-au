import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isRateLimited } from "@/lib/rate-limit";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";

const CreateCaseStudyBody = z.object({
  title: z.string().min(5).max(150),
  situation: z.string().min(20).max(1000),
  approach: z.string().min(20).max(1000),
  outcome: z.string().min(20).max(500),
  client_type: z.enum(["individual", "couple", "family", "business", "smsf", "retiree"]).default("individual"),
  outcome_type: z.enum(["wealth_growth", "tax_saving", "debt_reduction", "retirement_planning", "insurance", "estate_planning", "business_succession", "other"]).default("wealth_growth"),
  status: z.enum(["draft", "published"]).default("published"),
});

export async function GET(request: NextRequest) {
  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (await isRateLimited(`advisor_case_studies_get:${ip}:${advisorId}`, 30, 1)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("advisor_case_studies")
    .select("id, title, situation, approach, outcome, client_type, outcome_type, status, created_at, updated_at")
    .eq("professional_id", advisorId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: "Failed to fetch case studies" }, { status: 500 });

  return NextResponse.json({ caseStudies: data ?? [] });
}

export const POST = withValidatedBody(CreateCaseStudyBody, async (request, body) => {
  const advisorId = await requireAdvisorSession(request);
  if (!advisorId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (await isRateLimited(`advisor_case_studies_create:${ip}:${advisorId}`, 5, 1)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("advisor_case_studies")
    .insert({
      professional_id: advisorId,
      title: body.title,
      situation: body.situation,
      approach: body.approach,
      outcome: body.outcome,
      client_type: body.client_type,
      outcome_type: body.outcome_type,
      status: body.status,
    })
    .select("id, title, situation, approach, outcome, client_type, outcome_type, status, created_at, updated_at")
    .single();

  if (error) return NextResponse.json({ error: "Failed to create case study" }, { status: 500 });

  return NextResponse.json({ caseStudy: data }, { status: 201 });
});
