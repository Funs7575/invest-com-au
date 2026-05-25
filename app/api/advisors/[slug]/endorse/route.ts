import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";

const log = logger("advisors:endorse");

const EndorseBody = z.object({
  skill: z.string().min(2).max(50),
});

async function resolveAdvisorId(
  supabase: Awaited<ReturnType<typeof createClient>>,
  slug: string,
): Promise<number | null> {
  const { data } = await supabase
    .from("professionals")
    .select("id")
    .eq("slug", slug)
    .eq("status", "active")
    .maybeSingle();
  return data?.id ?? null;
}

export const POST = withValidatedBody(EndorseBody, async (request: NextRequest, body) => {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    if (await isRateLimited(`endorse_post:${ip}`, 20, 60)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const url = new URL(request.url);
    const parts = url.pathname.split("/");
    const slugIndex = parts.indexOf("advisors") + 1;
    const slug = parts[slugIndex] ?? "";

    const professionalId = await resolveAdvisorId(supabase, slug);
    if (!professionalId) {
      return NextResponse.json({ error: "Advisor not found" }, { status: 404 });
    }

    const { skill } = body;

    const { data: existing } = await supabase
      .from("advisor_endorsements")
      .select("id")
      .eq("professional_id", professionalId)
      .eq("user_id", user.id)
      .eq("skill", skill)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("advisor_endorsements")
        .delete()
        .eq("id", existing.id);
    } else {
      await supabase
        .from("advisor_endorsements")
        .insert({ professional_id: professionalId, user_id: user.id, skill });
    }

    const { count } = await supabase
      .from("advisor_endorsements")
      .select("*", { count: "exact", head: true })
      .eq("professional_id", professionalId)
      .eq("skill", skill);

    return NextResponse.json({ endorsed: !existing, count: count ?? 0 });
  } catch (err) {
    log.error("endorse POST error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to toggle endorsement" }, { status: 500 });
  }
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    if (await isRateLimited(`endorse_get:${ip}`, 60, 60)) {
      return NextResponse.json({ error: "Too many requests." }, { status: 429 });
    }

    const { slug } = await params;
    const supabase = await createClient();
    const professionalId = await resolveAdvisorId(supabase, slug);
    if (!professionalId) {
      return NextResponse.json({ error: "Advisor not found" }, { status: 404 });
    }

    const { data: { user } } = await supabase.auth.getUser();

    const { data: rows } = await supabase
      .from("advisor_endorsements")
      .select("skill")
      .eq("professional_id", professionalId);

    const counts: Record<string, number> = {};
    for (const row of rows ?? []) {
      counts[row.skill] = (counts[row.skill] ?? 0) + 1;
    }

    let myEndorsements: Set<string> = new Set();
    if (user) {
      const { data: mine } = await supabase
        .from("advisor_endorsements")
        .select("skill")
        .eq("professional_id", professionalId)
        .eq("user_id", user.id);
      myEndorsements = new Set((mine ?? []).map((r) => r.skill));
    }

    const skills = Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([skill, count]) => ({
        skill,
        count,
        endorsedByMe: myEndorsements.has(skill),
      }));

    return NextResponse.json({ skills });
  } catch (err) {
    log.error("endorse GET error", { error: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Failed to fetch endorsements" }, { status: 500 });
  }
}
