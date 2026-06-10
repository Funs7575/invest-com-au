import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isRateLimited } from "@/lib/rate-limit";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import { getCommentsForBrief, addComment } from "@/lib/team-brief-comments";

const UNAVAILABLE_MESSAGE =
  "Squad comments are rolling out and aren't enabled yet — try again soon.";

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (await isRateLimited(`brief_comments_get:${ip}`, 60, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const professionalId = await requireAdvisorSession(request);
  if (!professionalId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const teamId = Number.parseInt(request.nextUrl.searchParams.get("teamId") ?? "", 10);
  const briefId = Number.parseInt(request.nextUrl.searchParams.get("briefId") ?? "", 10);
  if (!Number.isFinite(teamId) || teamId <= 0 || !Number.isFinite(briefId) || briefId <= 0) {
    return NextResponse.json({ error: "Invalid teamId/briefId." }, { status: 400 });
  }

  const result = await getCommentsForBrief(professionalId, teamId, briefId);
  if (!result.ok) {
    if (result.reason === "forbidden") {
      return NextResponse.json({ error: "Not authorised." }, { status: 403 });
    }
    if (result.reason === "unavailable") {
      return NextResponse.json({ error: UNAVAILABLE_MESSAGE }, { status: 503 });
    }
    return NextResponse.json({ error: "Failed to load comments." }, { status: 500 });
  }
  return NextResponse.json({ comments: result.comments });
}

const AddCommentSchema = z.object({
  teamId: z.coerce.number().int().positive(),
  briefId: z.coerce.number().int().positive(),
  body: z.string().min(1).max(2000),
});

export const POST = withValidatedBody(AddCommentSchema, async (request, body) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (await isRateLimited(`brief_comments_post:${ip}`, 20, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  const professionalId = await requireAdvisorSession(request);
  if (!professionalId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const result = await addComment({
    professionalId,
    teamId: body.teamId,
    briefId: body.briefId,
    body: body.body.trim(),
  });
  if (!result.ok) {
    if (result.reason === "forbidden") {
      return NextResponse.json({ error: "Not authorised." }, { status: 403 });
    }
    if (result.reason === "unavailable") {
      return NextResponse.json({ error: UNAVAILABLE_MESSAGE }, { status: 503 });
    }
    return NextResponse.json({ error: "Failed to add comment." }, { status: 500 });
  }
  return NextResponse.json({ comment: result.comment }, { status: 201 });
});
