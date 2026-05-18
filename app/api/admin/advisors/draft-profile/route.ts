import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requireAdmin } from "@/lib/require-admin";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const maxDuration = 60;

const log = logger("admin:advisors:draft-profile");

// FIN_NOTEBOOK item 19 — AI-drafted advisor profile generator.
//
// Lowers the onboarding friction that's been bottlenecking the advisor
// directory growth: an admin provides the advisor's name + firm +
// LinkedIn URL + a paragraph of background, and Claude drafts a
// reviewable profile (bio + specialty tags + suggested service-lines).
// The admin reviews + edits + writes to `professionals` via the
// existing /admin/advisors UI.
//
// What this DOESN'T do:
//   - Scrape LinkedIn / FOFA register directly (legal-gray; admin
//     pastes the public information manually).
//   - Auto-publish — every draft goes through admin review.

const DraftBody = z.object({
  name: z.string().min(1).max(120),
  firm_name: z.string().max(160).optional(),
  type: z.string().min(1).max(60),
  background: z.string().min(20).max(4000),
  /** Public profile URLs (LinkedIn, firm bio, FOFA register, etc.) the
   *  admin has read manually — pasted in for context only. */
  references: z.array(z.string().url().max(500)).max(5).optional(),
});

interface DraftResult {
  bio: string;
  specialties: string[];
  service_lines: string[];
  /** A short blurb (≤80 chars) for the directory listing. */
  tagline: string;
  /** Caveats the admin should resolve before publishing. */
  flags: string[];
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured" },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = DraftBody.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { name, firm_name, type, background, references } = parsed.data;

  const anthropic = new Anthropic({ apiKey });
  const refLines = references && references.length > 0
    ? `\n\nPublic references the admin has consulted:\n${references.map((r) => `  - ${r}`).join("\n")}`
    : "";

  const prompt = `You are drafting a directory profile for an Australian financial professional. The platform is invest.com.au, a comparison + directory service operating under ASIC's general-information carve-out (s766B(6)/(7)).

Hard rules:
  - Use only the facts the admin has provided. Do NOT invent qualifications, firm history, dollar figures, or testimonials.
  - Bio must be factual, third-person, 80-160 words.
  - "specialties" must be drawn from the canonical list: ["UK Pension Transfer", "FATCA-Aware US Expat Planning", "DASP Processing", "FIRB Property (Non-Resident)", "SMSF Specialist", "Estate Planner", "Mortgage Broker", "Mortgage Broker (Non-Resident)", "Tax Agent", "Tax Agent (SMSF)", "Buyers Agent", "Financial Planner", "Super Specialist", "Property Lawyer"]. Pick only what the admin's input directly supports.
  - "service_lines" must be drawn from the canonical list: ["smsf-setup", "super-consolidation", "tax-structure", "uk-pension-transfer", "us-expat-tax", "non-resident-mortgage", "firb-application", "estate-planning", "buyers-agent-residential", "first-home-buyer-coaching"].
  - Tagline ≤ 80 chars, factual, no superlatives.
  - "flags" lists every claim in your draft that isn't directly backed by the admin's input — the admin will verify or strip them.

Return strict JSON, no commentary, no markdown fences.

Advisor name: ${name}
Firm: ${firm_name ?? "(not provided)"}
Advisor type: ${type}

Admin's background notes:
${background}${refLines}

Reply with exactly this JSON shape:
{
  "bio": "string",
  "specialties": ["string", ...],
  "service_lines": ["string", ...],
  "tagline": "string",
  "flags": ["string", ...]
}`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "AI returned no text content" }, { status: 502 });
    }

    let draft: DraftResult;
    try {
      draft = JSON.parse(textBlock.text);
    } catch {
      log.warn("advisor draft JSON parse failed", { name });
      return NextResponse.json(
        { error: "AI returned non-JSON output", raw: textBlock.text },
        { status: 502 },
      );
    }

    log.info("advisor draft generated", {
      by: guard.email,
      name,
      specialtiesCount: draft.specialties?.length ?? 0,
      flagsCount: draft.flags?.length ?? 0,
    });

    return NextResponse.json({ draft });
  } catch (err) {
    log.error("advisor draft generation failed", {
      err: err instanceof Error ? err.message : String(err),
      name,
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Generation failed" },
      { status: 500 },
    );
  }
}
