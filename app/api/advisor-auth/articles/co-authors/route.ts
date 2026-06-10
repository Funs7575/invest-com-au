import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isRateLimited } from "@/lib/rate-limit";
import { withValidatedBody } from "@/lib/validation/withValidatedBody";
import {
  inviteCoAuthor,
  listInvitesForProfessional,
  respondToInvite,
} from "@/lib/article-co-authors";

function failureStatus(reason: "unavailable" | "not_found" | "forbidden" | "duplicate" | "error"): number {
  switch (reason) {
    case "unavailable":
      return 503;
    case "not_found":
      return 404;
    case "forbidden":
      return 403;
    case "duplicate":
      return 409;
    default:
      return 500;
  }
}

/** Invitations addressed to the calling advisor. */
export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (await isRateLimited(`co_authors_get:${ip}`, 30, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const professionalId = await requireAdvisorSession(request);
  if (!professionalId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const invites = await listInvitesForProfessional(professionalId);
  return NextResponse.json({ invites });
}

const InviteSchema = z.object({
  articleId: z.coerce.number().int().positive(),
  coAuthorEmail: z.string().email().max(200),
});

export const POST = withValidatedBody(InviteSchema, async (request, body) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (await isRateLimited(`co_authors_invite:${ip}`, 10, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const professionalId = await requireAdvisorSession(request);
  if (!professionalId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const result = await inviteCoAuthor({
    articleId: body.articleId,
    invitedByProfessionalId: professionalId,
    coAuthorEmail: body.coAuthorEmail,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: failureStatus(result.reason) });
  }
  return NextResponse.json({ invite: result.invite }, { status: 201 });
});

const RespondSchema = z.object({
  inviteId: z.coerce.number().int().positive(),
  accept: z.boolean(),
});

export const PATCH = withValidatedBody(RespondSchema, async (request, body) => {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
  if (await isRateLimited(`co_authors_respond:${ip}`, 20, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }
  const professionalId = await requireAdvisorSession(request);
  if (!professionalId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const result = await respondToInvite({
    inviteId: body.inviteId,
    professionalId,
    accept: body.accept,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: failureStatus(result.reason) });
  }
  return NextResponse.json({ success: true });
});
