import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/country-rule-alerts", async () => {
  const actual = await vi.importActual<typeof import("@/lib/country-rule-alerts")>(
    "@/lib/country-rule-alerts",
  );
  return {
    ...actual,
    getActiveAlertsForCountry: vi.fn(),
  };
});

import { GET } from "@/app/api/country-rule-alerts/route";
import { getActiveAlertsForCountry } from "@/lib/country-rule-alerts";

const mockedFetch = vi.mocked(getActiveAlertsForCountry);

beforeEach(() => {
  mockedFetch.mockReset();
});

describe("GET /api/country-rule-alerts", () => {
  it("returns alerts for a known country", async () => {
    mockedFetch.mockResolvedValue([
      {
        alert_key: "uk-x",
        severity: "warning",
        headline: "h",
        body: "b",
        source: "ATO",
        cta_href: null,
        cta_label: null,
      },
    ]);
    const res = await GET(
      new NextRequest("http://localhost/api/country-rule-alerts?country=uk"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.alerts).toHaveLength(1);
    expect(mockedFetch).toHaveBeenCalledWith("uk");
  });

  it("returns empty array when country missing", async () => {
    mockedFetch.mockResolvedValue([]);
    const res = await GET(
      new NextRequest("http://localhost/api/country-rule-alerts"),
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.alerts).toEqual([]);
  });

  it("sets a stale-while-revalidate cache header", async () => {
    mockedFetch.mockResolvedValue([]);
    const res = await GET(
      new NextRequest("http://localhost/api/country-rule-alerts?country=uk"),
    );
    expect(res.headers.get("Cache-Control")).toMatch(/stale-while-revalidate/);
  });
});
