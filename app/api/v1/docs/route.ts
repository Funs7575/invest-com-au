import { NextResponse } from "next/server";
import { API_CORS_HEADERS } from "@/lib/api-auth";

export const runtime = "nodejs";

/**
 * OPTIONS /api/v1/docs — CORS preflight
 */
export function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: API_CORS_HEADERS,
  });
}

/**
 * GET /api/v1/docs
 *
 * Public API documentation endpoint. No authentication required.
 * Returns a JSON description of all available endpoints.
 */
export function GET() {
  const docs = {
    name: "Invest.com.au Financial Data API",
    version: "1.0",
    base_url: "https://invest.com.au/api/v1",
    authentication: {
      type: "Bearer Token",
      header: "Authorization: Bearer ica_xxxxx",
      description:
        "All endpoints (except /docs) require a valid API key passed as a Bearer token. Request an API key via POST /api/v1/api-keys or contact us at api@invest.com.au.",
    },
    rate_limits: {
      free: { per_minute: 30, per_day: 1000 },
      basic: { per_minute: 60, per_day: 5000 },
      pro: { per_minute: 120, per_day: 25000 },
      enterprise: { per_minute: 300, per_day: 100000 },
    },
    endpoints: [
      {
        path: "/api/v1/brokers",
        method: "GET",
        auth_required: true,
        description:
          "List all active brokers with public data. Supports filtering and pagination.",
        parameters: [
          {
            name: "platform_type",
            type: "string",
            required: false,
            description:
              "Filter by platform type: share_broker, crypto_exchange, cfd_forex, multi_asset, robo_advisor, savings",
          },
          {
            name: "chess_sponsored",
            type: "boolean",
            required: false,
            description: "Filter by CHESS sponsorship (true/false)",
          },
          {
            name: "smsf_support",
            type: "boolean",
            required: false,
            description: "Filter by SMSF support (true/false)",
          },
          {
            name: "is_crypto",
            type: "boolean",
            required: false,
            description: "Filter crypto exchanges (true/false)",
          },
          {
            name: "limit",
            type: "integer",
            required: false,
            description: "Results per page (default: 20, max: 100)",
          },
          {
            name: "offset",
            type: "integer",
            required: false,
            description: "Pagination offset (default: 0)",
          },
        ],
        example_request: "GET /api/v1/brokers?platform_type=share_broker&chess_sponsored=true&limit=10",
        example_response: {
          data: [
            {
              id: 1,
              name: "Example Broker",
              slug: "example-broker",
              asx_fee: "$5.00",
              asx_fee_value: 5.0,
              us_fee: "$0",
              us_fee_value: 0,
              fx_rate: 0.6,
              chess_sponsored: true,
              smsf_support: true,
              is_crypto: false,
              platform_type: "share_broker",
              rating: 4.5,
              regulated_by: "ASIC",
              year_founded: 2015,
            },
          ],
          meta: {
            total: 25,
            limit: 10,
            offset: 0,
            updated_at: "2026-04-10T12:00:00Z",
          },
        },
      },
      {
        path: "/api/v1/brokers/:slug",
        method: "GET",
        auth_required: true,
        description:
          "Get a single broker's full public profile by slug. Includes fee change history (last 10 changes).",
        parameters: [
          {
            name: "slug",
            type: "string",
            required: true,
            in: "path",
            description: "The broker's URL slug (e.g., 'stake', 'commsec')",
          },
        ],
        example_request: "GET /api/v1/brokers/stake",
        example_response: {
          data: {
            id: 1,
            name: "Stake",
            slug: "stake",
            asx_fee: "$3.00",
            asx_fee_value: 3.0,
            chess_sponsored: true,
            rating: 4.7,
            fee_changelog: [
              {
                field_name: "asx_fee_value",
                old_value: "5.00",
                new_value: "3.00",
                change_type: "update",
                changed_at: "2026-03-15T10:30:00Z",
                source: "fee_page_check",
              },
            ],
          },
        },
      },
      {
        path: "/api/v1/compare",
        method: "GET",
        auth_required: true,
        description:
          "Compare up to 5 brokers side-by-side. Returns data in the same order as the requested slugs.",
        parameters: [
          {
            name: "slugs",
            type: "string",
            required: true,
            description:
              "Comma-separated broker slugs (max 5). Example: stake,selfwealth,commsec",
          },
        ],
        example_request: "GET /api/v1/compare?slugs=stake,selfwealth,commsec",
        example_response: {
          data: [
            { name: "Stake", slug: "stake", asx_fee_value: 3.0 },
            { name: "Selfwealth", slug: "selfwealth", asx_fee_value: 9.5 },
            { name: "CommSec", slug: "commsec", asx_fee_value: 10.0 },
          ],
          meta: {
            requested: ["stake", "selfwealth", "commsec"],
            found: 3,
          },
        },
      },
      {
        path: "/api/v1/api-keys",
        method: "POST",
        auth_required: false,
        description:
          "Request a new API key. The plain-text key is returned once and cannot be retrieved again. Max 3 keys per email.",
        body: {
          email: {
            type: "string",
            required: true,
            description: "Your email address",
          },
          name: {
            type: "string",
            required: true,
            description: "A label for this API key",
          },
          company_name: {
            type: "string",
            required: false,
            description: "Your company or practice name",
          },
          use_case: {
            type: "string",
            required: false,
            description: "Brief description of how you plan to use the API",
          },
        },
        example_request: {
          method: "POST",
          url: "/api/v1/api-keys",
          body: {
            email: "planner@example.com",
            name: "Portfolio Comparison Tool",
            company_name: "Example Financial Planning",
            use_case: "Compare broker fees for client recommendations",
          },
        },
        example_response: {
          api_key: "ica_a1b2c3d4e5f6...",
          key_prefix: "ica_a1b2",
          tier: "free",
          rate_limits: { per_minute: 30, per_day: 1000 },
          message:
            "Save this API key securely. It will not be shown again.",
        },
      },
      {
        path: "/api/v1/advisors",
        method: "GET",
        auth_required: true,
        description:
          "List active financial advisors and professionals. Returns public profile fields only — no PII, no billing data. Supports filtering and pagination.",
        parameters: [
          {
            name: "type",
            type: "string",
            required: false,
            description:
              "Filter by professional type: financial_planner, smsf_accountant, property_advisor, tax_agent, mortgage_broker, wealth_manager, etc.",
          },
          {
            name: "location_state",
            type: "string",
            required: false,
            description: "Filter by Australian state code: NSW, VIC, QLD, WA, SA, TAS, ACT, NT",
          },
          {
            name: "verified",
            type: "boolean",
            required: false,
            description: "Filter verified advisors (true/false)",
          },
          {
            name: "accepts_new_clients",
            type: "boolean",
            required: false,
            description: "Filter by new-client availability (true/false)",
          },
          {
            name: "limit",
            type: "integer",
            required: false,
            description: "Results per page (default: 20, max: 100)",
          },
          {
            name: "offset",
            type: "integer",
            required: false,
            description: "Pagination offset (default: 0)",
          },
        ],
        example_request: "GET /api/v1/advisors?type=financial_planner&location_state=NSW&verified=true&limit=10",
        example_response: {
          data: [
            {
              id: 42,
              slug: "jane-smith-cfp",
              name: "Jane Smith",
              firm_name: "Smith Financial",
              type: "financial_planner",
              specialties: ["retirement", "smsf"],
              location_state: "NSW",
              location_display: "Sydney, NSW",
              afsl_number: "123456",
              rating: 4.8,
              review_count: 24,
              verified: true,
              hourly_rate_cents: 35000,
              initial_consultation_free: true,
              accepts_new_clients: true,
            },
          ],
          meta: {
            total: 120,
            limit: 10,
            offset: 0,
            updated_at: "2026-05-01T08:00:00Z",
          },
        },
      },
      {
        path: "/api/v1/advisors/:slug",
        method: "GET",
        auth_required: true,
        description:
          "Get a single advisor's full public profile by slug. Includes approved reviews (last 10), qualifications, education, FAQs, and services metadata.",
        parameters: [
          {
            name: "slug",
            type: "string",
            required: true,
            in: "path",
            description: "The advisor's URL slug (e.g. 'jane-smith-cfp')",
          },
        ],
        example_request: "GET /api/v1/advisors/jane-smith-cfp",
        example_response: {
          data: {
            id: 42,
            slug: "jane-smith-cfp",
            name: "Jane Smith",
            type: "financial_planner",
            rating: 4.8,
            verified: true,
            faqs: [{ q: "Do you offer a free initial meeting?", a: "Yes, 30 minutes at no cost." }],
            reviews: [
              {
                id: 1,
                rating: 5,
                headline: "Excellent advice",
                body: "Jane helped us structure our SMSF effectively.",
                reviewer_name: "Michael T.",
                created_at: "2026-04-10T09:00:00Z",
              },
            ],
          },
        },
      },
      {
        path: "/api/v1/fee-index",
        method: "GET",
        auth_required: true,
        description:
          "AU brokerage fee index: market-wide average and median ASX per-trade fee, US share fee, and FX spread, with QoQ and YoY trend deltas. Updated daily. This is factual aggregate data — not financial advice.",
        parameters: [
          {
            name: "history",
            type: "integer",
            required: false,
            description:
              "Number of prior daily snapshots to include in the history array (default: 90, max: 400). Pass 0 to return the latest snapshot only.",
          },
        ],
        example_request: "GET /api/v1/fee-index?history=30",
        example_response: {
          data: {
            latest: {
              period: "2026-05-24",
              computed_at: "2026-05-24T02:15:00Z",
              broker_count: 22,
              asx_fee_sample: 20,
              avg_asx_fee: 8.50,
              median_asx_fee: 9.50,
              avg_us_fee: 1.20,
              median_us_fee: 0.00,
              avg_fx_spread: 0.55,
              median_fx_spread: 0.60,
            },
            trend: {
              quarter: {
                avgAsxFee: { previous: 9.00, change: -0.50, changePct: -5.56 },
                avgUsFee: { previous: 1.30, change: -0.10, changePct: -7.69 },
                avgFxSpread: { previous: 0.57, change: -0.02, changePct: -3.51 },
              },
              year: null,
            },
            history: [
              { period: "2026-05-23", avg_asx_fee: 8.60, median_asx_fee: 9.50 },
            ],
          },
          meta: {
            updated_at: "2026-05-24T02:15:00Z",
            history_days: 30,
          },
        },
      },
      {
        path: "/api/v1/docs",
        method: "GET",
        auth_required: false,
        description: "This endpoint. Returns API documentation in JSON format.",
      },
    ],
    errors: {
      "401": "Invalid or missing API key",
      "400": "Bad request (invalid parameters)",
      "404": "Resource not found",
      "429": "Rate limit exceeded",
      "500": "Internal server error",
    },
    support: {
      email: "api@invest.com.au",
      documentation: "https://invest.com.au/api-docs",
    },
  };

  return NextResponse.json(docs, {
    status: 200,
    headers: {
      ...API_CORS_HEADERS,
      "Cache-Control": "public, max-age=86400",
    },
  });
}
