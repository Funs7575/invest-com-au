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
    name: "Invest.com.au Broker API",
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
        path: "/api/v1/verify",
        method: "GET",
        auth_required: true,
        description:
          "Verification-as-a-Service. Verify an AFSL and/or ABN against public register data (ASIC public AFS register cache + the official ABR web service). Factual register check only — not financial advice. At least one of afsl/abn is required.",
        parameters: [
          {
            name: "afsl",
            type: "string",
            required: false,
            description:
              "AFSL number to verify (6-7 digits; 'AFSL ' prefix and spaces tolerated).",
          },
          {
            name: "abn",
            type: "string",
            required: false,
            description:
              "ABN to verify (11 digits; spaces/hyphens tolerated). Validated via ATO mod-89 checksum then the ABR.",
          },
        ],
        example_request: "GET /api/v1/verify?afsl=240813",
        example_response: {
          data: {
            verified: true,
            afsl: {
              subject: "afsl",
              verified: true,
              outcome: "verified",
              number: "240813",
              status: "Current",
              licensee_name: "Example Advisers Pty Ltd",
              conditions_summary: "No conditions recorded",
              checked_at: "2026-05-01T00:00:00Z",
              source: "afsl_register:asic_csv",
              source_url:
                "https://connectonline.asic.gov.au/RegistrySearch/faces/landing/ProfessionalRegisters.jspx?searchText=240813",
            },
          },
          meta: {
            checked_at: "2026-05-21T12:00:00Z",
            subjects: ["afsl"],
          },
        },
      },
      {
        path: "/api/v1/verify/badge",
        method: "GET",
        auth_required: false,
        description:
          "Hosted 'Verified by Invest.com.au' trust-mark. Returns an SVG (image/svg+xml) reflecting live public-register status for an AFSL, suitable for hotlinking from a licensee's own site via an <img> tag. No auth (public embed); IP rate-limited.",
        parameters: [
          {
            name: "afsl",
            type: "string",
            required: true,
            description: "AFSL number to render the trust-mark for.",
          },
        ],
        example_request: "GET /api/v1/verify/badge?afsl=240813",
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
