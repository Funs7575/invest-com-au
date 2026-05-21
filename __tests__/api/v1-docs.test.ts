import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/api-auth", () => ({
  API_CORS_HEADERS: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  },
}));

import { GET, OPTIONS } from "@/app/api/v1/docs/route";

describe("/api/v1/docs", () => {
  it("GET returns 200 with docs JSON", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty("name", "Invest.com.au Broker API");
    expect(json).toHaveProperty("version", "1.0");
    expect(json).toHaveProperty("endpoints");
    expect(Array.isArray(json.endpoints)).toBe(true);
  });

  it("OPTIONS returns 204 preflight", async () => {
    const res = OPTIONS();
    expect(res.status).toBe(204);
  });
});
