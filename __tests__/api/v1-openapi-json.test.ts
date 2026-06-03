import { describe, it, expect } from "vitest";
import { vi } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────
// Mirror the api-auth CORS-header mock used by the other v1 route tests so the
// route's header spread is exercised without pulling in the real auth module.

vi.mock("@/lib/api-auth", () => ({
  API_CORS_HEADERS: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "86400",
  },
}));

import { GET, OPTIONS } from "@/app/api/v1/openapi.json/route";

// ─── Tests ───────────────────────────────────────────────────────────────────
// Focused on the HTTP/transport contract of the route handler (headers, caching,
// content negotiation). Deep spec-shape assertions live in v1-openapi.test.ts.

describe("OPTIONS /api/v1/openapi.json", () => {
  it("returns 204 with the public-API CORS headers", () => {
    const res = OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
    expect(res.headers.get("Access-Control-Allow-Headers")).toContain("Authorization");
  });

  it("preflight has no body", async () => {
    const res = OPTIONS();
    const body = await res.text();
    expect(body).toBe("");
  });
});

describe("GET /api/v1/openapi.json — transport contract", () => {
  it("returns 200 with JSON content-type and CORS headers", async () => {
    const res = GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("application/json");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("is publicly cacheable for 24h with stale-while-revalidate", async () => {
    const res = GET();
    const cc = res.headers.get("Cache-Control");
    expect(cc).toContain("public");
    expect(cc).toContain("max-age=86400");
    expect(cc).toContain("stale-while-revalidate=3600");
  });

  it("body parses as JSON and is a valid OpenAPI 3.1 document", async () => {
    const res = GET();
    const spec = await res.json();
    expect(spec.openapi).toBe("3.1.0");
    expect(typeof spec.paths).toBe("object");
    expect(Array.isArray(spec.servers)).toBe(true);
    expect(spec.servers.length).toBeGreaterThan(0);
  });

  it("serves byte-identical bodies across requests (static, no per-request state)", async () => {
    const first = await GET().text();
    const second = await GET().text();
    expect(first).toBe(second);
  });

  it("requires no authentication — succeeds with no Authorization header", async () => {
    // GET takes no request arg; reaching 200 confirms the public-discovery contract.
    const res = GET();
    expect(res.status).toBe(200);
  });
});
