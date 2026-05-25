/**
 * OpenAPI 3.1 specification for the Invest.com.au Financial Data API (v1).
 *
 * This module is the single source of truth for the spec — both the
 * GET /api/v1/openapi.json route and any tooling that generates client SDKs
 * should consume this module rather than maintaining separate copies.
 *
 * Kept in a lib module (not inline in the route) so it can be imported by
 * tests to validate structural correctness without an HTTP round-trip.
 */

export type OpenApiSpec = {
  openapi: string;
  info: Record<string, unknown>;
  servers: { url: string; description: string }[];
  security: Record<string, unknown>[];
  components: Record<string, unknown>;
  paths: Record<string, unknown>;
};

export function buildOpenApiSpec(): OpenApiSpec {
  return {
    openapi: "3.1.0",
    info: {
      title: "Invest.com.au Financial Data API",
      version: "1.0.0",
      description:
        "RESTful JSON API for verified Australian broker, robo-advisor, savings, advisor, and health-score data. Built for financial planners, advisors, and fintech developers. All data is factual and informational — not financial advice.",
      contact: {
        name: "API Support",
        email: "api@invest.com.au",
        url: "https://invest.com.au/api-docs",
      },
      license: {
        name: "Commercial — contact us for licensing terms",
        url: "https://invest.com.au/contact",
      },
    },
    servers: [
      {
        url: "https://invest.com.au/api/v1",
        description: "Production",
      },
    ],
    security: [{ BearerAuth: [] }],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "ica_<hex>",
          description:
            "API key in `ica_<32-hex>` format. Obtain via POST /api/v1/api-keys.",
        },
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          required: ["error"],
          properties: {
            error: { type: "string", example: "Invalid API key" },
          },
        },
        PaginationMeta: {
          type: "object",
          required: ["total", "limit", "offset"],
          properties: {
            total: {
              type: "integer",
              description: "Total number of matching records",
            },
            limit: { type: "integer", example: 20 },
            offset: { type: "integer", example: 0 },
            updated_at: {
              type: "string",
              format: "date-time",
              description: "ISO 8601 timestamp of the most recently updated record",
            },
          },
        },
        Broker: {
          type: "object",
          properties: {
            id: { type: "integer" },
            name: { type: "string", example: "Stake" },
            slug: { type: "string", example: "stake" },
            tagline: { type: "string" },
            asx_fee: { type: "string", example: "$3.00" },
            asx_fee_value: { type: "number", example: 3.0 },
            us_fee: { type: "string", example: "$0" },
            us_fee_value: { type: "number", example: 0 },
            fx_rate: { type: "number", example: 0.6 },
            chess_sponsored: { type: "boolean" },
            smsf_support: { type: "boolean" },
            is_crypto: { type: "boolean" },
            platform_type: {
              type: "string",
              enum: [
                "share_broker",
                "crypto_exchange",
                "cfd_forex",
                "multi_asset",
                "robo_advisor",
                "savings",
              ],
            },
            rating: { type: "number", example: 4.5 },
            inactivity_fee: { type: "string" },
            min_deposit: { type: "string" },
            regulated_by: { type: "string", example: "ASIC" },
            year_founded: { type: "integer", example: 2017 },
            headquarters: { type: "string", example: "Sydney, NSW" },
            fee_verified_date: { type: "string", format: "date" },
            status: { type: "string", enum: ["active", "inactive"] },
            updated_at: { type: "string", format: "date-time" },
          },
        },
        BrokerDetail: {
          allOf: [
            { $ref: "#/components/schemas/Broker" },
            {
              type: "object",
              properties: {
                review_content: { type: "string" },
                fee_source_url: { type: "string", format: "uri" },
                fee_changelog: {
                  type: "array",
                  items: { $ref: "#/components/schemas/FeeChangelogEntry" },
                  description: "Last 10 fee changes",
                },
              },
            },
          ],
        },
        FeeChangelogEntry: {
          type: "object",
          properties: {
            field_name: { type: "string", example: "asx_fee_value" },
            old_value: { type: "string" },
            new_value: { type: "string" },
            change_type: {
              type: "string",
              enum: ["update", "create", "delete"],
            },
            changed_at: { type: "string", format: "date-time" },
            source: { type: "string" },
          },
        },
        SavingsPlatform: {
          type: "object",
          properties: {
            id: { type: "integer" },
            name: { type: "string", example: "ING Savings Maximiser" },
            slug: { type: "string", example: "ing-savings-maximiser" },
            platform_type: {
              type: "string",
              enum: ["savings", "term_deposit"],
            },
            rating: { type: "number" },
            regulated_by: { type: "string", example: "APRA" },
            updated_at: { type: "string", format: "date-time" },
            latest_rates: {
              type: "array",
              items: { $ref: "#/components/schemas/SavingsRate" },
            },
          },
        },
        SavingsRate: {
          type: "object",
          properties: {
            id: { type: "string", format: "uuid" },
            product_kind: {
              type: "string",
              enum: ["savings_account", "term_deposit"],
            },
            rate_bps: {
              type: "integer",
              description: "Interest rate in basis points (525 = 5.25% p.a.)",
              example: 525,
            },
            intro_rate_bps: {
              type: "integer",
              nullable: true,
              description: "Introductory/bonus rate in basis points",
            },
            intro_term_months: {
              type: "integer",
              nullable: true,
              description: "Duration of intro rate in months",
            },
            min_balance_cents: {
              type: "integer",
              description: "Minimum balance for this rate tier (AUD cents)",
            },
            max_balance_cents: {
              type: "integer",
              nullable: true,
              description: "Maximum balance for this rate tier (AUD cents), null if uncapped",
            },
            term_months: {
              type: "integer",
              nullable: true,
              description: "Term length in months (term deposits only)",
            },
            captured_at: { type: "string", format: "date-time" },
            notes: {
              type: "string",
              description: "Rate conditions, bonus eligibility requirements, etc.",
            },
          },
        },
        RoboAdvisor: {
          type: "object",
          properties: {
            id: { type: "integer" },
            name: { type: "string", example: "Stockspot" },
            slug: { type: "string", example: "stockspot" },
            platform_type: { type: "string", enum: ["robo_advisor"] },
            rating: { type: "number" },
            min_deposit: { type: "string" },
            smsf_support: { type: "boolean" },
            regulated_by: { type: "string", example: "ASIC" },
            updated_at: { type: "string", format: "date-time" },
          },
        },
        RoboAdvisorDetail: {
          allOf: [
            { $ref: "#/components/schemas/RoboAdvisor" },
            {
              type: "object",
              properties: {
                review_content: { type: "string" },
                fee_source_url: { type: "string", format: "uri" },
                fee_changelog: {
                  type: "array",
                  items: { $ref: "#/components/schemas/FeeChangelogEntry" },
                  description: "Last 10 fee changes",
                },
              },
            },
          ],
        },
        AdvisorTrustScore: {
          type: "object",
          description:
            "Factual composite score for a single advisor, computed from publicly disclosed credential " +
            "and review signals. NOT a ranking or personal recommendation. " +
            "See methodology_url for full scoring details.",
          required: ["overall", "label", "methodology_url"],
          properties: {
            overall: {
              type: "integer",
              minimum: 0,
              maximum: 100,
              description: "Overall Trust Score, 0–100.",
              example: 74,
            },
            label: {
              type: "string",
              enum: ["Strong", "Good", "Moderate", "Limited"],
              description: "Human-readable band label corresponding to the overall score.",
              example: "Good",
            },
            methodology_url: {
              type: "string",
              format: "uri",
              description: "Link to the published scoring methodology.",
              example: "https://invest.com.au/advisor/trust-score-methodology",
            },
          },
        },
        Advisor: {
          type: "object",
          properties: {
            id: { type: "integer" },
            slug: { type: "string" },
            name: { type: "string" },
            firm_name: { type: "string" },
            type: { type: "string", example: "financial_planner" },
            specialties: { type: "array", items: { type: "string" } },
            location_state: {
              type: "string",
              enum: ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"],
            },
            location_display: { type: "string" },
            afsl_number: { type: "string" },
            rating: { type: "number" },
            review_count: { type: "integer" },
            verified: { type: "boolean" },
            accepts_new_clients: { type: "boolean" },
            hourly_rate_cents: { type: "integer", nullable: true },
            initial_consultation_free: { type: "boolean" },
            updated_at: { type: "string", format: "date-time" },
            trust_score: {
              allOf: [{ $ref: "#/components/schemas/AdvisorTrustScore" }],
              description:
                "Computed Advisor Trust Score for this advisor. " +
                "Factual single-entity score only — not a comparison, ranking, or award. " +
                "See methodology_url for the published scoring algorithm.",
            },
          },
        },
        HealthScore: {
          type: "object",
          properties: {
            broker_slug: { type: "string", example: "stake" },
            afsl_number: { type: "string" },
            afsl_status: {
              type: "string",
              enum: ["active", "suspended", "cancelled", "unknown"],
            },
            overall_score: {
              type: "number",
              minimum: 0,
              maximum: 100,
              description: "Composite health score 0–100",
            },
            regulatory_score: { type: "number", nullable: true },
            regulatory_notes: { type: "string", nullable: true },
            financial_stability_score: { type: "number", nullable: true },
            financial_stability_notes: { type: "string", nullable: true },
            client_money_score: { type: "number", nullable: true },
            client_money_notes: { type: "string", nullable: true },
            insurance_score: { type: "number", nullable: true },
            insurance_notes: { type: "string", nullable: true },
            platform_reliability_score: { type: "number", nullable: true },
            platform_reliability_notes: { type: "string", nullable: true },
            last_reviewed_at: {
              type: "string",
              format: "date-time",
              nullable: true,
            },
            updated_at: { type: "string", format: "date-time" },
          },
        },
        HealthScoreHistoryEntry: {
          type: "object",
          properties: {
            broker_slug: { type: "string" },
            overall_score: { type: "number" },
            regulatory_score: { type: "number", nullable: true },
            client_money_score: { type: "number", nullable: true },
            financial_stability_score: { type: "number", nullable: true },
            platform_reliability_score: { type: "number", nullable: true },
            insurance_score: { type: "number", nullable: true },
            captured_at: { type: "string", format: "date-time" },
          },
        },
        FeeIndexSnapshot: {
          type: "object",
          properties: {
            period: {
              type: "string",
              format: "date",
              description: "UTC calendar day (YYYY-MM-DD)",
            },
            computed_at: { type: "string", format: "date-time" },
            broker_count: { type: "integer" },
            asx_fee_sample: { type: "integer" },
            avg_asx_fee: { type: "number" },
            median_asx_fee: { type: "number" },
            avg_us_fee: { type: "number" },
            median_us_fee: { type: "number" },
            avg_fx_spread: { type: "number" },
            median_fx_spread: { type: "number" },
          },
        },
        FeeIndexTrend: {
          type: "object",
          nullable: true,
          properties: {
            quarter: {
              type: "object",
              nullable: true,
              properties: {
                avgAsxFee: { $ref: "#/components/schemas/TrendDelta" },
                avgUsFee: { $ref: "#/components/schemas/TrendDelta" },
                avgFxSpread: { $ref: "#/components/schemas/TrendDelta" },
              },
            },
            year: {
              type: "object",
              nullable: true,
              properties: {
                avgAsxFee: { $ref: "#/components/schemas/TrendDelta" },
                avgUsFee: { $ref: "#/components/schemas/TrendDelta" },
                avgFxSpread: { $ref: "#/components/schemas/TrendDelta" },
              },
            },
          },
        },
        TrendDelta: {
          type: "object",
          properties: {
            previous: { type: "number" },
            change: { type: "number" },
            changePct: { type: "number" },
          },
        },
      },
    },
    paths: {
      "/brokers": {
        get: {
          operationId: "listBrokers",
          summary: "List active brokers",
          description:
            "Returns all active brokers with public fields. Supports filtering by platform type, CHESS sponsorship, SMSF support. Paginated.",
          tags: ["Brokers"],
          parameters: [
            {
              name: "platform_type",
              in: "query",
              schema: {
                type: "string",
                enum: [
                  "share_broker",
                  "crypto_exchange",
                  "cfd_forex",
                  "multi_asset",
                  "robo_advisor",
                  "savings",
                ],
              },
              description: "Filter by platform category",
            },
            {
              name: "chess_sponsored",
              in: "query",
              schema: { type: "boolean" },
              description: "Filter by CHESS sponsorship",
            },
            {
              name: "smsf_support",
              in: "query",
              schema: { type: "boolean" },
              description: "Filter by SMSF support",
            },
            {
              name: "is_crypto",
              in: "query",
              schema: { type: "boolean" },
              description: "Filter crypto exchanges",
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 20, minimum: 1, maximum: 100 },
              description: "Results per page",
            },
            {
              name: "offset",
              in: "query",
              schema: { type: "integer", default: 0, minimum: 0 },
              description: "Pagination offset",
            },
          ],
          responses: {
            "200": {
              description: "List of brokers",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Broker" },
                      },
                      meta: { $ref: "#/components/schemas/PaginationMeta" },
                    },
                  },
                },
              },
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            "500": {
              description: "Internal server error",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/brokers/{slug}": {
        get: {
          operationId: "getBroker",
          summary: "Get a single broker by slug",
          description:
            "Returns a broker's full public profile. Includes the last 10 fee changes.",
          tags: ["Brokers"],
          parameters: [
            {
              name: "slug",
              in: "path",
              required: true,
              schema: { type: "string", example: "stake" },
              description: "Broker URL slug",
            },
          ],
          responses: {
            "200": {
              description: "Broker detail",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/BrokerDetail" },
                    },
                  },
                },
              },
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            "404": {
              description: "Broker not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/compare": {
        get: {
          operationId: "compareBrokers",
          summary: "Compare up to 5 brokers side-by-side",
          description:
            "Returns broker data for the requested slugs in the same order. Maximum 5 brokers.",
          tags: ["Brokers"],
          parameters: [
            {
              name: "slugs",
              in: "query",
              required: true,
              schema: { type: "string", example: "stake,selfwealth,commsec" },
              description:
                "Comma-separated broker slugs (max 5). Example: stake,selfwealth,commsec",
            },
          ],
          responses: {
            "200": {
              description: "Comparison data",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Broker" },
                      },
                      meta: {
                        type: "object",
                        properties: {
                          requested: {
                            type: "array",
                            items: { type: "string" },
                          },
                          found: { type: "integer" },
                        },
                      },
                    },
                  },
                },
              },
            },
            "400": {
              description: "Bad request",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/savings": {
        get: {
          operationId: "listSavings",
          summary: "List savings accounts and term deposit platforms",
          description:
            "Returns savings account and term deposit platforms with the latest rate snapshots. Rate fields use basis points (bps): 525 bps = 5.25% p.a.",
          tags: ["Savings & Term Deposits"],
          parameters: [
            {
              name: "product_kind",
              in: "query",
              schema: {
                type: "string",
                enum: ["savings_account", "term_deposit"],
              },
              description: "Filter by product kind",
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 20, minimum: 1, maximum: 100 },
              description: "Results per page",
            },
            {
              name: "offset",
              in: "query",
              schema: { type: "integer", default: 0, minimum: 0 },
              description: "Pagination offset",
            },
          ],
          responses: {
            "200": {
              description: "List of savings platforms with rates",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/SavingsPlatform" },
                      },
                      meta: { $ref: "#/components/schemas/PaginationMeta" },
                    },
                  },
                },
              },
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/savings/{slug}": {
        get: {
          operationId: "getSavingsPlatform",
          summary: "Get a single savings platform by slug",
          description:
            "Returns a savings platform's full public profile. Includes all current rate snapshots and rate history (last 30 per product_kind).",
          tags: ["Savings & Term Deposits"],
          parameters: [
            {
              name: "slug",
              in: "path",
              required: true,
              schema: { type: "string", example: "ing-savings-maximiser" },
              description: "Platform URL slug",
            },
          ],
          responses: {
            "200": {
              description: "Savings platform detail",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        allOf: [
                          { $ref: "#/components/schemas/SavingsPlatform" },
                          {
                            type: "object",
                            properties: {
                              rates_by_kind: {
                                type: "object",
                                additionalProperties: {
                                  type: "array",
                                  items: {
                                    $ref: "#/components/schemas/SavingsRate",
                                  },
                                },
                                description:
                                  "Rate history keyed by product_kind",
                              },
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            "404": {
              description: "Platform not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/robo-advisors": {
        get: {
          operationId: "listRoboAdvisors",
          summary: "List robo-advisor platforms",
          description:
            "Returns active robo-advisor platforms (automated investment services). Includes platforms like Stockspot, InvestSMART, Raiz, Spaceship, Six Park.",
          tags: ["Robo-Advisors"],
          parameters: [
            {
              name: "smsf_support",
              in: "query",
              schema: { type: "boolean" },
              description: "Filter by SMSF support",
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 20, minimum: 1, maximum: 100 },
              description: "Results per page",
            },
            {
              name: "offset",
              in: "query",
              schema: { type: "integer", default: 0, minimum: 0 },
              description: "Pagination offset",
            },
          ],
          responses: {
            "200": {
              description: "List of robo-advisor platforms",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/RoboAdvisor" },
                      },
                      meta: { $ref: "#/components/schemas/PaginationMeta" },
                    },
                  },
                },
              },
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/robo-advisors/{slug}": {
        get: {
          operationId: "getRoboAdvisor",
          summary: "Get a single robo-advisor by slug",
          description:
            "Returns a robo-advisor's full public profile. Includes fee changelog (last 10 changes).",
          tags: ["Robo-Advisors"],
          parameters: [
            {
              name: "slug",
              in: "path",
              required: true,
              schema: { type: "string", example: "stockspot" },
              description: "Robo-advisor URL slug",
            },
          ],
          responses: {
            "200": {
              description: "Robo-advisor detail",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/RoboAdvisorDetail" },
                    },
                  },
                },
              },
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            "404": {
              description: "Robo-advisor not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/advisors": {
        get: {
          operationId: "listAdvisors",
          summary: "List active financial advisors and professionals",
          description:
            "Returns active advisors with public profile fields. No PII, no billing data. Supports filtering and pagination.",
          tags: ["Advisors"],
          parameters: [
            {
              name: "type",
              in: "query",
              schema: { type: "string", example: "financial_planner" },
              description:
                "Professional type: financial_planner, smsf_accountant, property_advisor, tax_agent, mortgage_broker, wealth_manager, etc.",
            },
            {
              name: "location_state",
              in: "query",
              schema: {
                type: "string",
                enum: ["NSW", "VIC", "QLD", "WA", "SA", "TAS", "ACT", "NT"],
              },
              description: "Filter by Australian state",
            },
            {
              name: "verified",
              in: "query",
              schema: { type: "boolean" },
              description: "Filter to verified advisors",
            },
            {
              name: "accepts_new_clients",
              in: "query",
              schema: { type: "boolean" },
              description: "Filter by new-client availability",
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 20, minimum: 1, maximum: 100 },
              description: "Results per page",
            },
            {
              name: "offset",
              in: "query",
              schema: { type: "integer", default: 0, minimum: 0 },
              description: "Pagination offset",
            },
          ],
          responses: {
            "200": {
              description: "List of advisors",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/Advisor" },
                      },
                      meta: { $ref: "#/components/schemas/PaginationMeta" },
                    },
                  },
                },
              },
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/advisors/{slug}": {
        get: {
          operationId: "getAdvisor",
          summary: "Get a single advisor by slug",
          description:
            "Returns an advisor's full public profile. Includes qualifications, FAQs, and last 10 approved reviews.",
          tags: ["Advisors"],
          parameters: [
            {
              name: "slug",
              in: "path",
              required: true,
              schema: { type: "string", example: "jane-smith-cfp" },
              description: "Advisor URL slug",
            },
          ],
          responses: {
            "200": {
              description: "Advisor detail",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: { $ref: "#/components/schemas/Advisor" },
                    },
                  },
                },
              },
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            "404": {
              description: "Advisor not found",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/fee-index": {
        get: {
          operationId: "getFeeIndex",
          summary: "AU brokerage fee index",
          description:
            "Market-wide average and median ASX per-trade fee, US share fee, and FX spread across all tracked active brokers. Updated daily. Includes QoQ and YoY trend deltas. Factual aggregate data — not financial advice.",
          tags: ["Market Data"],
          parameters: [
            {
              name: "history",
              in: "query",
              schema: {
                type: "integer",
                default: 90,
                minimum: 0,
                maximum: 400,
              },
              description:
                "Number of prior daily snapshots to include. Pass 0 for latest only.",
            },
          ],
          responses: {
            "200": {
              description: "Fee index snapshot and history",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "object",
                        properties: {
                          latest: {
                            $ref: "#/components/schemas/FeeIndexSnapshot",
                            nullable: true,
                          },
                          trend: {
                            $ref: "#/components/schemas/FeeIndexTrend",
                          },
                          history: {
                            type: "array",
                            items: {
                              $ref: "#/components/schemas/FeeIndexSnapshot",
                            },
                          },
                        },
                      },
                      meta: {
                        type: "object",
                        properties: {
                          updated_at: {
                            type: "string",
                            format: "date-time",
                            nullable: true,
                          },
                          history_days: { type: "integer" },
                        },
                      },
                    },
                  },
                },
              },
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/health-scores": {
        get: {
          operationId: "listHealthScores",
          summary: "List current broker health scores",
          description:
            "Returns current broker health scores across five dimensions: regulatory, financial stability, client money, insurance, and platform reliability. Scores are 0–100. This is informational data — not financial advice.",
          tags: ["Health Scores"],
          parameters: [
            {
              name: "broker_slug",
              in: "query",
              schema: { type: "string" },
              description: "Filter to a specific broker by slug",
            },
            {
              name: "min_score",
              in: "query",
              schema: { type: "number", minimum: 0, maximum: 100 },
              description:
                "Only return brokers with overall_score >= this value",
            },
            {
              name: "limit",
              in: "query",
              schema: { type: "integer", default: 20, minimum: 1, maximum: 100 },
              description: "Results per page",
            },
            {
              name: "offset",
              in: "query",
              schema: { type: "integer", default: 0, minimum: 0 },
              description: "Pagination offset",
            },
          ],
          responses: {
            "200": {
              description: "List of broker health scores",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: { $ref: "#/components/schemas/HealthScore" },
                      },
                      meta: {
                        allOf: [
                          { $ref: "#/components/schemas/PaginationMeta" },
                          {
                            type: "object",
                            properties: {
                              disclaimer: { type: "string" },
                            },
                          },
                        ],
                      },
                    },
                  },
                },
              },
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/health-scores/history": {
        get: {
          operationId: "getHealthScoreHistory",
          summary: "Broker health score time-series history",
          description:
            "Returns the historical time-series of health scores for a specific broker from broker_health_score_history. Populated by the snapshot cron job. broker_slug is required.",
          tags: ["Health Scores"],
          parameters: [
            {
              name: "broker_slug",
              in: "query",
              required: true,
              schema: { type: "string", example: "stake" },
              description: "Broker slug to fetch history for",
            },
            {
              name: "days",
              in: "query",
              schema: {
                type: "integer",
                default: 90,
                minimum: 1,
                maximum: 400,
              },
              description: "Number of days of history to return",
            },
            {
              name: "limit",
              in: "query",
              schema: {
                type: "integer",
                default: 100,
                minimum: 1,
                maximum: 400,
              },
              description: "Max rows per page",
            },
            {
              name: "offset",
              in: "query",
              schema: { type: "integer", default: 0, minimum: 0 },
              description: "Pagination offset",
            },
          ],
          responses: {
            "200": {
              description: "Health score history",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      data: {
                        type: "array",
                        items: {
                          $ref: "#/components/schemas/HealthScoreHistoryEntry",
                        },
                      },
                      meta: {
                        type: "object",
                        properties: {
                          broker_slug: { type: "string" },
                          total: { type: "integer" },
                          limit: { type: "integer" },
                          offset: { type: "integer" },
                          days: { type: "integer" },
                          updated_at: { type: "string", format: "date-time" },
                          disclaimer: { type: "string" },
                        },
                      },
                    },
                  },
                },
              },
            },
            "400": {
              description: "broker_slug required",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            "401": {
              description: "Unauthorized",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/api-keys": {
        post: {
          operationId: "createApiKey",
          summary: "Request a new API key",
          description:
            "Request a new API key. The plain-text key is returned once and cannot be retrieved again. Maximum 3 keys per email.",
          tags: ["Authentication"],
          security: [],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["email", "name"],
                  properties: {
                    email: {
                      type: "string",
                      format: "email",
                      description: "Your email address",
                    },
                    name: {
                      type: "string",
                      description: "A label for this API key",
                    },
                    company_name: {
                      type: "string",
                      description: "Your company or practice name",
                    },
                    use_case: {
                      type: "string",
                      description: "Brief description of intended use",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "201": {
              description: "API key created",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      api_key: {
                        type: "string",
                        description:
                          "Plain-text API key — shown once, save securely",
                      },
                      key_prefix: { type: "string" },
                      tier: {
                        type: "string",
                        enum: ["free", "basic", "pro", "enterprise"],
                      },
                      rate_limits: {
                        type: "object",
                        properties: {
                          per_minute: { type: "integer" },
                          per_day: { type: "integer" },
                        },
                      },
                      message: { type: "string" },
                    },
                  },
                },
              },
            },
            "400": {
              description: "Bad request",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
            "429": {
              description: "Too many API keys for this email",
              content: {
                "application/json": {
                  schema: { $ref: "#/components/schemas/ErrorResponse" },
                },
              },
            },
          },
        },
      },
      "/docs": {
        get: {
          operationId: "getDocs",
          summary: "API documentation (JSON)",
          description:
            "Returns the API's human-readable documentation as a JSON object. No authentication required.",
          tags: ["Meta"],
          security: [],
          responses: {
            "200": {
              description: "API docs",
              content: {
                "application/json": {
                  schema: { type: "object" },
                },
              },
            },
          },
        },
      },
      "/openapi.json": {
        get: {
          operationId: "getOpenApiSpec",
          summary: "OpenAPI 3.1 specification",
          description:
            "Returns the full OpenAPI 3.1 specification for this API. No authentication required.",
          tags: ["Meta"],
          security: [],
          responses: {
            "200": {
              description: "OpenAPI spec",
              content: {
                "application/json": {
                  schema: { type: "object" },
                },
              },
            },
          },
        },
      },
    },
  };
}
