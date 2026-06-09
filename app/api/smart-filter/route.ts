import { NextResponse, type NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { isAllowed, ipKey } from "@/lib/rate-limit-db";
import { z } from "zod";

const BodySchema = z.object({
  query: z.string().min(1).max(300),
  surface: z.enum(["advisors", "invest"]),
});

const ADVISOR_PARAMS = new Set([
  "q", "type", "state", "specialty", "language", "sort", "provider_type",
  "fee", "firm", "min_rating", "verified", "international", "accepting",
  "video", "lat", "lng", "locality", "radius", "view", "qual", "min_exp",
  "meeting", "booking", "free_consult", "cluster",
]);

const INVEST_PARAMS = new Set([
  "q", "category", "sub", "kind", "state", "price", "sort", "view",
  "investor", "firb", "siv", "wholesale", "fresh", "featured",
  "min_yield", "max_yield", "esic", "stage", "sector", "mcap",
  "div_yield_min", "lat", "lng", "radius", "irr_min", "irr_max", "commodity",
]);

const ADVISOR_SCHEMA = `{
  "type"?: "comma-separated ProfessionalType values e.g. smsf_specialist,tax_agent",
  "cluster"?: "comma-separated cluster IDs: finance|tax_super|property|mortgage|legal|insurance_debt|international|alternatives|energy_resources|business",
  "state"?: "AU state abbreviation e.g. NSW|VIC|QLD|WA|SA|TAS|ACT|NT",
  "language"?: "language name e.g. Mandarin|Cantonese|Italian",
  "specialty"?: "comma-separated specialty slugs e.g. SMSF,Aged%20Care",
  "fee"?: "fee-for-service|commission|hybrid|aum",
  "min_rating"?: "number 1-5",
  "verified"?: "true",
  "accepting"?: "true",
  "free_consult"?: "true",
  "video"?: "true",
  "booking"?: "true",
  "qual"?: "comma-separated: CFP|CPA|CA|CFA|FPA|AFA",
  "meeting"?: "comma-separated: virtual|in-person|hybrid",
  "min_exp"?: "number of years",
  "locality"?: "suburb name",
  "radius"?: "km as number e.g. 25|50|100"
}`;

const INVEST_SCHEMA = `{
  "category"?: "vertical slug e.g. startup|mining|farmland|commercial_property|fund|energy|franchise|pre_ipo|alternatives|private_credit|infrastructure",
  "sub"?: "sub-category slug e.g. fintech|gold|cropping|solar",
  "kind"?: "comma-separated: for_sale_business|for_sale_asset|equity_raise|project_equity|royalty|fund|physical_asset|listed_security",
  "state"?: "AU state abbreviation e.g. NSW|VIC|QLD|WA|SA|TAS|ACT|NT",
  "price"?: "under-10k|10k-100k|100k-500k|500k-2m|2m-plus",
  "investor"?: "retail|wholesale|smsf|siv|sophisticated|family_office",
  "firb"?: "eligible",
  "esic"?: "true",
  "min_yield"?: "percentage as number e.g. 6",
  "max_yield"?: "percentage as number e.g. 12",
  "stage"?: "comma-separated: pre_seed|seed|series_a|series_b|pre_ipo|growth",
  "sector"?: "GICS sector e.g. Financials|Energy|Materials|Health Care",
  "mcap"?: "nano|micro|small|mid|large",
  "commodity"?: "comma-separated: gold|lithium|copper|iron_ore|rare_earths|uranium|coal",
  "fresh"?: "new_this_week|closing_soon"
}`;

export async function POST(request: NextRequest) {
  if (!(await isAllowed("smart_filter", ipKey(request), { max: 10, refillPerSec: 10 / 60 }))) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429 });
  }

  const body = BodySchema.safeParse(await request.json());
  if (!body.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const { query, surface } = body.data;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "not_configured" }, { status: 503 });
  }

  const schema = surface === "advisors" ? ADVISOR_SCHEMA : INVEST_SCHEMA;
  const systemPrompt = `You are a filter parser for a financial services directory. Your only task is to convert a user's natural language query into URL search params. Return ONLY a JSON object matching the schema. No text outside the JSON. No advice. No recommendations. No commentary. If a field is not implied by the query, omit it entirely.`;

  const userPrompt = `Schema:\n${schema}\n\nQuery: "${query}"\n\nReturn ONLY a JSON object:`;

  const anthropic = new Anthropic({ apiKey });

  try {
    const msg = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 200,
      temperature: 0,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const text = msg.content[0]?.type === "text" ? msg.content[0].text.trim() : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ params: {} });
    }

    const parsed = JSON.parse(jsonMatch[0]) as Record<string, unknown>;
    const allowedKeys = surface === "advisors" ? ADVISOR_PARAMS : INVEST_PARAMS;

    // Whitelist — never pass arbitrary keys to the client
    const params: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (allowedKeys.has(k) && (typeof v === "string" || typeof v === "number")) {
        params[k] = String(v);
      }
    }

    return NextResponse.json({ params });
  } catch {
    return NextResponse.json({ error: "parse_failed" }, { status: 502 });
  }
}
