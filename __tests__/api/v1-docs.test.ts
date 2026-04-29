import { describe, it, expect } from "vitest";
import { GET, OPTIONS } from "@/app/api/v1/docs/route";

describe("GET /api/v1/docs", () => {
  it("returns 200 with API docs JSON structure", async () => {
    const res = GET();
    expect(res.status).toBe(200);
    const body = await res.json() as { name: string; version: string; endpoints: unknown[] };
    expect(body.name).toBe("Invest.com.au Broker API");
    expect(body.version).toBe("1.0");
    expect(Array.isArray(body.endpoints)).toBe(true);
    expect(body.endpoints.length).toBeGreaterThan(0);
  });

  it("includes long-lived Cache-Control header", () => {
    const res = GET();
    const cc = res.headers.get("Cache-Control");
    expect(cc).toContain("public");
    expect(cc).toContain("max-age=86400");
  });

  it("includes CORS headers for cross-origin access", () => {
    const res = GET();
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("OPTIONS /api/v1/docs", () => {
  it("returns 204 with CORS headers for preflight", () => {
    const res = OPTIONS();
    expect(res.status).toBe(204);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(res.headers.get("Access-Control-Allow-Methods")).toContain("GET");
  });
});
