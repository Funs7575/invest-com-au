import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { lookupTicker, TICKER_MAP } from "@/lib/ticker-sectors";

export const runtime = "edge";

interface HoldingInput {
  ticker: string;
  name: string;
  quantity: number;
  price: number;
  value: number;
  sector?: string;
}

interface AnalysedHolding extends HoldingInput {
  resolved_sector: string;
  country: "AU" | "US" | "International";
  weight: number; // % of portfolio
  dividend_yield_est: number;
  annual_dividend_est: number;
}

interface SectorBreakdown {
  sector: string;
  value: number;
  weight: number;
}

interface GeoBreakdown {
  country: string;
  value: number;
  weight: number;
}

interface ConcentrationWarning {
  type: "holding" | "sector";
  label: string;
  weight: number;
  message: string;
}

interface Recommendation {
  type: "diversification" | "fee_saving" | "risk";
  message: string;
  broker_slug?: string;
  broker_name?: string;
  saving_amount?: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { holdings, current_broker_slug } = body as {
      holdings: HoldingInput[];
      current_broker_slug?: string;
    };

    if (!holdings || !Array.isArray(holdings) || holdings.length === 0) {
      return NextResponse.json(
        { error: "At least one holding is required" },
        { status: 400 }
      );
    }

    // Calculate total portfolio value
    const totalValue = holdings.reduce((sum, h) => sum + (h.value || 0), 0);
    if (totalValue <= 0) {
      return NextResponse.json(
        { error: "Portfolio must have a positive total value" },
        { status: 400 }
      );
    }

    // ── Resolve sectors & countries ────────────────────────────────
    const analysed: AnalysedHolding[] = holdings.map((h) => {
      const info = lookupTicker(h.ticker);
      const resolved_sector = h.sector || info?.sector || "Other";
      const country = info?.country || "AU";
      const weight = (h.value / totalValue) * 100;
      const dividend_yield_est = info?.dividend_yield_est || 0;
      const annual_dividend_est = h.value * dividend_yield_est;

      return {
        ...h,
        resolved_sector,
        country,
        weight,
        dividend_yield_est,
        annual_dividend_est,
      };
    });

    // ── Sector breakdown ──────────────────────────────────────────
    const sectorMap = new Map<string, number>();
    for (const h of analysed) {
      sectorMap.set(h.resolved_sector, (sectorMap.get(h.resolved_sector) || 0) + h.value);
    }
    const sectors: SectorBreakdown[] = Array.from(sectorMap.entries())
      .map(([sector, value]) => ({ sector, value, weight: (value / totalValue) * 100 }))
      .sort((a, b) => b.weight - a.weight);

    // ── Geographic breakdown ──────────────────────────────────────
    const geoMap = new Map<string, number>();
    for (const h of analysed) {
      geoMap.set(h.country, (geoMap.get(h.country) || 0) + h.value);
    }
    const geographic: GeoBreakdown[] = Array.from(geoMap.entries())
      .map(([country, value]) => ({ country, value, weight: (value / totalValue) * 100 }))
      .sort((a, b) => b.weight - a.weight);

    // ── Concentration risk ────────────────────────────────────────
    const concentrationWarnings: ConcentrationWarning[] = [];
    for (const h of analysed) {
      if (h.weight > 20) {
        concentrationWarnings.push({
          type: "holding",
          label: h.ticker,
          weight: h.weight,
          message: `${h.ticker} represents ${h.weight.toFixed(1)}% of your portfolio (above 20% threshold)`,
        });
      }
    }
    for (const s of sectors) {
      if (s.weight > 40) {
        concentrationWarnings.push({
          type: "sector",
          label: s.sector,
          weight: s.weight,
          message: `${s.sector} sector represents ${s.weight.toFixed(1)}% of your portfolio (above 40% threshold)`,
        });
      }
    }

    // ── Diversification score (0-100) ─────────────────────────────
    const sectorCount = sectors.length;
    const geoCount = geographic.length;

    // Herfindahl-style concentration for holdings
    const holdingHHI = analysed.reduce((sum, h) => sum + (h.weight / 100) ** 2, 0);
    const sectorHHI = sectors.reduce((sum, s) => sum + (s.weight / 100) ** 2, 0);

    // Score components (0-100 each)
    const holdingSpreadScore = Math.max(0, Math.min(100, (1 - holdingHHI) * 100));
    const sectorSpreadScore = Math.max(0, Math.min(100, (1 - sectorHHI) * 120));
    const geoScore = Math.min(100, geoCount * 30 + (geographic.some((g) => g.country !== "AU") ? 20 : 0));
    const countScore = Math.min(100, sectorCount * 12);

    const diversificationScore = Math.round(
      holdingSpreadScore * 0.35 + sectorSpreadScore * 0.3 + geoScore * 0.2 + countScore * 0.15
    );

    // ── Dividend yield ────────────────────────────────────────────
    const totalDividends = analysed.reduce((sum, h) => sum + h.annual_dividend_est, 0);
    const portfolioDividendYield = totalValue > 0 ? totalDividends / totalValue : 0;

    // ── Fee drag analysis ─────────────────────────────────────────
    let feeDrag = null;
    try {
      const supabase = createAdminClient();

      // Get current broker fees if specified
      let currentBrokerFees = null;
      if (current_broker_slug) {
        const { data: currentBroker } = await supabase
          .from("brokers")
          .select("name, slug, asx_fee_value, us_fee_value, fx_rate, inactivity_fee")
          .eq("slug", current_broker_slug)
          .eq("status", "active")
          .maybeSingle();
        currentBrokerFees = currentBroker;
      }

      // Get cheapest broker for comparison
      const { data: cheapBrokers } = await supabase
        .from("brokers")
        .select("name, slug, asx_fee_value, us_fee_value, fx_rate, affiliate_url")
        .eq("status", "active")
        .eq("platform_type", "share_broker")
        .not("asx_fee_value", "is", null)
        .order("asx_fee_value", { ascending: true })
        .limit(3);

      // Estimate annual trades (assume 2 trades per holding per year)
      const auHoldings = analysed.filter((h) => h.country === "AU").length;
      const usHoldings = analysed.filter((h) => h.country === "US").length;
      const estimatedAuTrades = auHoldings * 2;
      const estimatedUsTrades = usHoldings * 2;

      if (currentBrokerFees) {
        const currentAnnualFees =
          estimatedAuTrades * (currentBrokerFees.asx_fee_value || 0) +
          estimatedUsTrades * (currentBrokerFees.us_fee_value || 0);

        const cheapest = cheapBrokers?.[0];
        const cheapestAnnualFees = cheapest
          ? estimatedAuTrades * (cheapest.asx_fee_value || 0) +
            estimatedUsTrades * (cheapest.us_fee_value || 0)
          : 0;

        feeDrag = {
          current_broker: currentBrokerFees.name,
          current_annual_fees: Math.round(currentAnnualFees * 100) / 100,
          cheapest_broker: cheapest?.name || null,
          cheapest_broker_slug: cheapest?.slug || null,
          cheapest_annual_fees: Math.round(cheapestAnnualFees * 100) / 100,
          potential_saving: Math.round((currentAnnualFees - cheapestAnnualFees) * 100) / 100,
          estimated_au_trades: estimatedAuTrades,
          estimated_us_trades: estimatedUsTrades,
        };
      } else if (cheapBrokers && cheapBrokers.length > 0) {
        const cheapest = cheapBrokers[0];
        const cheapestFees =
          estimatedAuTrades * (cheapest.asx_fee_value || 0) +
          estimatedUsTrades * (cheapest.us_fee_value || 0);
        feeDrag = {
          current_broker: null,
          current_annual_fees: null,
          cheapest_broker: cheapest.name,
          cheapest_broker_slug: cheapest.slug,
          cheapest_annual_fees: Math.round(cheapestFees * 100) / 100,
          potential_saving: null,
          estimated_au_trades: estimatedAuTrades,
          estimated_us_trades: estimatedUsTrades,
        };
      }
    } catch {
      // Fee drag is optional — continue without it
    }

    // ── Recommendations ───────────────────────────────────────────
    const recommendations: Recommendation[] = [];

    // Diversification recommendations
    const allSectors = new Set(Object.values(TICKER_MAP).map((t) => t.sector));
    const presentSectors = new Set(sectors.map((s) => s.sector));
    const missingSectors = Array.from(allSectors).filter(
      (s) => !presentSectors.has(s) && !s.startsWith("ETF")
    );
    if (missingSectors.length > 0 && sectorCount < 5) {
      recommendations.push({
        type: "diversification",
        message: `Consider diversifying into ${missingSectors.slice(0, 2).join(" or ")} for better sector spread.`,
      });
    }

    // Geographic recommendation
    if (!geographic.some((g) => g.country === "International") && !geographic.some((g) => g.country === "US")) {
      recommendations.push({
        type: "diversification",
        message:
          "Your portfolio is 100% Australian. Consider adding international exposure through ETFs like VGS or IVV.",
      });
    }

    // Fee saving recommendation
    if (feeDrag && feeDrag.potential_saving && feeDrag.potential_saving > 50) {
      recommendations.push({
        type: "fee_saving",
        message: `You could save $${feeDrag.potential_saving.toFixed(0)}/year by switching to ${feeDrag.cheapest_broker}.`,
        broker_slug: feeDrag.cheapest_broker_slug || undefined,
        broker_name: feeDrag.cheapest_broker || undefined,
        saving_amount: feeDrag.potential_saving,
      });
    }

    // Concentration risk recommendation
    if (concentrationWarnings.length > 0) {
      const holdingWarnings = concentrationWarnings.filter((w) => w.type === "holding");
      const sectorWarnings = concentrationWarnings.filter((w) => w.type === "sector");
      const riskLevel =
        holdingWarnings.length > 2 || sectorWarnings.length > 1
          ? "high"
          : holdingWarnings.length > 0 || sectorWarnings.length > 0
            ? "moderate"
            : "low";
      recommendations.push({
        type: "risk",
        message: `Your portfolio has ${riskLevel} concentration risk. ${
          riskLevel !== "low"
            ? "Consider spreading your holdings across more stocks or sectors."
            : ""
        }`,
      });
    } else {
      recommendations.push({
        type: "risk",
        message: "Your portfolio has low concentration risk. Good diversification!",
      });
    }

    return NextResponse.json({
      total_value: totalValue,
      holdings: analysed,
      sectors,
      geographic,
      diversification_score: diversificationScore,
      concentration_warnings: concentrationWarnings,
      portfolio_dividend_yield: Math.round(portfolioDividendYield * 10000) / 100,
      total_annual_dividends_est: Math.round(totalDividends * 100) / 100,
      fee_drag: feeDrag,
      recommendations,
    });
  } catch (err) {
    console.error("Portfolio X-Ray error:", err);
    return NextResponse.json({ error: "Failed to analyse portfolio" }, { status: 500 });
  }
}
