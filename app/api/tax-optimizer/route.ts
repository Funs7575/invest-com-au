import { NextRequest, NextResponse } from "next/server";
import { lookupTicker, isFrankedDividend, estimatedFrankingRate } from "@/lib/ticker-sectors";

export const runtime = "edge";

/** Australian marginal tax rates for 2025-26 */
const TAX_BRACKETS: { label: string; min: number; max: number; rate: number }[] = [
  { label: "0-18.2k", min: 0, max: 18200, rate: 0 },
  { label: "18.2k-45k", min: 18201, max: 45000, rate: 0.19 },
  { label: "45k-120k", min: 45001, max: 120000, rate: 0.325 },
  { label: "120k-180k", min: 120001, max: 180000, rate: 0.37 },
  { label: "180k+", min: 180001, max: Infinity, rate: 0.45 },
];

interface HoldingInput {
  ticker: string;
  name: string;
  buy_date: string;
  buy_price: number;
  current_price: number;
  quantity: number;
}

interface AnalysedHolding extends HoldingInput {
  total_cost: number;
  current_value: number;
  unrealised_gain: number;
  gain_percentage: number;
  days_held: number;
  cgt_discount_eligible: boolean;
  days_until_discount: number | null;
  estimated_cgt: number;
  is_loss: boolean;
  franking_credit_est: number;
  dividend_income_est: number;
}

interface TaxLossCandidate {
  ticker: string;
  name: string;
  loss_amount: number;
  potential_tax_saving: number;
  wash_sale_warning: boolean;
}

interface CGTDiscountAlert {
  ticker: string;
  name: string;
  days_remaining: number;
  potential_discount_saving: number;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { income_bracket, holdings } = body as {
      income_bracket: string;
      holdings: HoldingInput[];
    };

    if (!income_bracket || !holdings || !Array.isArray(holdings) || holdings.length === 0) {
      return NextResponse.json(
        { error: "Income bracket and at least one holding are required" },
        { status: 400 }
      );
    }

    // Resolve tax rate
    const bracket = TAX_BRACKETS.find((b) => b.label === income_bracket);
    const marginalRate = bracket?.rate ?? 0.325; // default to middle bracket

    const now = new Date();

    // ── Analyse each holding ──────────────────────────────────────
    const analysed: AnalysedHolding[] = holdings.map((h) => {
      const total_cost = h.buy_price * h.quantity;
      const current_value = h.current_price * h.quantity;
      const unrealised_gain = current_value - total_cost;
      const gain_percentage = total_cost > 0 ? (unrealised_gain / total_cost) * 100 : 0;

      const buyDate = new Date(h.buy_date);
      const days_held = Math.floor((now.getTime() - buyDate.getTime()) / (1000 * 60 * 60 * 24));
      const cgt_discount_eligible = days_held > 365;

      // Days until CGT discount
      let days_until_discount: number | null = null;
      if (!cgt_discount_eligible && days_held >= 0) {
        days_until_discount = 366 - days_held;
        if (days_until_discount <= 0) days_until_discount = null;
      }

      // Estimated CGT
      let estimated_cgt = 0;
      if (unrealised_gain > 0) {
        const taxableGain = cgt_discount_eligible ? unrealised_gain * 0.5 : unrealised_gain;
        estimated_cgt = taxableGain * marginalRate;
      }

      // Franking credit estimate
      const info = lookupTicker(h.ticker);
      const dividendYield = info?.dividend_yield_est || 0;
      const dividend_income_est = current_value * dividendYield;
      const frankingRate = estimatedFrankingRate(h.ticker);
      const corporateTaxRate = 0.3;
      const franking_credit_est =
        frankingRate > 0 ? (dividend_income_est / (1 - corporateTaxRate)) * corporateTaxRate * frankingRate : 0;

      return {
        ...h,
        total_cost,
        current_value,
        unrealised_gain,
        gain_percentage,
        days_held,
        cgt_discount_eligible,
        days_until_discount,
        estimated_cgt,
        is_loss: unrealised_gain < 0,
        franking_credit_est: Math.round(franking_credit_est * 100) / 100,
        dividend_income_est: Math.round(dividend_income_est * 100) / 100,
      };
    });

    // ── CGT summary ───────────────────────────────────────────────
    const totalGains = analysed.filter((h) => !h.is_loss).reduce((sum, h) => sum + h.unrealised_gain, 0);
    const totalLosses = analysed.filter((h) => h.is_loss).reduce((sum, h) => sum + Math.abs(h.unrealised_gain), 0);
    const netGain = totalGains - totalLosses;
    const totalEstimatedCGT = analysed.reduce((sum, h) => sum + h.estimated_cgt, 0);

    // ── Tax-loss harvesting candidates ────────────────────────────
    const gainHoldings = analysed.filter((h) => !h.is_loss && h.unrealised_gain > 0);
    const totalTaxableGains = gainHoldings.reduce((sum, h) => {
      return sum + (h.cgt_discount_eligible ? h.unrealised_gain * 0.5 : h.unrealised_gain);
    }, 0);

    const taxLossCandidates: TaxLossCandidate[] = analysed
      .filter((h) => h.is_loss)
      .map((h) => {
        const lossAmount = Math.abs(h.unrealised_gain);
        // Loss offsets gains dollar-for-dollar (before discount is applied)
        const offsetAmount = Math.min(lossAmount, totalGains);
        const potentialSaving = offsetAmount * marginalRate;
        return {
          ticker: h.ticker,
          name: h.name,
          loss_amount: Math.round(lossAmount * 100) / 100,
          potential_tax_saving: Math.round(potentialSaving * 100) / 100,
          wash_sale_warning: true, // always warn
        };
      })
      .sort((a, b) => b.potential_tax_saving - a.potential_tax_saving);

    // ── CGT discount alerts (approaching 12-month mark) ───────────
    const cgtDiscountAlerts: CGTDiscountAlert[] = analysed
      .filter(
        (h) =>
          !h.cgt_discount_eligible &&
          h.days_until_discount !== null &&
          h.days_until_discount > 0 &&
          h.days_until_discount <= 90 &&
          h.unrealised_gain > 0
      )
      .map((h) => {
        const discountSaving = h.unrealised_gain * 0.5 * marginalRate;
        return {
          ticker: h.ticker,
          name: h.name,
          days_remaining: h.days_until_discount!,
          potential_discount_saving: Math.round(discountSaving * 100) / 100,
        };
      })
      .sort((a, b) => a.days_remaining - b.days_remaining);

    // ── Franking credit summary ───────────────────────────────────
    const totalFrankingCredits = analysed.reduce((sum, h) => sum + h.franking_credit_est, 0);
    const totalDividendIncome = analysed.reduce((sum, h) => sum + h.dividend_income_est, 0);

    // Tax offset from franking credits
    const frankingTaxOffset = Math.min(totalFrankingCredits, totalDividendIncome * marginalRate);
    // If marginal rate < corporate rate (30%), franking credits can create a refund
    const frankingRefund =
      marginalRate < 0.3
        ? totalFrankingCredits - totalDividendIncome * marginalRate
        : 0;

    // ── Top 3 tax-saving moves ────────────────────────────────────
    const moves: { action: string; saving: number }[] = [];

    if (taxLossCandidates.length > 0) {
      const topLoss = taxLossCandidates[0];
      moves.push({
        action: `Sell ${topLoss.ticker} to harvest $${topLoss.loss_amount.toLocaleString()} loss, offsetting gains and saving ~$${topLoss.potential_tax_saving.toLocaleString()} in tax`,
        saving: topLoss.potential_tax_saving,
      });
    }

    if (cgtDiscountAlerts.length > 0) {
      const topDiscount = cgtDiscountAlerts[0];
      moves.push({
        action: `Hold ${topDiscount.ticker} for ${topDiscount.days_remaining} more days to qualify for 50% CGT discount, saving ~$${topDiscount.potential_discount_saving.toLocaleString()}`,
        saving: topDiscount.potential_discount_saving,
      });
    }

    if (totalFrankingCredits > 100) {
      moves.push({
        action: `Claim $${Math.round(totalFrankingCredits).toLocaleString()} in franking credits to reduce your tax bill${frankingRefund > 0 ? ` (potential $${Math.round(frankingRefund)} refund)` : ""}`,
        saving: totalFrankingCredits,
      });
    }

    moves.sort((a, b) => b.saving - a.saving);

    return NextResponse.json({
      income_bracket,
      marginal_rate: marginalRate,
      holdings: analysed,
      cgt_summary: {
        total_gains: Math.round(totalGains * 100) / 100,
        total_losses: Math.round(totalLosses * 100) / 100,
        net_gain: Math.round(netGain * 100) / 100,
        total_taxable_gains: Math.round(totalTaxableGains * 100) / 100,
        total_estimated_cgt: Math.round(totalEstimatedCGT * 100) / 100,
      },
      tax_loss_candidates: taxLossCandidates,
      cgt_discount_alerts: cgtDiscountAlerts,
      franking_summary: {
        total_dividend_income_est: Math.round(totalDividendIncome * 100) / 100,
        total_franking_credits: Math.round(totalFrankingCredits * 100) / 100,
        franking_tax_offset: Math.round(frankingTaxOffset * 100) / 100,
        franking_refund_potential: Math.round(Math.max(0, frankingRefund) * 100) / 100,
      },
      top_moves: moves.slice(0, 3),
    });
  } catch (err) {
    console.error("Tax optimizer error:", err);
    return NextResponse.json({ error: "Failed to analyse tax position" }, { status: 500 });
  }
}
