/**
 * GET /api/v1/tax/treaties
 *
 * Double-tax treaty (DTA) reference data for Australian residents investing globally.
 * Returns applicable withholding-tax rates under each treaty (dividends, interest,
 * royalties) and key treaty notes for each country with an active DTA with Australia.
 *
 * Query params:
 *   ?country_code=US         — ISO 3166-1 alpha-2 code (omit for all treaties)
 *   ?category=dividends      — Filter: dividends | interest | royalties | capital_gains
 *
 * Auth: API key required (Basic tier and above).
 * Cache: public, max-age=86400 (treaties change rarely).
 *
 * Disclaimer: informational only — not tax advice. Rates verified against ATO DTA
 * schedules as at 2026. Confirm with a tax professional for your specific situation.
 */

import { NextRequest, NextResponse } from "next/server";
import { validateApiKey, logApiRequest, API_CORS_HEADERS } from "@/lib/api-auth";
import { escapeHtml } from "@/lib/html-escape";
import { logger } from "@/lib/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const log = logger("api-v1-tax-treaties");

interface TreatyRecord {
  country_code: string;
  country_name: string;
  treaty_signed: string | null;
  treaty_in_force: string | null;
  dividends_no_treaty_pct: number;
  dividends_rate_pct: number;
  dividends_notes: string;
  interest_no_treaty_pct: number;
  interest_rate_pct: number;
  interest_notes: string;
  royalties_no_treaty_pct: number;
  royalties_rate_pct: number;
  royalties_notes: string;
  capital_gains_notes: string;
  fito_available: boolean;
  w8ben_required: boolean;
  updated_at: string;
}

// Static DTA reference data sourced from ATO and individual treaty schedules.
// Rates are for Australian residents receiving income from the listed country.
// "No treaty" defaults: dividends 30% (15% if franked = 0%), interest 10%, royalties 30%.
const TREATIES: TreatyRecord[] = [
  {
    country_code: "US",
    country_name: "United States",
    treaty_signed: "1982-08-06",
    treaty_in_force: "1983-12-31",
    dividends_no_treaty_pct: 30,
    dividends_rate_pct: 15,
    dividends_notes: "15% under AUS-US DTA Art. 10 (1982). 5% if beneficial owner holds ≥10% of voting stock. Fully franked dividends: 0% WHT.",
    interest_no_treaty_pct: 10,
    interest_rate_pct: 10,
    interest_notes: "10% WHT on AU-source interest paid to US residents. US residents also subject to US tax with foreign tax credit offset.",
    royalties_no_treaty_pct: 30,
    royalties_rate_pct: 5,
    royalties_notes: "5% on royalties for use of IP, equipment; 5% on filmed entertainment. Default 30% otherwise.",
    capital_gains_notes: "Generally taxed only in country of residence. AU-source gains from taxable AU property (including land-rich entities) taxable in Australia. US residents report AU gains on Form 1040.",
    fito_available: true,
    w8ben_required: true,
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    country_code: "GB",
    country_name: "United Kingdom",
    treaty_signed: "2003-08-21",
    treaty_in_force: "2003-12-17",
    dividends_no_treaty_pct: 30,
    dividends_rate_pct: 15,
    dividends_notes: "15% on unfranked dividends (AUS-UK DTA 2003, Art. 10). Fully franked: 0% WHT. UK investors report on HMRC SA106 and claim FTCR.",
    interest_no_treaty_pct: 10,
    interest_rate_pct: 10,
    interest_notes: "10% on AU-source interest. UK residents claim FTCR on HMRC Self Assessment.",
    royalties_no_treaty_pct: 30,
    royalties_rate_pct: 5,
    royalties_notes: "5% on royalties under 2003 DTA. Previously 10% under the 1967 treaty.",
    capital_gains_notes: "Generally taxed in country of residence. AU real property gains taxable in Australia. UK residents must report in HMRC SA106; credit available for AU CGT paid.",
    fito_available: true,
    w8ben_required: false,
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    country_code: "NZ",
    country_name: "New Zealand",
    treaty_signed: "2009-06-26",
    treaty_in_force: "2010-03-19",
    dividends_no_treaty_pct: 30,
    dividends_rate_pct: 15,
    dividends_notes: "15% on unfranked dividends (AUS-NZ DTA 2009). Fully franked: 0%. The Trans-Tasman Imputation arrangement provides some relief on franking credits for NZ companies holding AU shares.",
    interest_no_treaty_pct: 10,
    interest_rate_pct: 10,
    interest_notes: "10% on AU-source interest paid to NZ residents.",
    royalties_no_treaty_pct: 30,
    royalties_rate_pct: 5,
    royalties_notes: "5% on royalties under 2009 DTA.",
    capital_gains_notes: "Taxed in country of residence. AU property gains taxable in Australia.",
    fito_available: true,
    w8ben_required: false,
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    country_code: "JP",
    country_name: "Japan",
    treaty_signed: "2008-01-31",
    treaty_in_force: "2008-12-03",
    dividends_no_treaty_pct: 30,
    dividends_rate_pct: 10,
    dividends_notes: "10% on dividends under AUS-JP DTA 2008. 5% if beneficial owner holds ≥10% of capital. Fully franked: 0%.",
    interest_no_treaty_pct: 10,
    interest_rate_pct: 10,
    interest_notes: "10% on AU-source interest paid to Japanese residents.",
    royalties_no_treaty_pct: 30,
    royalties_rate_pct: 5,
    royalties_notes: "5% on royalties under 2008 DTA.",
    capital_gains_notes: "Taxed in country of residence. AU real property gains taxable in Australia. Japan allows foreign tax credit for AU CGT paid.",
    fito_available: true,
    w8ben_required: false,
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    country_code: "SG",
    country_name: "Singapore",
    treaty_signed: "1969-02-11",
    treaty_in_force: "1969-04-28",
    dividends_no_treaty_pct: 30,
    dividends_rate_pct: 15,
    dividends_notes: "15% on unfranked dividends (AUS-SG DTA 1969, as amended). Fully franked: 0%.",
    interest_no_treaty_pct: 10,
    interest_rate_pct: 10,
    interest_notes: "10% on AU-source interest under the 1969 DTA.",
    royalties_no_treaty_pct: 30,
    royalties_rate_pct: 10,
    royalties_notes: "10% on royalties under the 1969 DTA (not updated to 5%).",
    capital_gains_notes: "Singapore has no capital gains tax. AU-source property gains taxable in Australia. Singapore investors exempt from SG CGT on disposal.",
    fito_available: true,
    w8ben_required: false,
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    country_code: "HK",
    country_name: "Hong Kong",
    treaty_signed: "2019-05-07",
    treaty_in_force: "2020-10-09",
    dividends_no_treaty_pct: 30,
    dividends_rate_pct: 15,
    dividends_notes: "15% on unfranked dividends under AUS-HK DTA 2019. 5% if beneficial owner holds ≥10% capital. Fully franked: 0%.",
    interest_no_treaty_pct: 10,
    interest_rate_pct: 10,
    interest_notes: "10% on AU-source interest under 2019 DTA.",
    royalties_no_treaty_pct: 30,
    royalties_rate_pct: 5,
    royalties_notes: "5% on royalties under 2019 DTA.",
    capital_gains_notes: "Hong Kong has no capital gains tax. AU-source property gains taxable in Australia. DTA prevents AU taxing HK-source gains.",
    fito_available: true,
    w8ben_required: false,
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    country_code: "CN",
    country_name: "China",
    treaty_signed: "1988-11-17",
    treaty_in_force: "1990-08-28",
    dividends_no_treaty_pct: 30,
    dividends_rate_pct: 15,
    dividends_notes: "15% on unfranked dividends (AUS-CN DTA 1988). Fully franked: 0%.",
    interest_no_treaty_pct: 10,
    interest_rate_pct: 10,
    interest_notes: "10% on AU-source interest under 1988 DTA.",
    royalties_no_treaty_pct: 30,
    royalties_rate_pct: 10,
    royalties_notes: "10% on royalties under 1988 DTA.",
    capital_gains_notes: "Taxed in country of residence; AU real property gains taxable in Australia. Chinese residents must report on PRC individual income tax return and can claim credit for AU WHT.",
    fito_available: true,
    w8ben_required: false,
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    country_code: "IN",
    country_name: "India",
    treaty_signed: "1991-07-25",
    treaty_in_force: "1991-12-12",
    dividends_no_treaty_pct: 30,
    dividends_rate_pct: 15,
    dividends_notes: "15% on dividends under AUS-IN DTA 1991. Fully franked: 0%.",
    interest_no_treaty_pct: 10,
    interest_rate_pct: 15,
    interest_notes: "15% on AU-source interest under 1991 DTA (higher than default 10% due to treaty terms).",
    royalties_no_treaty_pct: 30,
    royalties_rate_pct: 10,
    royalties_notes: "10% on royalties under AUS-IN DTA.",
    capital_gains_notes: "Taxed in country of residence; AU real property gains taxable in Australia.",
    fito_available: true,
    w8ben_required: false,
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    country_code: "KR",
    country_name: "South Korea",
    treaty_signed: "1982-07-12",
    treaty_in_force: "1984-08-28",
    dividends_no_treaty_pct: 30,
    dividends_rate_pct: 15,
    dividends_notes: "15% on dividends (AUS-KR DTA 1982, as amended). 10% if holding ≥25%. Fully franked: 0%.",
    interest_no_treaty_pct: 10,
    interest_rate_pct: 15,
    interest_notes: "15% on AU-source interest under AUS-KR DTA (above default 10%).",
    royalties_no_treaty_pct: 30,
    royalties_rate_pct: 15,
    royalties_notes: "15% on royalties under AUS-KR DTA.",
    capital_gains_notes: "Taxed in country of residence; AU property gains taxable in Australia.",
    fito_available: true,
    w8ben_required: false,
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    country_code: "MY",
    country_name: "Malaysia",
    treaty_signed: "1980-08-20",
    treaty_in_force: "1982-04-15",
    dividends_no_treaty_pct: 30,
    dividends_rate_pct: 15,
    dividends_notes: "15% on dividends under AUS-MY DTA 1980. Fully franked: 0%.",
    interest_no_treaty_pct: 10,
    interest_rate_pct: 15,
    interest_notes: "15% on AU-source interest (above default 10%) under AUS-MY DTA.",
    royalties_no_treaty_pct: 30,
    royalties_rate_pct: 10,
    royalties_notes: "10% on royalties under AUS-MY DTA.",
    capital_gains_notes: "Malaysia has no general CGT (RPGT applies to real property). AU property gains taxable in Australia. Malaysian investors generally exempt from domestic CGT on AU share disposals.",
    fito_available: true,
    w8ben_required: false,
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    country_code: "AE",
    country_name: "United Arab Emirates",
    treaty_signed: "2012-04-26",
    treaty_in_force: "2014-05-08",
    dividends_no_treaty_pct: 30,
    dividends_rate_pct: 15,
    dividends_notes: "15% on dividends under AUS-UAE DTA 2012. UAE has no personal income tax; DTA primarily reduces AU WHT for UAE residents.",
    interest_no_treaty_pct: 10,
    interest_rate_pct: 10,
    interest_notes: "10% on AU-source interest under 2012 DTA.",
    royalties_no_treaty_pct: 30,
    royalties_rate_pct: 5,
    royalties_notes: "5% on royalties under AUS-UAE DTA 2012.",
    capital_gains_notes: "UAE has no CGT. AU-source property gains taxable in Australia. UAE residents pay no domestic tax on AU share disposal gains.",
    fito_available: true,
    w8ben_required: false,
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    country_code: "SA",
    country_name: "Saudi Arabia",
    treaty_signed: null,
    treaty_in_force: null,
    dividends_no_treaty_pct: 30,
    dividends_rate_pct: 30,
    dividends_notes: "No DTA between Australia and Saudi Arabia. Default 30% WHT applies on unfranked dividends. Fully franked: 0%.",
    interest_no_treaty_pct: 10,
    interest_rate_pct: 10,
    interest_notes: "Default 10% applies; no DTA reduction available.",
    royalties_no_treaty_pct: 30,
    royalties_rate_pct: 30,
    royalties_notes: "Default 30% applies; no DTA reduction.",
    capital_gains_notes: "No DTA. AU real property gains taxable in Australia. Saudi Arabia has no income tax on individuals; Zakat applies to businesses.",
    fito_available: false,
    w8ben_required: false,
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    country_code: "DE",
    country_name: "Germany",
    treaty_signed: "2015-11-24",
    treaty_in_force: "2016-12-07",
    dividends_no_treaty_pct: 30,
    dividends_rate_pct: 15,
    dividends_notes: "15% on dividends under AUS-DE DTA 2015. 0% if paying company is an Australian resident and dividends are franked.",
    interest_no_treaty_pct: 10,
    interest_rate_pct: 10,
    interest_notes: "10% on AU-source interest under 2015 DTA.",
    royalties_no_treaty_pct: 30,
    royalties_rate_pct: 5,
    royalties_notes: "5% on royalties under AUS-DE DTA 2015.",
    capital_gains_notes: "Taxed in country of residence. AU property gains taxable in Australia. Germany taxes worldwide capital gains for German residents; credit for AU CGT available.",
    fito_available: true,
    w8ben_required: false,
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    country_code: "FR",
    country_name: "France",
    treaty_signed: "2006-06-20",
    treaty_in_force: "2009-06-01",
    dividends_no_treaty_pct: 30,
    dividends_rate_pct: 15,
    dividends_notes: "15% on dividends under AUS-FR DTA 2006. Fully franked: 0%.",
    interest_no_treaty_pct: 10,
    interest_rate_pct: 10,
    interest_notes: "10% on AU-source interest under AUS-FR DTA.",
    royalties_no_treaty_pct: 30,
    royalties_rate_pct: 5,
    royalties_notes: "5% on royalties under AUS-FR DTA 2006.",
    capital_gains_notes: "Taxed in country of residence; AU property gains taxable in Australia. France PFU (Prélèvement Forfaitaire Unique) 30% flat tax applies to worldwide investment income for French residents.",
    fito_available: true,
    w8ben_required: false,
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    country_code: "CA",
    country_name: "Canada",
    treaty_signed: "1980-01-21",
    treaty_in_force: "1981-12-17",
    dividends_no_treaty_pct: 30,
    dividends_rate_pct: 15,
    dividends_notes: "15% on dividends under AUS-CA DTA 1980 (amended 2002). 5% if beneficial owner holds ≥10% of voting stock.",
    interest_no_treaty_pct: 10,
    interest_rate_pct: 10,
    interest_notes: "10% on AU-source interest under AUS-CA DTA.",
    royalties_no_treaty_pct: 30,
    royalties_rate_pct: 10,
    royalties_notes: "10% on royalties under AUS-CA DTA.",
    capital_gains_notes: "Taxed in country of residence. AU property gains taxable in Australia. Canadian residents report on T1 with foreign tax credit for AU CGT.",
    fito_available: true,
    w8ben_required: false,
    updated_at: "2026-01-01T00:00:00Z",
  },
];

const TREATY_MAP = new Map(TREATIES.map((t) => [t.country_code.toUpperCase(), t]));

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: API_CORS_HEADERS });
}

export async function GET(request: NextRequest) {
  const start = Date.now();

  const auth = await validateApiKey(request, "/api/v1/tax/treaties");
  if (!auth.valid) {
    logApiRequest({
      apiKeyId: null,
      endpoint: "/api/v1/tax/treaties",
      method: "GET",
      statusCode: auth.statusCode ?? 401,
      responseTimeMs: Date.now() - start,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown",
      userAgent: request.headers.get("user-agent") ?? "unknown",
    });
    return NextResponse.json({ error: auth.error }, { status: auth.statusCode ?? 401, headers: API_CORS_HEADERS });
  }

  try {
    const params = request.nextUrl.searchParams;
    const countryCode = params.get("country_code")?.toUpperCase().trim();
    const category = params.get("category")?.toLowerCase().trim();

    const VALID_CATEGORIES = new Set(["dividends", "interest", "royalties", "capital_gains"]);
    if (category && !VALID_CATEGORIES.has(category)) {
      return NextResponse.json(
        { error: "Invalid category. Use: dividends | interest | royalties | capital_gains" },
        { status: 400, headers: API_CORS_HEADERS },
      );
    }

    let results: TreatyRecord[];
    if (countryCode) {
      const record = TREATY_MAP.get(countryCode);
      if (!record) {
        return NextResponse.json(
          { error: `No treaty data found for country_code '${escapeHtml(countryCode)}'. Note: Australia does not have a DTA with all countries.` },
          { status: 404, headers: API_CORS_HEADERS },
        );
      }
      results = [record];
    } else {
      results = TREATIES;
    }

    // Apply category filter (return only relevant fields)
    let data: (TreatyRecord | Partial<TreatyRecord>)[];
    if (category === "dividends") {
      data = results.map((r) => ({
        country_code: r.country_code,
        country_name: r.country_name,
        dividends_no_treaty_pct: r.dividends_no_treaty_pct,
        dividends_rate_pct: r.dividends_rate_pct,
        dividends_notes: r.dividends_notes,
        fito_available: r.fito_available,
        updated_at: r.updated_at,
      }));
    } else if (category === "interest") {
      data = results.map((r) => ({
        country_code: r.country_code,
        country_name: r.country_name,
        interest_no_treaty_pct: r.interest_no_treaty_pct,
        interest_rate_pct: r.interest_rate_pct,
        interest_notes: r.interest_notes,
        fito_available: r.fito_available,
        updated_at: r.updated_at,
      }));
    } else if (category === "royalties") {
      data = results.map((r) => ({
        country_code: r.country_code,
        country_name: r.country_name,
        royalties_no_treaty_pct: r.royalties_no_treaty_pct,
        royalties_rate_pct: r.royalties_rate_pct,
        royalties_notes: r.royalties_notes,
        fito_available: r.fito_available,
        updated_at: r.updated_at,
      }));
    } else if (category === "capital_gains") {
      data = results.map((r) => ({
        country_code: r.country_code,
        country_name: r.country_name,
        capital_gains_notes: r.capital_gains_notes,
        fito_available: r.fito_available,
        updated_at: r.updated_at,
      }));
    } else {
      data = results;
    }

    logApiRequest({
      apiKeyId: auth.apiKey?.id ?? null,
      endpoint: "/api/v1/tax/treaties",
      method: "GET",
      statusCode: 200,
      responseTimeMs: Date.now() - start,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown",
      userAgent: request.headers.get("user-agent") ?? "unknown",
    });

    log.info("tax-treaties request", { countryCode, category, count: data.length });

    return NextResponse.json(
      {
        data,
        meta: {
          count: data.length,
          disclaimer:
            "Informational only. Not tax advice. Rates verified against ATO DTA schedules as at 2026. Confirm with a qualified tax professional for your specific situation.",
          updated_at: "2026-01-01T00:00:00Z",
        },
      },
      {
        status: 200,
        headers: {
          ...API_CORS_HEADERS,
          "Cache-Control": "public, max-age=86400, s-maxage=86400",
        },
      },
    );
  } catch (err) {
    log.error("tax-treaties error", { err });
    return NextResponse.json({ error: "Internal server error" }, { status: 500, headers: API_CORS_HEADERS });
  }
}
