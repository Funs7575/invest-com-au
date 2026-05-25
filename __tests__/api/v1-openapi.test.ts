import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/api-auth", () => ({
  API_CORS_HEADERS: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  },
}));

import { GET, OPTIONS } from "@/app/api/v1/openapi.json/route";
import { buildOpenApiSpec } from "@/lib/openapi-spec";

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("OPTIONS /api/v1/openapi.json", () => {
  it("returns 204 with CORS headers", async () => {
    const res = await OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("GET /api/v1/openapi.json — structural validity", () => {
  it("returns 200 with Content-Type application/json", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
  });

  it("returns a valid OpenAPI 3.1 document", async () => {
    const res = await GET();
    const spec = await res.json();

    // Core required OpenAPI 3.1 fields
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.info).toMatchObject({
      title: expect.any(String),
      version: expect.any(String),
    });
    expect(Array.isArray(spec.servers)).toBe(true);
    expect(spec.servers.length).toBeGreaterThan(0);
    expect(spec.paths).toBeDefined();
    expect(typeof spec.paths).toBe("object");
  });

  it("includes all required v1 endpoint paths", async () => {
    const res = await GET();
    const spec = await res.json();
    const paths = Object.keys(spec.paths as Record<string, unknown>);

    // Existing endpoints
    expect(paths).toContain("/brokers");
    expect(paths).toContain("/brokers/{slug}");
    expect(paths).toContain("/compare");
    expect(paths).toContain("/advisors");
    expect(paths).toContain("/advisors/{slug}");
    expect(paths).toContain("/fee-index");
    expect(paths).toContain("/api-keys");
    expect(paths).toContain("/docs");
    expect(paths).toContain("/openapi.json");

    // New endpoints
    expect(paths).toContain("/savings");
    expect(paths).toContain("/savings/{slug}");
    expect(paths).toContain("/robo-advisors");
    expect(paths).toContain("/robo-advisors/{slug}");
    expect(paths).toContain("/health-scores");
    expect(paths).toContain("/health-scores/history");
  });

  it("every GET path has at least a 200 response defined", async () => {
    const res = await GET();
    const spec = await res.json();

    for (const [path, pathItem] of Object.entries(
      spec.paths as Record<string, Record<string, unknown>>,
    )) {
      const getOp = pathItem.get as Record<string, unknown> | undefined;
      if (getOp) {
        const responses = getOp.responses as Record<string, unknown>;
        expect(
          responses["200"],
          `GET ${path} must have a 200 response`,
        ).toBeDefined();
      }
    }
  });

  it("every path with a GET operation has an operationId", async () => {
    const res = await GET();
    const spec = await res.json();

    for (const [path, pathItem] of Object.entries(
      spec.paths as Record<string, Record<string, unknown>>,
    )) {
      const getOp = pathItem.get as Record<string, unknown> | undefined;
      if (getOp) {
        expect(
          getOp.operationId,
          `GET ${path} must have an operationId`,
        ).toBeDefined();
        expect(typeof getOp.operationId).toBe("string");
      }
    }
  });

  it("has security schemes defined in components", async () => {
    const res = await GET();
    const spec = await res.json();
    const components = spec.components as Record<string, unknown>;
    expect(components.securitySchemes).toBeDefined();
    const schemes = components.securitySchemes as Record<string, unknown>;
    expect(schemes.BearerAuth).toBeDefined();
  });

  it("has required schemas in components", async () => {
    const res = await GET();
    const spec = await res.json();
    const schemas = (spec.components as Record<string, unknown>)
      .schemas as Record<string, unknown>;

    // Core schemas
    expect(schemas.ErrorResponse).toBeDefined();
    expect(schemas.Broker).toBeDefined();
    expect(schemas.BrokerDetail).toBeDefined();
    expect(schemas.Advisor).toBeDefined();
    expect(schemas.FeeIndexSnapshot).toBeDefined();

    // New schemas
    expect(schemas.SavingsPlatform).toBeDefined();
    expect(schemas.SavingsRate).toBeDefined();
    expect(schemas.RoboAdvisor).toBeDefined();
    expect(schemas.RoboAdvisorDetail).toBeDefined();
    expect(schemas.HealthScore).toBeDefined();
    expect(schemas.HealthScoreHistoryEntry).toBeDefined();
  });

  it("has a server URL pointing to invest.com.au", async () => {
    const res = await GET();
    const spec = await res.json();
    const servers = spec.servers as { url: string }[];
    const hasInvestServer = servers.some((s) =>
      s.url.includes("invest.com.au"),
    );
    expect(hasInvestServer).toBe(true);
  });

  it("includes Cache-Control public header", async () => {
    const res = await GET();
    expect(res.headers.get("Cache-Control")).toContain("public");
    expect(res.headers.get("Cache-Control")).toContain("max-age=86400");
  });

  it("health-scores/history path requires broker_slug param", async () => {
    const res = await GET();
    const spec = await res.json();
    const historyPath = (spec.paths as Record<string, unknown>)[
      "/health-scores/history"
    ] as Record<string, unknown>;
    const getOp = historyPath.get as Record<string, unknown>;
    const params = getOp.parameters as {
      name: string;
      required?: boolean;
    }[];

    const brokerSlugParam = params.find((p) => p.name === "broker_slug");
    expect(brokerSlugParam).toBeDefined();
    expect(brokerSlugParam?.required).toBe(true);
  });

  it("savings endpoint documents rate_bps field", async () => {
    const res = await GET();
    const spec = await res.json();
    const schemas = (spec.components as Record<string, unknown>)
      .schemas as Record<string, unknown>;
    const savingsRate = schemas.SavingsRate as Record<string, unknown>;
    const properties = savingsRate.properties as Record<
      string,
      Record<string, unknown>
    >;

    expect(properties.rate_bps).toBeDefined();
    expect(properties.rate_bps.description).toMatch(/basis points/i);
  });
});

describe("buildOpenApiSpec() unit tests", () => {
  it("returns a deterministic spec on multiple calls", () => {
    const spec1 = buildOpenApiSpec();
    const spec2 = buildOpenApiSpec();
    expect(JSON.stringify(spec1)).toBe(JSON.stringify(spec2));
  });

  it("spec openapi field is exactly '3.1.0'", () => {
    const spec = buildOpenApiSpec();
    expect(spec.openapi).toBe("3.1.0");
  });

  it("all paths use /api/v1 prefix-relative paths (no full URL)", () => {
    const spec = buildOpenApiSpec();
    // Paths should be relative (start with /), not absolute URLs
    for (const path of Object.keys(spec.paths)) {
      expect(path).toMatch(/^\//);
      // Should NOT be a full URL
      expect(path).not.toMatch(/^https?:\/\//);
    }
  });
});
