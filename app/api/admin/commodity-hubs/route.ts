import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/require-admin";
import {
  listActiveSectors,
  upsertSector,
  upsertStock,
  upsertEtf,
  type EsgRiskRating,
  type MarketCapBucket,
  type ExposureKind,
} from "@/lib/commodities";

export const runtime = "nodejs";

/**
 * /api/admin/commodity-hubs
 *
 *   GET                 — list every sector
 *   POST (create sector) — body: { slug, display_name, hero_description,
 *                                   hero_stats?, esg_risk_rating?,
 *                                   regulator_notes? }
 *   PUT  (create stock)  — body: { kind: 'stock', ...StockInput }
 *   PUT  (create etf)    — body: { kind: 'etf',   ...EtfInput }
 *
 * Using PUT for the child rows keeps POST scoped to "create a new
 * vertical" which is the higher-intent operation. Editors update
 * existing children via the same PUT (it upserts).
 */
export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;
  const items = await listActiveSectors();
  return NextResponse.json({ items });
}

export async function POST(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => ({}));
  const slug = typeof body.slug === "string" ? body.slug : null;
  const displayName = typeof body.display_name === "string" ? body.display_name : null;
  const heroDescription = typeof body.hero_description === "string" ? body.hero_description : null;

  if (!slug || !displayName || !heroDescription) {
    return NextResponse.json(
      { error: "Missing slug, display_name or hero_description" },
      { status: 400 },
    );
  }

  const result = await upsertSector({
    slug,
    displayName,
    heroDescription,
    heroStats:
      body.hero_stats && typeof body.hero_stats === "object"
        ? (body.hero_stats as Record<string, string>)
        : null,
    esgRiskRating:
      body.esg_risk_rating && ["low", "medium", "high"].includes(body.esg_risk_rating)
        ? (body.esg_risk_rating as EsgRiskRating)
        : "medium",
    regulatorNotes: typeof body.regulator_notes === "string" ? body.regulator_notes : null,
    displayOrder: typeof body.display_order === "number" ? body.display_order : 100,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  return NextResponse.json({ ok: true, id: result.id });
}

export async function PUT(request: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const body = await request.json().catch(() => ({}));
  const kind = body.kind as "stock" | "etf" | undefined;

  if (kind === "stock") {
    const result = await upsertStock({
      sectorSlug: String(body.sector_slug || ""),
      ticker: String(body.ticker || ""),
      companyName: String(body.company_name || ""),
      marketCapBucket: body.market_cap_bucket as MarketCapBucket | null | undefined,
      primaryExposure: body.primary_exposure as ExposureKind | null | undefined,
      includedInIndices: Array.isArray(body.included_in_indices)
        ? (body.included_in_indices as string[])
        : null,
      foreignOwnershipRisk:
        typeof body.foreign_ownership_risk === "string"
          ? body.foreign_ownership_risk
          : null,
      blurb: typeof body.blurb === "string" ? body.blurb : null,
      displayOrder: typeof body.display_order === "number" ? body.display_order : 100,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  if (kind === "etf") {
    const result = await upsertEtf({
      sectorSlug: String(body.sector_slug || ""),
      ticker: String(body.ticker || ""),
      name: String(body.name || ""),
      issuer: typeof body.issuer === "string" ? body.issuer : null,
      merPct: typeof body.mer_pct === "number" ? body.mer_pct : null,
      underlyingExposure:
        typeof body.underlying_exposure === "string"
          ? body.underlying_exposure
          : null,
      domicile: typeof body.domicile === "string" ? body.domicile : null,
      distributionFrequency:
        typeof body.distribution_frequency === "string"
          ? body.distribution_frequency
          : null,
      blurb: typeof body.blurb === "string" ? body.blurb : null,
      displayOrder: typeof body.display_order === "number" ? body.display_order : 100,
    });
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "kind must be 'stock' or 'etf'" }, { status: 400 });
}
