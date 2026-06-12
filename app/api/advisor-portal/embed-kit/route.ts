import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdvisorSession } from "@/lib/require-advisor-session";
import { isRateLimited } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import {
  signAdvisorEmbedToken,
  advisorEmbedSigningAvailable,
} from "@/lib/widget/advisor-embed-token";
import { buildAdvisorEmbedSnippets } from "@/lib/widget/advisor-embed";

const log = logger("advisor-portal:embed-kit");

export const runtime = "nodejs";

/** POST body — both fields optional; tolerant of an empty/missing body. */
const RegenerateBody = z
  .object({
    regenerate: z.boolean().optional(),
    theme: z.string().max(16).optional(),
  })
  .partial()
  .passthrough();

/**
 * Per-Adviser Embed Kit — authed snippet/token mint for the portal panel.
 *
 *   GET  /api/advisor-portal/embed-kit            → current snippets (mints a token)
 *   POST /api/advisor-portal/embed-kit  { regenerate: true } → fresh token (revokes prior)
 *
 * Auth: requireAdvisorSession resolves the logged-in adviser's professional_id
 * (Supabase Auth JWT or legacy advisor_session cookie). The token is then
 * minted for THAT id + the adviser's current slug, so the panel can only ever
 * generate embeds for the adviser who is signed in.
 *
 * Token model (stateless — no new tables, EE-stream constraint): tokens do not
 * expire. "Regenerate" mints a fresh token (new iat); the adviser re-copies the
 * snippet onto their site and the old snippet keeps working until the profile
 * is deactivated or the platform secret is rotated. (A non-expiring token can't
 * be individually revoked without server state; this is the documented,
 * accepted trade-off for paste-once third-party snippets — see
 * lib/widget/advisor-embed-token.ts.)
 */

async function loadAdvisor(professionalId: number) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("professionals")
    .select("id, slug, name, status")
    .eq("id", professionalId)
    .maybeSingle();
  return data as { id: number; slug: string; name: string; status: string | null } | null;
}

function notConfiguredResponse() {
  return NextResponse.json(
    {
      configured: false,
      error:
        "The embed kit is not configured on this environment. Set ADVISOR_EMBED_TOKEN_SECRET (or SUPABASE_SERVICE_ROLE_KEY) to enable it.",
    },
    { status: 503 },
  );
}

export async function GET(request: NextRequest): Promise<Response> {
  const professionalId = await requireAdvisorSession(request);
  if (professionalId === null) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  if (!advisorEmbedSigningAvailable()) return notConfiguredResponse();

  const advisor = await loadAdvisor(professionalId);
  if (!advisor || !advisor.slug) {
    return NextResponse.json({ error: "Advisor profile not found." }, { status: 404 });
  }
  // A pending/inactive adviser can preview but their embeds render nothing until
  // active; surface that so the panel can warn them.
  const active = advisor.status === "active";

  const token = signAdvisorEmbedToken({ professionalId: advisor.id, slug: advisor.slug });
  const snippets = buildAdvisorEmbedSnippets({ slug: advisor.slug, token });

  return NextResponse.json(
    { configured: true, slug: advisor.slug, active, token, snippets },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: NextRequest): Promise<Response> {
  const professionalId = await requireAdvisorSession(request);
  if (professionalId === null) {
    return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  }

  // Regenerating mints a fresh token; rate-limit so the control can't be hammered.
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (await isRateLimited(`embed-kit-regen:${professionalId}:${ip}`, 20, 60)) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429 });
  }

  // Validate the (tiny) body. `theme` is accepted but unused here (the GET
  // re-build threads it); `regenerate` defaults true so the panel button always
  // returns a fresh token. Permissive safeParse — a malformed body is treated
  // as a default regenerate rather than a 400.
  const raw = await request.json().catch(() => ({}));
  const parsed = RegenerateBody.safeParse(raw);
  const regenerate = parsed.success ? parsed.data.regenerate !== false : true;

  if (!advisorEmbedSigningAvailable()) return notConfiguredResponse();

  const advisor = await loadAdvisor(professionalId);
  if (!advisor || !advisor.slug) {
    return NextResponse.json({ error: "Advisor profile not found." }, { status: 404 });
  }

  const token = signAdvisorEmbedToken({ professionalId: advisor.id, slug: advisor.slug });
  const snippets = buildAdvisorEmbedSnippets({ slug: advisor.slug, token });

  log.info("advisor embed token regenerated", {
    professionalId: advisor.id,
    regenerate,
  });

  return NextResponse.json(
    { configured: true, slug: advisor.slug, active: advisor.status === "active", token, snippets },
    { headers: { "Cache-Control": "no-store" } },
  );
}
